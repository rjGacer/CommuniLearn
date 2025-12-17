#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const root = path.join(__dirname, '..');

function isCodeLike(line) {
  // heuristics: looks like JS code when uncommented
  return /\b(console\.|debugger|const\s+\w+|let\s+\w+|var\s+\w+|function\b|=>|\w+\s*=\s*|return\b|import\b|export\b|if\s*\(|for\s*\(|while\s*\(|switch\b)/.test(line);
}

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  const orig = content;

  // Remove single-line commented-out code or commented console/debugger
  const lines = content.split(/\r?\n/);
  const outLines = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const m = line.match(/^\s*\/\/\s*(.*)$/);
    if (m) {
      const inner = m[1].trim();
      if (isCodeLike(inner)) {
        // drop this line (commented-out code)
        continue;
      }
    }
    outLines.push(line);
  }

  content = outLines.join('\n');

  // Remove block comments that appear to contain only code (conservative)
  content = content.replace(/\/\*[\s\S]*?\*\//g, (match) => {
    const inner = match.slice(2, -2).trim();
    const lines = inner.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
    if (!lines.length) return match; // keep empty block comments
    // if most lines look code-like, remove the block
    const codeLikeCount = lines.filter(l => isCodeLike(l)).length;
    if (codeLikeCount >= Math.ceil(lines.length * 0.6)) return '';
    return match;
  });

  if (content !== orig) {
    fs.writeFileSync(filePath, content, 'utf8');
    return true;
  }
  return false;
}

function walk(dir) {
  const filesChanged = [];
  const items = fs.readdirSync(dir, { withFileTypes: true });
  for (const it of items) {
    const p = path.join(dir, it.name);
    if (it.isDirectory()) {
      if (it.name === 'node_modules' || it.name === '.git') continue;
      filesChanged.push(...walk(p));
    } else if (/\.(js|jsx|ts|tsx)$/.test(it.name)) {
      try {
        const changed = processFile(p);
        if (changed) filesChanged.push(path.relative(root, p));
      } catch (e) {
        console.error('Error processing', p, e.message);
      }
    }
  }
  return filesChanged;
}

const target = path.join(root, 'src');
console.log('Cleaning commented-out code in', target);
const changed = walk(target);
console.log('Files changed:', changed.length);
for (const f of changed) console.log(' -', f);
