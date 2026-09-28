import type {
  Declaration,
  ExportNamedDeclaration,
  ImportDeclaration,
  ModuleExportName,
  Node,
  Program,
  Statement,
  VariableDeclaration,
  VariableDeclarator,
} from "@oxc-project/types";
import MagicString, { type SourceMap } from "magic-string";
import { parseSync } from "oxc-parser";
import { isReferenceIdentifier, ScopeTracker, walk } from "oxc-walker";

/** The exports that only ever run on the server. */
export const SERVER_EXPORTS = ["loader", "action"];

/**
 * A top-level piece of code that can be removed on its own: one import
 * specifier, one variable declarator, or one function or class declaration.
 */
interface Unit {
  /** Top-level names this unit declares. */
  names: string[];
  /** The node whose range this unit covers, used to attribute references to it. */
  node: Node;
  /** Whether it's exported, which keeps it in the client code. */
  exported: boolean;
  /** Whether it's one of the server exports being stripped. */
  server: boolean;
}

/**
 * Removes `loader` and `action` from a route file for the browser, along
 * with every top-level import and declaration that only they used.
 *
 * This keeps server code (and imports with side effects, like a database
 * client) out of the client bundle. Code that was unused before is left
 * alone, since removing it could change what the file does.
 *
 * Returns `null` when the file has no server exports.
 */
export function stripServerExports(
  code: string,
  filename: string,
): { code: string; map: SourceMap } | null {
  if (!SERVER_EXPORTS.some((name) => code.includes(name))) return null;

  const { program, errors } = parseSync(filename, code);
  // Leave syntax errors for the regular transform to report.
  if (errors.length > 0) return null;

  const units: Unit[] = [];
  /** Statements that always stay, like `export default` and side-effect imports. */
  const roots: Node[] = [];
  /** Local names re-exported as loader/action (`export { getData as loader }`). */
  const serverAliases = new Set<string>();

  for (const statement of program.body) {
    collect(statement, units, roots, serverAliases);
  }

  if (!units.some((unit) => unit.server) && serverAliases.size === 0 && !hasServerReExport(program))
    return null;

  const references = collectReferences(program, units, roots);

  // Names reachable from the server exports: the candidates for removal.
  const candidates = new Set<string>(serverAliases);
  const queue: Node[] = units.filter((unit) => unit.server).map((unit) => unit.node);
  for (const name of serverAliases) queue.push(...declaringNodes(units, name));

  while (queue.length > 0) {
    for (const name of references.get(queue.pop()!) ?? []) {
      if (candidates.has(name)) continue;
      candidates.add(name);
      queue.push(...declaringNodes(units, name));
    }
  }

  // Names still used by code that stays in the browser.
  const live = new Set<string>();
  const liveQueue: Node[] = [
    ...roots,
    ...units.filter((unit) => unit.exported && !unit.server).map((unit) => unit.node),
  ];

  while (liveQueue.length > 0) {
    for (const name of references.get(liveQueue.pop()!) ?? []) {
      if (live.has(name)) continue;
      live.add(name);
      liveQueue.push(...declaringNodes(units, name).filter((node) => !isServerNode(units, node)));
    }
  }

  for (const unit of units) {
    const leaked = unit.server ? unit.names.find((name) => live.has(name)) : undefined;
    if (leaked) {
      throw new Error(
        `${filename}: "${leaked}" is used by code that runs in the browser, but it only exists on the server. ` +
          `Move the shared code into its own function.`,
      );
    }
  }

  const removed = new Set<Unit>(
    units.filter(
      (unit) =>
        unit.server ||
        (unit.names.length > 0 &&
          unit.names.every((name) => candidates.has(name) && !live.has(name))),
    ),
  );

  const output = new MagicString(code);
  for (const statement of program.body) rewrite(statement, code, output, removed, units);

  return {
    code: output.toString(),
    map: output.generateMap({ hires: "boundary", source: filename }),
  };
}

function collect(
  statement: Statement | Declaration,
  units: Unit[],
  roots: Node[],
  serverAliases: Set<string>,
  exported = false,
): void {
  switch (statement.type) {
    case "ImportDeclaration":
      // Type-only imports are erased anyway. Side-effect imports always stay.
      if (statement.importKind === "type") return;
      if (statement.specifiers.length === 0) return void roots.push(statement);

      for (const specifier of statement.specifiers) {
        if (specifier.type === "ImportSpecifier" && specifier.importKind === "type") continue;
        units.push({
          names: [specifier.local.name],
          node: specifier,
          exported: false,
          server: false,
        });
      }

      return;

    case "VariableDeclaration":
      for (const declarator of statement.declarations) {
        const names = bindingNames(declarator.id);
        units.push({
          names,
          node: declarator,
          exported,
          server: exported && names.some((name) => isServerName(name)),
        });
      }

      return;

    case "FunctionDeclaration":
    case "ClassDeclaration":
      if (!statement.id) return void roots.push(statement);

      units.push({
        names: [statement.id.name],
        node: statement,
        exported,
        server: exported && isServerName(statement.id.name),
      });
      return;

    case "ExportNamedDeclaration":
      if (statement.declaration)
        return collect(statement.declaration, units, roots, serverAliases, true);
      if (statement.exportKind === "type") return;

      if (!statement.source) {
        for (const specifier of statement.specifiers) {
          if (isServerName(exportName(specifier.exported)))
            serverAliases.add(exportName(specifier.local));
        }
      }

      return void roots.push(statement);

    default:
      // Expression statements, `export default`, `export *`, TS declarations...
      roots.push(statement);
  }
}

/** Finds the names each unit and root refers to, resolving scopes so shadowed names don't count. */
function collectReferences(program: Program, units: Unit[], roots: Node[]): Map<Node, Set<string>> {
  const owners = [...units.map((unit) => unit.node), ...roots].sort((a, b) => a.start - b.start);
  const ownerAt = (position: number): Node | undefined =>
    owners.find((node) => node.start <= position && position < node.end);
  const topLevel = new Set(units.flatMap((unit) => unit.names));
  const references = new Map<Node, Set<string>>();

  const tracker = new ScopeTracker({ preserveExitedScopes: true });
  walk(program, { scopeTracker: tracker });
  tracker.freeze();

  const add = (name: string, position: number): void => {
    if (!topLevel.has(name)) return;

    const declaration = tracker.getDeclaration(name);
    // Declared in a nested scope: a different variable with the same name.
    if (declaration && declaration.scope !== "") return;

    const owner = ownerAt(position);
    if (!owner) return;

    let names = references.get(owner);
    if (!names) references.set(owner, (names = new Set()));
    names.add(name);
  };

  walk(program, {
    scopeTracker: tracker,
    enter(node, parent) {
      // `export { x } from "./y"` names the other module's export, not a local.
      if (node.type === "ExportNamedDeclaration" && node.source) return this.skip();

      // `export { getData as loader }` is being removed, so it doesn't keep `getData` alive.
      if (node.type === "ExportSpecifier" && isServerName(exportName(node.exported)))
        return this.skip();

      if (node.type === "Identifier" && isReferenceIdentifier(node, parent))
        add(node.name, node.start);

      // <Counter /> and <ui.Button /> refer to variables; <div /> doesn't.
      if (node.type === "JSXIdentifier" && isJsxReference(node, parent)) add(node.name, node.start);
    },
  });

  return references;
}

function isJsxReference(node: Node & { name: string }, parent: Node | null): boolean {
  if (!parent) return false;

  if (parent.type === "JSXOpeningElement" || parent.type === "JSXClosingElement") {
    return parent.name === node && /^[A-Z_$]/.test(node.name);
  }

  return parent.type === "JSXMemberExpression" && parent.object === node;
}

/** Writes each statement back without its removed parts. */
function rewrite(
  statement: Statement,
  code: string,
  output: MagicString,
  removed: Set<Unit>,
  units: Unit[],
): void {
  const unitFor = (node: Node): Unit | undefined => units.find((unit) => unit.node === node);
  const isRemoved = (node: Node): boolean => {
    const unit = unitFor(node);
    return unit !== undefined && removed.has(unit);
  };
  const slice = (node: Node): string => code.slice(node.start, node.end);

  if (statement.type === "ImportDeclaration") {
    const kept = statement.specifiers.filter((specifier) => !isRemoved(specifier));
    if (kept.length === statement.specifiers.length) return;
    if (kept.length === 0) return remove(output, code, statement);

    output.overwrite(statement.start, statement.end, printImport(statement, kept, slice));
    return;
  }

  const declaration =
    statement.type === "ExportNamedDeclaration" ? statement.declaration : statement;
  if (!declaration) {
    if (statement.type === "ExportNamedDeclaration")
      rewriteExportSpecifiers(statement, output, code, slice);
    return;
  }

  if (declaration.type === "VariableDeclaration") {
    const kept = declaration.declarations.filter((declarator) => !isRemoved(declarator));
    if (kept.length === declaration.declarations.length) return;
    if (kept.length === 0) return remove(output, code, statement);

    const prefix = statement.type === "ExportNamedDeclaration" ? "export " : "";
    output.overwrite(
      statement.start,
      statement.end,
      `${prefix}${printVariables(declaration, kept, slice)}`,
    );
    return;
  }

  if (
    (declaration.type === "FunctionDeclaration" || declaration.type === "ClassDeclaration") &&
    isRemoved(declaration)
  ) {
    remove(output, code, statement);
  }
}

function rewriteExportSpecifiers(
  statement: ExportNamedDeclaration,
  output: MagicString,
  code: string,
  slice: (node: Node) => string,
): void {
  const kept = statement.specifiers.filter(
    (specifier) => !isServerName(exportName(specifier.exported)),
  );
  if (kept.length === statement.specifiers.length) return;
  if (kept.length === 0) return remove(output, code, statement);

  const from = statement.source ? ` from ${slice(statement.source)}` : "";
  output.overwrite(
    statement.start,
    statement.end,
    `export { ${kept.map(slice).join(", ")} }${from};`,
  );
}

function printImport(
  statement: ImportDeclaration,
  kept: ImportDeclaration["specifiers"],
  slice: (node: Node) => string,
): string {
  const parts: string[] = [];
  const named: string[] = [];

  for (const specifier of kept) {
    if (specifier.type === "ImportSpecifier") named.push(slice(specifier));
    else parts.push(slice(specifier)); // default or namespace
  }

  if (named.length > 0) parts.push(`{ ${named.join(", ")} }`);

  return `import ${parts.join(", ")} from ${slice(statement.source)};`;
}

function printVariables(
  declaration: VariableDeclaration,
  kept: VariableDeclarator[],
  slice: (node: Node) => string,
): string {
  return `${declaration.kind} ${kept.map(slice).join(", ")};`;
}

/** Removes a statement along with the line break and any blank lines after it. */
function remove(output: MagicString, code: string, node: Node): void {
  const end =
    node.end + (/^[ \t]*\r?\n(?:[ \t]*\r?\n)*/.exec(code.slice(node.end))?.[0].length ?? 0);
  output.remove(node.start, end);
}

function hasServerReExport(program: Program): boolean {
  return program.body.some(
    (statement) =>
      statement.type === "ExportNamedDeclaration" &&
      !statement.declaration &&
      statement.specifiers.some((specifier) => isServerName(exportName(specifier.exported))),
  );
}

function declaringNodes(units: Unit[], name: string): Node[] {
  return units.filter((unit) => unit.names.includes(name)).map((unit) => unit.node);
}

function isServerNode(units: Unit[], node: Node): boolean {
  return units.some((unit) => unit.node === node && unit.server);
}

function isServerName(name: string): boolean {
  return SERVER_EXPORTS.includes(name);
}

function exportName(name: ModuleExportName): string {
  return name.type === "Literal" ? String(name.value) : name.name;
}

/** Names bound by `a`, `{ a, b: [c] }`, `...rest` and so on. */
function bindingNames(pattern: Node): string[] {
  switch (pattern.type) {
    case "Identifier":
      return [pattern.name];
    case "ObjectPattern":
      return pattern.properties.flatMap((property) =>
        property.type === "RestElement"
          ? bindingNames(property.argument)
          : bindingNames(property.value),
      );
    case "ArrayPattern":
      return pattern.elements.flatMap((element) => (element ? bindingNames(element) : []));
    case "RestElement":
      return bindingNames(pattern.argument);
    case "AssignmentPattern":
      return bindingNames(pattern.left);
    default:
      return [];
  }
}
