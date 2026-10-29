import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const compiler = spawn(
  process.execPath,
  [
    fileURLToPath(import.meta.resolve("typescript/lib/tsc.js")),
    "-p",
    "tsconfig.build.json",
    "--watch",
    "--preserveWatchOutput",
  ],
  { stdio: "inherit" },
);
const server = spawn(process.execPath, ["--watch", "dist/main.js"], { stdio: "inherit" });
let stopping = false;
function stop(code) {
  if (stopping) return;
  stopping = true;
  process.exitCode = code;
  compiler.kill("SIGTERM");
  server.kill("SIGTERM");
}
for (const child of [compiler, server]) {
  child.on("error", () => stop(1));
  child.on("exit", (code) => stop(code ?? 0));
}
process.on("SIGINT", () => stop(0));
process.on("SIGTERM", () => stop(0));
