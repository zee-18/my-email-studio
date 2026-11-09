#!/usr/bin/env node
// Headless, read-only review of one campaign folder.
// Usage: node scripts/review.mjs campaigns/<name>
// Exit codes: 0 no high-severity findings, 1 at least one high finding, 2 the review could not run.

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const schemaPath = path.join(root, "review", "findings.schema.json");
const outputPath = path.join(root, "review", "findings.json");

const arg = process.argv[2];
if (!arg) {
  console.error("usage: node scripts/review.mjs <campaign-folder>");
  process.exit(2);
}

const folder = path.resolve(process.cwd(), arg);
if (!existsSync(folder)) {
  console.error(`review: folder not found: ${arg}`);
  process.exit(2);
}

const relative = path.relative(root, folder) || ".";
const schemaText = readFileSync(schemaPath, "utf8");

const prompt = [
  `Review every email in ${relative} against brand/voice.md and .claude/rules/emails.md. Report only real problems.`,
  "Return only a JSON object that conforms to this JSON Schema, with no prose and no code fences:",
  schemaText,
].join("\n\n");

// The installed opencode CLI exposes `--format json` (newline-delimited events)
// rather than `--output-format json --json-schema --allowedTools`, so the schema
// travels in the prompt and the `review` agent enforces a read-only tool set.
const run = spawnSync(
  "opencode",
  ["run", prompt, "--format", "json", "--dir", root, "--agent", "review"],
  {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
    timeout: 15 * 60 * 1000,
    env: { ...process.env, NO_COLOR: "1" },
  },
);

if (run.error) {
  console.error(`review: could not run opencode: ${run.error.message}`);
  process.exit(2);
}

if (run.status !== 0) {
  console.error(`review: opencode exited with status ${run.status}`);
  if (run.stderr.trim()) console.error(run.stderr.trim());
  process.exit(2);
}

const parsed = parseOutput(run.stdout);
if (parsed.error) {
  console.error(`review: ${parsed.error}`);
  if (run.stderr.trim()) console.error(run.stderr.trim());
  process.exit(2);
}

const errors = validate(parsed.result);
if (errors.length > 0) {
  console.error("review: findings do not match review/findings.schema.json");
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(2);
}

const findings = parsed.result.findings;
const count = (level) => findings.filter((finding) => finding.severity === level).length;

mkdirSync(path.dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(parsed.result, null, 2)}\n`);

const highs = count("high");
console.log(
  `review ${relative}: ${findings.length} finding(s), high ${highs}, medium ${count("medium")}, low ${count("low")} -> review/findings.json`,
);

process.exit(highs > 0 ? 1 : 0);

// Accept either a single JSON object, a list whose last item is the result, or
// the CLI's event stream. Unwrap `structured_output` when a wrapper provides it.
function parseOutput(stdout) {
  const trimmed = stdout.trim();
  if (!trimmed) return { error: "opencode produced no output" };

  let events = null;

  try {
    const whole = JSON.parse(trimmed);
    if (Array.isArray(whole)) {
      const last = unwrap(whole.at(-1));
      if (last) return { result: last };
      events = whole;
    } else {
      const result = unwrap(whole);
      if (result) return { result };
      events = [whole];
    }
  } catch {
    // Not a single JSON document; fall through to newline-delimited events.
  }

  if (!events) {
    events = [];
    for (const line of trimmed.split("\n")) {
      if (!line.trim()) continue;
      try {
        events.push(JSON.parse(line));
      } catch {
        // Ignore non-JSON log lines.
      }
    }
  }

  for (let index = events.length - 1; index >= 0; index -= 1) {
    const result = unwrap(events[index]);
    if (result) return { result };
  }

  const text = events
    .filter((event) => event?.type === "text" && typeof event?.part?.text === "string")
    .map((event) => event.part.text)
    .join("");
  const json = extractJsonObject(text);
  if (!json) return { error: "opencode answer did not contain a JSON object" };

  try {
    return { result: JSON.parse(json) };
  } catch (error) {
    return { error: `opencode answer was not valid JSON: ${error.message}` };
  }
}

function unwrap(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return null;
  if (value.structured_output && typeof value.structured_output === "object") {
    return value.structured_output;
  }
  return Array.isArray(value.findings) ? value : null;
}

function extractJsonObject(text) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  return start === -1 || end <= start ? null : text.slice(start, end + 1);
}

function validate(value) {
  const errors = [];
  const severities = ["high", "medium", "low"];
  const keys = ["file", "line", "severity", "problem", "fix"];

  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return ["top level is not an object"];
  }
  for (const key of Object.keys(value)) {
    if (key !== "findings") errors.push(`unexpected top-level key "${key}"`);
  }
  if (!Array.isArray(value.findings)) {
    return [...errors, '"findings" is not an array'];
  }

  value.findings.forEach((finding, index) => {
    const at = `findings[${index}]`;
    if (finding === null || typeof finding !== "object" || Array.isArray(finding)) {
      errors.push(`${at} is not an object`);
      return;
    }
    for (const key of keys) {
      if (!(key in finding)) errors.push(`${at} is missing "${key}"`);
    }
    for (const key of Object.keys(finding)) {
      if (!keys.includes(key)) errors.push(`${at} has unexpected key "${key}"`);
    }
    if ("file" in finding && typeof finding.file !== "string") errors.push(`${at}.file is not a string`);
    if ("line" in finding && typeof finding.line !== "number") errors.push(`${at}.line is not a number`);
    if ("severity" in finding && !severities.includes(finding.severity)) {
      errors.push(`${at}.severity is not one of ${severities.join(", ")}`);
    }
    if ("problem" in finding && typeof finding.problem !== "string") errors.push(`${at}.problem is not a string`);
    if ("fix" in finding && typeof finding.fix !== "string") errors.push(`${at}.fix is not a string`);
  });

  return errors;
}
