#!/usr/bin/env node
// Re-renders index.html from log-entries/ without adding a new entry.
// Use this if you hand-edit or delete a .md file directly.
import { renderIntoIndex } from "./lib.mjs";

try {
  const count = renderIntoIndex();
  console.log(`updated  index.html  (${count} ${count === 1 ? "entry" : "entries"} total)`);
} catch (err) {
  console.error(err.message);
  process.exit(1);
}
