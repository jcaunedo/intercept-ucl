// Prepends a "use client" directive to the built ESM bundle.
//
// Every UCL component relies on client-only React features (hooks, context,
// Radix primitives), so the whole package is a client module. tsup/esbuild
// strip module-level directives during bundling, so we add it here as a
// deterministic post-build step. This lets consumers import UCL directly from
// a Next.js Server Component without hitting "createContext is not a function".
import { readFileSync, writeFileSync } from "node:fs";

const file = "dist/index.js";
const directive = '"use client";\n';
const source = readFileSync(file, "utf8");

if (!source.startsWith('"use client"') && !source.startsWith("'use client'")) {
  writeFileSync(file, directive + source);
  console.log(`Prepended "use client" to ${file}`);
} else {
  console.log(`"use client" already present in ${file}`);
}
