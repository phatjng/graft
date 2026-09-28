import type { ReactNode } from "react";
import { highlight } from "sugar-high";
import { lang as language } from "sugar-high/lang";

/**
 * A code example. Write the code in a template literal starting on the line
 * after the backtick; the first newline is dropped.
 *
 * The language comes from `lang` (a name like "ts" or "shell"), else from the
 * extension of `file`. Code with neither is shown as plain text.
 */
export function Code({ file, lang, children }: { file?: string; lang?: string; children: string }) {
  const source = children.replace(/^\n/, "").trimEnd();
  const name = lang ?? file?.split(".").pop();
  const html = highlight(source, { lang: (name && language(name)) || "plaintext" });

  const code = (
    <pre>
      <code dangerouslySetInnerHTML={{ __html: html }} />
    </pre>
  );
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
