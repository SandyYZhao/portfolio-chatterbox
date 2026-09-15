import { readFileSync, readdirSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";

export const ROOT = process.cwd();
export const ENTRIES_DIR = path.join(ROOT, "log-entries");
export const INDEX_HTML = path.join(ROOT, "index.html");
export const START_MARKER = "<!-- LOG:START -->";
export const END_MARKER = "<!-- LOG:END -->";
export const ENTRIES_SHOWN = 2;

export function slugify(str) {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function escapeHtml(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Entry files are tiny: a frontmatter block of "key: value" lines between
// two "---" markers, then a body. No YAML library needed for a shape this flat.
export function parseEntryFile(raw) {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) throw new Error("malformed entry: missing --- frontmatter block");
  const [, frontmatter, body] = match;
  const fields = {};
  for (const line of frontmatter.split("\n")) {
    if (!line.trim()) continue;
    const idx = line.indexOf(":");
    fields[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
  }
  fields.text = body.trim();
  return fields;
}

export function loadEntries() {
  if (!existsSync(ENTRIES_DIR)) return [];
  return readdirSync(ENTRIES_DIR)
    .filter((f) => f.endsWith(".md"))
    .map((f) => parseEntryFile(readFileSync(path.join(ENTRIES_DIR, f), "utf8")))
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

export function writeEntryFile(fields, text) {
  if (!existsSync(ENTRIES_DIR)) mkdirSync(ENTRIES_DIR, { recursive: true });

  const slugSource = fields.title || text;
  const slug = slugify(slugSource).split("-").slice(0, 6).join("-") || "entry";
  const filename = `${fields.date}--${slug}.md`;
  const filepath = path.join(ENTRIES_DIR, filename);

  if (existsSync(filepath)) {
    throw new Error(`an entry already exists for today with that title: ${path.relative(ROOT, filepath)}`);
  }

  const lines = Object.entries(fields)
    .filter(([, v]) => v)
    .map(([k, v]) => `${k}: ${v}`);
  writeFileSync(filepath, `---\n${lines.join("\n")}\n---\n${text.trim()}\n`);
  return filepath;
}

function formatDate(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  const opts = { month: "short", day: "numeric", timeZone: "UTC" };
  if (y !== new Date().getUTCFullYear()) opts.year = "numeric";
  return new Intl.DateTimeFormat("en-US", opts).format(date);
}

function truncate(str, max) {
  return str.length > max ? `${str.slice(0, max - 1).trimEnd()}…` : str;
}

export function renderEntriesHtml(entries) {
  const shown = entries.slice(0, ENTRIES_SHOWN);
  if (shown.length === 0) {
    return `          <p class="entrance-empty">Nothing logged yet.</p>`;
  }
  return shown
    .map(
      (e) => `          <div class="entrance-entry" data-kind="${e.kind}">
            <span class="entrance-date">${formatDate(e.date)}</span>
            <p class="entrance-text">${escapeHtml(truncate(e.text, 70))}</p>
          </div>`
    )
    .join("\n");
}

export function renderIntoIndex() {
  if (!existsSync(INDEX_HTML)) throw new Error("index.html not found in the current directory");
  const html = readFileSync(INDEX_HTML, "utf8");
  const startIdx = html.indexOf(START_MARKER);
  const endIdx = html.indexOf(END_MARKER);
  if (startIdx === -1 || endIdx === -1) {
    throw new Error(`couldn't find ${START_MARKER} / ${END_MARKER} in index.html`);
  }
  const entries = loadEntries();
  const before = html.slice(0, startIdx + START_MARKER.length);
  const after = html.slice(endIdx);
  writeFileSync(INDEX_HTML, `${before}\n${renderEntriesHtml(entries)}\n${after}`);
  return entries.length;
}
