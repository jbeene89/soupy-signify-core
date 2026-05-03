import type { Adapter } from "@soupy-together/shared-types";
import { boltAdapter } from "./bolt.js";
import { claudeCodeAdapter } from "./claude-code.js";
import { cursorAdapter } from "./cursor.js";
import { lovableAdapter } from "./lovable.js";
import { replitAdapter } from "./replit.js";
import { soupyAdapter } from "./soupy.js";
import { v0Adapter } from "./v0.js";

export const adapters: Adapter[] = [
  soupyAdapter,
  lovableAdapter,
  boltAdapter,
  v0Adapter,
  cursorAdapter,
  replitAdapter,
  claudeCodeAdapter
];

