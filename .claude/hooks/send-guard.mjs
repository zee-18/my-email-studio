// PreToolUse guard: keeps Resend sends to test addresses and your own inbox.
// Reads the hook payload as JSON on stdin. Exit 0 allows the call, exit 2 blocks it.

const TARGET_KEYS = new Set(["to", "cc", "bcc"]);
const LIST_TOOLS = new Set([
  "send-broadcast",
  "create-automation",
  "send-inbox-draft",
  "send-new-inbox-email",
]);
const ADDRESS_TOOLS = new Set(["send-email", "send-batch-emails"]);

function normalizeOwnEmail(value) {
  return String(value ?? "")
    .trim()
    .replace(/^\[/, "")
    .replace(/\]$/, "")
    .trim()
    .toLowerCase();
}

const ownEmail = normalizeOwnEmail(process.env.MY_EMAIL);

function flattenStrings(value) {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(flattenStrings);
  if (value && typeof value === "object") return Object.values(value).flatMap(flattenStrings);
  return [];
}

function collectAddresses(node, found) {
  if (Array.isArray(node)) {
    for (const item of node) collectAddresses(item, found);
    return;
  }
  if (!node || typeof node !== "object") return;

  for (const [key, value] of Object.entries(node)) {
    if (TARGET_KEYS.has(key.toLowerCase())) found.push(...flattenStrings(value));
    collectAddresses(value, found);
  }
}

function addressOf(raw) {
  const text = String(raw).trim();
  const bracketed = text.match(/<([^>]+)>/);
  const bare = (bracketed ? bracketed[1] : text).replace(/^mailto:/i, "");
  return bare.trim().toLowerCase();
}

function isAllowed(address) {
  if (address.endsWith("@resend.dev")) return true;
  return ownEmail !== "" && address === ownEmail;
}

function block(reason) {
  process.stderr.write(`Blocked by send-guard: ${reason}\n`);
  process.exit(2);
}

let raw = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => {
  raw += chunk;
});
process.stdin.on("end", () => {
  let payload;
  try {
    payload = JSON.parse(raw);
  } catch {
    process.exit(0);
  }

  const toolName = String(payload?.tool_name ?? "");
  const action = toolName.includes("__")
    ? toolName.slice(toolName.lastIndexOf("__") + 2)
    : toolName;

  if (LIST_TOOLS.has(action)) {
    block(`${action} can reach a whole list of people, so it is not allowed.`);
  }

  if (!ADDRESS_TOOLS.has(action)) {
    process.exit(0);
  }

  const found = [];
  collectAddresses(payload?.tool_input, found);

  for (const entry of found) {
    const address = addressOf(entry);
    if (address === "") continue;
    if (!isAllowed(address)) {
      block(
        `"${address}" is not an approved recipient. Only @resend.dev addresses or your own MY_EMAIL address are allowed.`,
      );
    }
  }

  process.exit(0);
});
