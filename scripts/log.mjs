#!/usr/bin/env node
import { writeEntryFile, renderIntoIndex } from "./lib.mjs";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function parseFlags(args) {
  const flags = {};
  const positional = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith("--")) {
      flags[args[i].slice(2)] = args[i + 1];
      i++;
    } else {
      positional.push(args[i]);
    }
  }
  return { flags, positional };
}

function usage() {
  console.error(
    `Usage:\n  log build <title> "<what happened>" [--tag Tag] [--link URL]\n  log note "<what's going on>"\n\nExamples:\n  log build kbd-sounds "Shipped five new switch recordings" --tag Audio\n  log note "Rearranged the desk again"`
  );
  process.exit(1);
}

const [kind, ...rest] = process.argv.slice(2);
if (kind !== "build" && kind !== "note") usage();

const { flags, positional } = parseFlags(rest);
const date = todayISO();
let fields;
let text;

if (kind === "build") {
  const [title, body] = positional;
  if (!title || !body) usage();
  fields = { kind, date, title, tag: flags.tag, link: flags.link };
  text = body;
} else {
  const [body] = positional;
  if (!body) usage();
  fields = { kind, date };
  text = body;
}

try {
  const filepath = writeEntryFile(fields, text);
  const count = renderIntoIndex();
  const label = kind === "build" ? fields.title : text.slice(0, 40);
  console.log(`logged   ${filepath.split("/").slice(-2).join("/")}`);
  console.log(`updated  index.html  (${count} ${count === 1 ? "entry" : "entries"} total)`);
  console.log(`\nreview the diff, then:\n  git add -A && git commit -m "log: ${label}" && git push`);
} catch (err) {
  console.error(err.message);
  process.exit(1);
}
