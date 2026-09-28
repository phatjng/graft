/**
 * Formats a date the same way on the server and in the browser. Without a
 * fixed time zone, each would use its own, and hydration would find
 * different text.
 */
export function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", { dateStyle: "long", timeZone: "UTC" });
}
