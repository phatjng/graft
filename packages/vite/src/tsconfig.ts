export const TYPES_INCLUDE = ".graft/types/**/*.ts";

export type TsconfigUpdate =
  | { status: "unchanged" }
  | { status: "updated"; text: string }
  | { status: "unparseable" };

/**
 * Adds `.graft/types/**\/*.ts` to a tsconfig's `include`. TypeScript skips
 * dot-folders by default, so without this the generated types would never be
 * seen.
 *
 * Only plain JSON is rewritten. A tsconfig with comments is left alone
 * (rewriting it would drop them) and the caller tells the user what to add.
 */
export function addTypesInclude(text: string): TsconfigUpdate {
  let config: { include?: unknown; files?: unknown };
  try {
    config = JSON.parse(text);
  } catch {
    return { status: "unparseable" };
  }

  if (typeof config !== "object" || config === null) return { status: "unparseable" };

  if (config.include === undefined) {
    // No `include` means "every file" (unless `files` is set). Keep that meaning.
    config.include = config.files === undefined ? ["**/*", TYPES_INCLUDE] : [TYPES_INCLUDE];
  } else if (Array.isArray(config.include)) {
    if (config.include.includes(TYPES_INCLUDE)) return { status: "unchanged" };
    config.include = [...config.include, TYPES_INCLUDE];
  } else {
    return { status: "unparseable" };
  }

  return { status: "updated", text: `${JSON.stringify(config, null, 2)}\n` };
}
