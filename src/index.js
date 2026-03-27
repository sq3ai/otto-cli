import { Command } from "commander";
import { select, isCancel, outro } from "@clack/prompts";
import { createRequire } from "module";
import { ui } from "./ui/index.js";
import { ensureConfig } from "./utils/setup.js";

const require = createRequire(import.meta.url);
const { version } = require("../package.json");
import {
  checkForUpdates,
  flowRelease,
  flowBranch,
  flowStash,
  flowUndo,
  flowSync,
  flowBuild,
  flowSettings,
} from "./commands/index.js";

/**
 * Main interactive menu loop
 */
async function mainMenu() {
  ui.banner();
  await ensureConfig();
  await checkForUpdates();

  while (true) {
    const op = await select({
      message: "What's the plan?",
      options: [
        { value: "release", label: "🚀 Release", hint: "Build, Tag, Push" },
        { value: "build", label: "🔨 Build", hint: "Install & Build" },
        { value: "branch", label: "🌿 Branch", hint: "Switch, Update, PR" },
        { value: "stash", label: "📦 Stash", hint: "Save & Pop Changes" },
        { value: "undo", label: "⏪ Rollback", hint: "Rollback Commits" },
        { value: "sync", label: "🔄 Sync", hint: "Fetch & Pull latest" },
        { value: "settings", label: "⚙️. Settings", hint: "Config API & Sheets" },
        { value: "quit", label: "🚪 Quit" },
      ],
    });

    if (isCancel(op) || op === "quit") {
      outro("👋 Bye!");
      process.exit(0);
    }

    try {
      if (op === "release") await flowRelease();
      if (op === "build") await flowBuild();
      if (op === "branch") await flowBranch();
      if (op === "stash") await flowStash();
      if (op === "undo") await flowUndo();
      if (op === "sync") await flowSync();
      if (op === "settings") await flowSettings();
    } catch (e) {
      const { note } = await import("@clack/prompts");
      note(e.message, "⚠ Unexpected Error");
    }

    console.log("");
  }
}

/**
 * Setup and run the CLI program
 */
export async function run() {
  const program = new Command();
  program.name("otto").description("AI-powered Release CLI").version(version);

  program.command("release").action(async () => {
    ui.banner();
    await ensureConfig();
    await checkForUpdates();
    await flowRelease();
  });

  program.command("branch").action(async () => {
    ui.banner();
    await checkForUpdates();
    await flowBranch();
  });

  program.command("stash").action(async () => {
    ui.banner();
    await checkForUpdates();
    await flowStash();
  });

  program.command("undo").action(async () => {
    ui.banner();
    await checkForUpdates();
    await flowUndo();
  });

  program.command("sync").action(async () => {
    ui.banner();
    await checkForUpdates();
    await flowSync();
  });

  program.command("settings").action(async () => {
    ui.banner();
    await ensureConfig();
    await checkForUpdates();
    await flowSettings();
  });

  program.command("build").action(async () => {
    ui.banner();
    await checkForUpdates();
    await flowBuild();
  });

  if (!process.argv.slice(2).length) {
    await mainMenu();
  } else {
    program.parse(process.argv);
  }
}
