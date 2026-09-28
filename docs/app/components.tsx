import { useState, type ReactNode } from "react";
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

  return (
    <figure className="code group relative">
      {file && (
        <figcaption>
          <code>{file}</code>
        </figcaption>
      )}
      <pre>
        <code dangerouslySetInnerHTML={{ __html: html }} />
      </pre>
      <CopyButton text={source} />
    </figure>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function copy(): Promise<void> {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <button type="button" onClick={copy} aria-label="Copy code" className="copy">
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

/** A short aside next to the main text. */
export function Note({ children }: { children: ReactNode }) {
  return (
    <div
      role="note"
      className="my-6 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-[0.9375rem] dark:border-gray-800 dark:bg-gray-900"
    >
      <strong>Good to know:</strong> {children}
    </div>
  );
}
