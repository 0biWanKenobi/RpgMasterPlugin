import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { parseArgs } from "node:util";
import { chromium } from "playwright";

const HELP = `Usage:
  npm run collect:hash -- --mode <label> --output <file> [options]

Required:
  --mode <label>       Exact Test mode option label
  --output <file>      Markdown output path

Options:
  --count <number>     Number of sequential clicks (default: 50)
  --endpoint <url>     Obsidian CDP endpoint (default: http://127.0.0.1:9222)
  --timeout-ms <ms>    Timeout for each click (default: 120000)
  --help               Show this help

Examples:
  npm run collect:hash -- --mode "Obsidian-wholefile" --output wholefile.md
  npm run collect:hash -- --mode "Url and hash" --output mobile.md --endpoint http://127.0.0.1:9223
`;

const { values } = parseArgs({
  options: {
    mode: { type: "string" },
    output: { type: "string" },
    count: { type: "string", default: "50" },
    endpoint: { type: "string", default: "http://127.0.0.1:9222" },
    "timeout-ms": { type: "string", default: "120000" },
    help: { type: "boolean", default: false },
  },
  strict: true,
});

if (values.help) {
  console.log(HELP);
  process.exit(0);
}

if (!values.mode || !values.output) {
  console.error(HELP);
  throw new Error("--mode and --output are required");
}

function parsePositiveInteger(name, value) {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }
  return parsed;
}

const count = parsePositiveInteger("--count", values.count);
const timeoutMs = parsePositiveInteger("--timeout-ms", values["timeout-ms"]);
const outputPath = resolve(values.output);
const browser = await chromium.connectOverCDP(values.endpoint, { noDefaults: true });

try {
  const pages = browser.contexts().flatMap((context) => context.pages());
  let page;
  for (const candidate of pages) {
    if (await candidate.getByRole("button", { name: "Test hashing", exact: true }).count()) {
      page = candidate;
      break;
    }
  }
  if (!page) throw new Error("Db Test page with Test hashing button not found");

  const modeSelect = page.locator("select").filter({
    has: page.locator("option", { hasText: values.mode }),
  });
  if (await modeSelect.count() !== 1) {
    throw new Error(`Test mode option not found or ambiguous: ${values.mode}`);
  }

  await modeSelect.selectOption({ label: values.mode });
  const selectedMode = await modeSelect.locator("option:checked").textContent();
  if (selectedMode !== values.mode) {
    throw new Error(`Expected Test mode ${values.mode}, selected ${selectedMode}`);
  }

  const button = page.getByRole("button", { name: "Test hashing", exact: true });
  await button.waitFor({ state: "visible" });

  let activeRun;

  async function normalize(message) {
    const args = message.args();
    if (args.length === 0) return message.text();

    const normalized = [];
    for (const argument of args) {
      try {
        normalized.push(await argument.jsonValue());
      } catch {
        normalized.push(argument.toString());
      }
    }
    return normalized.length === 1 ? normalized[0] : normalized;
  }

  const handleConsole = (message) => {
    const run = activeRun;
    if (!run) return;

    run.queue = run.queue.then(async () => {
      const value = await normalize(message);
      const isHash = (Array.isArray(value) && value[0] === "computed hash is")
        || message.text().startsWith("computed hash is");
      if (isHash) return;

      run.logs.push(value);
      const isObject = value && !Array.isArray(value) && typeof value === "object";
      const isFrameStats = isObject
        && "elapsedMs" in value
        && "frameCount" in value
        && "maxFrameGapMs" in value;
      if (isFrameStats) run.resolve();
    }).catch(run.reject);
  };

  for (const consolePage of pages) {
    consolePage.on("console", handleConsole);
  }

  const results = [];
  for (let index = 1; index <= count; index++) {
    const logs = [];
    const done = new Promise((resolveRun, rejectRun) => {
      const timeout = setTimeout(
        () => rejectRun(new Error(`Run ${index} timed out after ${timeoutMs} ms`)),
        timeoutMs,
      );
      activeRun = {
        logs,
        queue: Promise.resolve(),
        resolve: () => {
          clearTimeout(timeout);
          resolveRun();
        },
        reject: (error) => {
          clearTimeout(timeout);
          rejectRun(error);
        },
      };
    });

    await button.click();
    await done;
    await activeRun.queue;
    activeRun = undefined;
    results.push(logs);
    console.log(`Collected ${index}/${count} (${logs.length} log entries)`);
  }

  const lines = [
    `# ${values.mode} console logs`,
    "",
    `Hash values omitted. ${count} sequential runs; each click waited for completion.`,
    "",
  ];
  for (let index = 0; index < results.length; index++) {
    lines.push(
      `## Run ${index + 1}`,
      "",
      "```json",
      ...results[index].map((entry) => JSON.stringify(entry)),
      "```",
      "",
    );
  }

  await writeFile(outputPath, `${lines.join("\n")}\n`, "utf8");
  console.log(`Wrote ${outputPath}`);
} finally {
  await browser.close();
}
