import { existsSync } from "node:fs";
import { dirname, join, parse, resolve } from "node:path";

export function workspaceRoot(start = process.cwd()): string {
  let current = resolve(start);
  const root = parse(current).root;

  while (true) {
    if (existsSync(join(current, "pnpm-workspace.yaml"))) {
      return current;
    }

    if (current === root) {
      return resolve(start);
    }

    current = dirname(current);
  }
}

