import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

export default function setup(): void {
  try {
    execFileSync("pnpm", ["build"], {
      cwd: fileURLToPath(new URL("../..", import.meta.url)),
      stdio: "pipe",
    });
  } catch (error) {
    // Only show the build log when the build fails.
    const { stdout, stderr } = error as { stdout?: Buffer; stderr?: Buffer };
    throw new Error(`pnpm build failed:\n${stdout ?? ""}${stderr ?? ""}`);
  }
}
