// In memory, so it resets when the server restarts. A real app would use a database.

export interface Entry {
  name: string;
  signedAt: Date;
}

let entries: Entry[] = [];

export function listEntries(): Entry[] {
  return entries;
}

export function addEntry(name: string): void {
  entries = [...entries, { name, signedAt: new Date() }];
}

export function clearEntries(): void {
  entries = [];
}
