#!/usr/bin/env node
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { transformSync } from "@babel/core";
import { globSync } from "glob";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function usage() {
  console.log("Usage: node scripts/convert-tsx-to-jsx.js [--delete] [--src=path]");
  process.exit(1);
}

const args = process.argv.slice(2);
const deleteOriginal = args.includes("--delete");
const srcArg = args.find(a => a.startsWith("--src="));
const srcRoot = srcArg ? srcArg.split("=")[1] : path.join(__dirname, "../src");

console.log(`Converting .tsx files under ${srcRoot} -> .jsx (delete originals: ${deleteOriginal})`);

// Use forward slashes for glob on Windows
const normalizedRoot = srcRoot.replace(/\\\\/g, "/");
const pattern = `${normalizedRoot}/**/*.tsx`;
const files = globSync(pattern, { nodir: true });
if (!files.length) {
  console.log("No .tsx files found.");
  process.exit(0);
}

for (const file of files) {
  const code = fs.readFileSync(file, "utf8");

  const result = transformSync(code, {
    filename: file,
    presets: [
      ["@babel/preset-react", { runtime: "automatic" }],
      ["@babel/preset-typescript", { allowNamespaces: true }]
    ],
    plugins: [],
    babelrc: false,
    configFile: false,
    sourceMaps: false
  });

  const out = result ? result.code : code;
  const outPath = file.replace(/\.tsx$/, ".jsx");
  fs.writeFileSync(outPath, out, "utf8");
  console.log(`Wrote ${outPath}`);
  if (deleteOriginal) {
    fs.unlinkSync(file);
    console.log(`Deleted ${file}`);
  }
}

console.log("Conversion complete. Please run your build to catch remaining issues.");
