// The assignment is a side effect, so the bundler can't fold the marker away.
(globalThis as { secret?: string }).secret = "SERVER_SECRET_7f3a";

export function getSecret(): string | undefined {
  return (globalThis as { secret?: string }).secret;
}
