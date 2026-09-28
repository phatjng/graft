import type { ReactNode } from "react";

/**
 * A code example. Write the code in a template literal starting on the line
 * after the backtick; the first newline is dropped.
 */
export function Code({ file, children }: { file?: string; children: string }) {
  const code = <pre>{children.replace(/^\n/, "").trimEnd()}</pre>;
  if (!file) return code;

  return (
    <figure>
      <figcaption>
        <code>{file}</code>
      </figcaption>
      {code}
    </figure>
  );
}

/** A short aside next to the main text. */
export function Note({ children }: { children: ReactNode }) {
  return (
    <blockquote>
      <strong>Good to know:</strong> {children}
    </blockquote>
  );
}
