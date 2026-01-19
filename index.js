#!/usr/bin/env node
import { Command } from "commander";
import OpenAI from "openai";
import {
  intro,
  outro,
  spinner,
  select,
  confirm,
  text,
  isCancel,
  note,
  group,
} from "@clack/prompts";
import pc from "picocolors";
import { execSync } from "child_process";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config();

// --- Configuration & Helpers ---
const SHEET_WEBHOOK_URL = process.env.GOOGLE_SHEET_WEBHOOK_URL;
const PM = fs.existsSync("pnpm-lock.yaml") ? "pnpm" : "npm";

const sh = (cmd, ignore = false) => {
  try {
    return execSync(cmd, { stdio: "pipe" }).toString().trim();
  } catch (e) {
    if (!ignore)
      throw new Error(e?.stderr?.toString() || e?.message || String(e));
    return "";
  }
};

const wrap = (s, w = 60) => {
  if (!s) return "";
  return s
    .split(/\s+/)
    .reduce((acc, word) => {
      const last = acc[acc.length - 1];
      if (last && (last + word).length < w) acc[acc.length - 1] += " " + word;
      else acc.push(word);
      return acc;
    }, [])
    .join("\n");
};

// --- Git Helpers ---
const git = {
  isRepo: () => sh("git rev-parse --is-inside-work-tree", true) === "true",

  branch: () => {
    if (!git.isRepo()) return "no-git";
    const b = sh("git symbolic-ref --short -q HEAD", true);
    if (b) return b;
    const d = sh("git rev-parse --short HEAD", true);
    return d ? `detached@${d}` : "unborn";
  },

  defaultBranch: () => {
    if (!git.isRepo()) return null;
    try {
      sh("git rev-parse --verify origin/main");
      return "origin/main";
    } catch {
      try {
        sh("git rev-parse --verify origin/master");
        return "origin/master";
      } catch {
        return "main";
      }
    }
  },

  commitInfo: (ref) => {
    try {
      const out = sh(`git log -1 --format="%h|%s|%ar" ${ref}`, true);
      if (!out) return null;
      const [hash, msg, time] = out.split("|");
      return { hash, msg, time };
    } catch {
      return null;
    }
  },

  // Calculates behind count relative to a specific target (e.g. origin/main)
  commitsBehind: (target) => {
    try {
      return sh(`git rev-list --count HEAD..${target}`, true);
    } catch {
      return "0";
    }
  },

  // NEW: Checks if CURRENT branch has upstream updates
  upstreamBehindCount: () => {
    if (!git.isRepo()) return 0;
    try {
        // Ensure upstream exists (@{u}) and count commits between HEAD and upstream
        const count = sh("git rev-list --count HEAD..@{u}", true);
        return parseInt(count) || 0;
    } catch {
        return 0; // No upstream or other error
    }
  },

  user: () => sh("git config user.name", true) || "Ghost",

  diff: (staged = true) =>
    sh(`git diff ${staged ? "--cached" : ""} --stat`, true),

  rawDiff: () => sh("git diff --cached", true),

  stash: () => {
    if (!git.isRepo()) return false;
    const isDirty = sh("git status --porcelain", true).length > 0;
    if (!isDirty) return false;
    sh('git stash push -m "Otto Auto-Switch"', true);
    return true;
  },

  pop: () => {
    if (!git.isRepo()) return false;
    try {
      sh("git stash pop");
      return true;
    } catch {
      return false;
    }
  },

  log: (limit = 10) => {
    if (!git.isRepo()) return [];
    const out = sh(
      `git log -n ${limit} --pretty=format:"%h|%s|%an|%ar"`,
      true
    );
    if (!out) return [];
    return out.split("\n").map((line) => {
      const [hash, msg, author, time] = line.split("|");
      return { hash, msg, author, time };
    });
  },
};

const ui = {
  die: (msg) => {
    outro(pc.red(msg));
    process.exit(1);
  },
  banner: () => {
    console.clear();
    intro(pc.bgCyan(pc.black(" Otto by @thev1ndu ")));

    const user = git.user();
    const br = git.branch();
    
    console.log(pc.dim(`👋 Hello, ${user} (on ${pc.cyan(br)})`));
    console.log(pc.dim(`🔧 Using: ${PM}`));

    if (!git.isRepo()) {
      note("You're not inside a git repository.", "ℹ Git");
      return;
    }

    const defaultBr = git.defaultBranch();
    
    if (defaultBr) {
        console.log(pc.dim("─".repeat(50)));
        
        const defInfo = git.commitInfo(defaultBr);
        if (defInfo) {
            console.log(
                `${pc.green("🌿 " + defaultBr.padEnd(12))} ` + 
                `${pc.dim(defInfo.hash)} ${pc.white(defInfo.msg.substring(0, 40))} ${pc.dim("(" + defInfo.time + ")")}`
            );
        }

        const headInfo = git.commitInfo("HEAD");
        if (headInfo) {
            console.log(
                `${pc.blue("📍 HEAD".padEnd(13))} ` + 
                `${pc.dim(headInfo.hash)} ${pc.white(headInfo.msg.substring(0, 40))} ${pc.dim("(" + headInfo.time + ")")}`
            );
        }

        const behind = git.commitsBehind(defaultBr);
        if (parseInt(behind) > 0) {
            console.log(pc.yellow(`📉 Status:      ${behind} commits behind ${defaultBr}`));
        } else {
            console.log(pc.dim(`✓ Up to date with ${defaultBr}`));
        }
    }
  },
};

// --- Services ---
async function logToSheet(data) {
  if (!SHEET_WEBHOOK_URL) return;
  try {
    await fetch(SHEET_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  } catch {
    // ignore
  }
}

async function generateCommit(diff) {
  if (!process.env.OPENAI_API_KEY) ui.die("Missing OPENAI_API_KEY");

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const s = spinner();
  s.start(pc.magenta("🤖 AI Analyzing changes"));

  try {
    const res = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content:
            `Analyze diff, return JSON with "msg" (conventional commit) and "desc" (technical summary):\n` +
            diff.substring(0, 15000),
        },
      ],
      response_format: { type: "json_object" },
    });

    s.stop(pc.green("✔ AI Analysis Complete"));
    return JSON.parse(res.choices?.[0]?.message?.content || "{}");
  } catch (e) {
    s.stop(pc.red("✖ AI Failed"));
    throw e;
  }
}

// --- Flows ---

async function checkForUpdates() {
    if (!git.isRepo()) return;

    // 1. Silent Fetch
    try {
        sh("git fetch", true); 
    } catch { return; }

    // 2. Check upstream status
    const behind = git.upstreamBehindCount();
    
    // 3. Prompt if behind
    if (behind > 0) {
        const shouldPull = await confirm({
            message: `Before proceeding, there're ${behind} new updates on repo. Pull them?`,
        });

        if (isCancel(shouldPull)) process.exit(0);

        if (shouldPull) {
            const s = spinner();
            s.start(pc.blue("🔄 Pulling latest changes..."));
            try {
                sh("git pull");
                s.stop(pc.green("✔ Updated"));
                // Refresh banner after pull
                ui.banner();
            } catch (e) {
                s.stop(pc.red("✖ Pull Failed"));
                note(e.message);
            }
        }
    }
}

async function flowUndo() {
  if (!git.isRepo()) {
    note("Not a git repository.", "Error");
    return;
  }

  const s = spinner();
  s.start(pc.dim("Fetching history"));
  const history = git.log(15);
  s.stop(pc.dim("History loaded"));

  if (!history.length) {
    note("No commit history found to undo.", "ℹ Empty");
    return;
  }

  const targetHash = await select({
    message: "Reset branch to which commit?",
    options: history.map((c, i) => {
      const label = i === 0 ? `${c.msg} (Current)` : c.msg;
      return {
        value: c.hash,
        label: `${pc.cyan(c.hash)} ${label}`,
        hint: `${c.author}, ${c.time}`,
      };
    }),
  });

  if (isCancel(targetHash)) return;

  if (targetHash === history[0].hash) {
    note("You selected the current commit. No changes made.", "ℹ Info");
    return;
  }

  const resetMode = await select({
    message: "How should we reset?",
    options: [
      { value: "--soft", label: "🧸 Soft Reset", hint: "Keep changes staged" },
      { value: "--mixed", label: "🚧 Mixed Reset", hint: "Keep changes in working dir" },
      { value: "--hard", label: "🧨 Hard Reset", hint: "DESTROY changes" },
    ],
  });

  if (isCancel(resetMode)) return;

  if (resetMode === "--hard") {
    const safe = await confirm({
      message: pc.red("⚠️  This will delete all uncommitted changes. Sure?"),
    });
    if (!safe || isCancel(safe)) return;
  }

  const r = spinner();
  r.start(pc.yellow(`Resetting to ${targetHash}...`));

  try {
    sh(`git reset ${resetMode} ${targetHash}`);
    r.stop(pc.green(`✔ Reset complete (${resetMode})`));
    note(`HEAD is now at ${targetHash}`, "ℹ Reset Info");
  } catch (e) {
    r.stop(pc.red("✖ Reset failed"));
    console.error(e.message);
  }
}

async function flowSync() {
  if (!git.isRepo()) {
    note("Not a git repository.", "Error");
    return;
  }
  
  const s = spinner();
  s.start(pc.blue("📡 Fetching origin..."));
  
  try {
    sh("git fetch origin");
    s.message(pc.blue("🔄 Pulling latest changes..."));
    
    const curr = git.branch();
    try {
        sh(`git pull origin ${curr}`);
    } catch {
        sh("git pull");
    }
    
    s.stop(pc.green("✔ Sync Complete"));
  } catch (e) {
    s.stop(pc.red("✖ Sync Failed"));
    note(e.message, "Git Error");
  }
}

async function flowRelease() {
  if (!git.isRepo()) {
    note("Not a git repository.", "Error");
    return;
  }

  let canceled = false;
  const config = await group(
    {
      type: () =>
        select({
          message: "Release Type",
          options: [
            { value: "patch", label: "🐛 Patch", hint: "Fixes" },
            { value: "minor", label: "✨ Minor", hint: "Features" },
            { value: "major", label: "💥 Major", hint: "Breaking" },
            { value: "none", label: "💨 Snapshot", hint: "No version bump" },
          ],
        }),
      push: () =>
        select({
          message: "Push Mode",
          options: [
            { value: "safe", label: "🛡️ Safe", hint: "Standard push" },
            { value: "force", label: "🔥 Force", hint: "Overwrite remote" },
          ],
        }),
      ok: () => confirm({ message: "Start Build & Release?" }),
    },
    { onCancel: () => { canceled = true; return; } }
  );

  if (canceled || !config.ok) return;

  const s = spinner();
  try {
    s.start(pc.dim("🔄 Syncing origin"));
    sh("git fetch origin main");
    s.message(pc.dim("📦 Installing deps"));
    sh(`${PM} install`);

    const hasBuild = sh(`node -p "require('./package.json').scripts?.build ? 'yes' : 'no'"`, true) === "yes";

    if (hasBuild) {
      s.message(pc.dim("🛠️  Building project"));
      sh(`${PM} run build`);
    } 

    s.message(pc.dim("📝 Staging files"));
    sh("git add .");
    s.stop(pc.green("✔ Build Pipeline Success"));
  } catch (e) {
    s.stop(pc.red("✖ Pipeline Failed"));
    note(e.message, "Error");
    return;
  }

  let commitInfo = { msg: "Manual/No Commit", desc: "No changes" };
  const diff = git.rawDiff();

  if (diff) {
    try {
        const ai = await generateCommit(diff);
        note(pc.italic(wrap(ai.desc, 60)), "📋 AI Summary");

        const msg = await text({ message: "Commit Message", initialValue: ai.msg });
        if (isCancel(msg)) return;

        sh(`git commit -m "${String(msg).replace(/"/g, '\\"')}"`);
        console.log(pc.green("✔ Committed"));
        commitInfo = { msg: String(msg), desc: ai.desc };
    } catch(e) {
        note("AI Generation failed or commit aborted", "⚠ warning");
    }
  } else {
    note("No changes to commit", "ℹ Skip");
  }

  const rb = spinner();
  const startMsg = config.type !== "none" ? `🔖 Bumping ${config.type}...` : "🚀 Preparing push...";
  rb.start(pc.blue(startMsg));

  try {
    if (config.type !== "none") {
      sh(`${PM} version ${config.type}`);
    }

    rb.message(pc.blue("🚀 Pushing to origin"));
    const cmd = config.push === "force" ? "git push origin HEAD --force --tags" : "git push origin HEAD --tags";
    sh(cmd);

    await logToSheet({
      user: git.user(),
      branch: git.branch(),
      type: String(config.type),
      message: commitInfo.msg,
      description: commitInfo.desc,
    });

    rb.stop(pc.green("✔ Deployed"));
  } catch {
    rb.stop(pc.red("✖ Push Failed. Rolling back"));
    try {
      if (config.type !== "none") {
        const tag = sh("git describe --tags --abbrev=0", true);
        if (tag) sh(`git tag -d ${tag}`);
      }
      sh("git reset --soft HEAD~1");
      note("Tag deleted & commit reset.", "✅ Rollback");
    } catch { /* ignore */ }
  }
}

async function flowBranch() {
  if (!git.isRepo()) {
    note("Not a git repository.", "Error");
    return;
  }

  const branches = sh('git branch --format="%(refname:short)"', true)
    .split("\n")
    .map((b) => b.trim())
    .filter(Boolean);

  const curr = git.branch();

  const action = await select({
    message: "Branch Manager",
    options: [
      { value: "switch", label: "🔀 Switch", hint: "Auto-Stash & Switch" },
      { value: "create", label: "✨ Create", hint: "From current" },
      { value: "update", label: "🔄 Update", hint: "Pull main into current" },
      { value: "pr", label: "🌐 Open PR", hint: "View on GitHub" },
    ],
  });

  if (isCancel(action)) return;

  if (action === "switch") {
    const target = await select({
      message: "Select Branch",
      options: branches.filter((b) => b !== curr).map((b) => ({ value: b, label: b })),
    });
    if (isCancel(target)) return;

    const s = spinner();
    s.start(pc.dim("Switching branches"));
    const stashed = git.stash();
    
    try {
      sh(`git checkout ${target}`);
      s.message(pc.dim(`Switched to ${target}`));
    } catch {
      s.stop(pc.red("✖ Checkout Failed"));
      return;
    }

    if (stashed) {
      s.message(pc.dim("Restoring changes"));
      if (!git.pop()) {
        s.stop(pc.yellow("⚠ Switched, but stash pop had conflicts."));
        note("Run 'git stash pop' manually to resolve.", "Conflict Alert");
        return;
      }
    }
    s.stop(pc.green(`✔ Switched to ${target}`));
  }

  if (action === "update") {
    const s = spinner();
    s.start(pc.dim("Fetching main"));
    try {
      sh("git fetch origin main");
      s.message(pc.dim("Pulling changes"));
      sh("git pull origin main");
      s.stop(pc.green("✔ Branch updated from main"));
    } catch (e) {
      s.stop(pc.red("✖ Update Failed"));
      note(e.message, "Git Error");
    }
  }

  if (action === "create") {
    const name = await text({ message: "Branch Name", placeholder: "feat/new-thing" });
    if (isCancel(name)) return;
    try {
        sh(`git checkout -b ${name}`);
        note(`Checked out to ${name}`, "✔ Created");
    } catch(e) {
        note(e.message, "✖ Failed");
    }
  }

  if (action === "pr") {
    const url = sh("git config --get remote.origin.url", true)
      .replace(".git", "")
      .replace(":", "/")
      .replace("git@", "https://");
    const prUrl = `${url}/pull/new/${curr}`;
    sh(process.platform === "darwin" ? `open ${prUrl}` : `start ${prUrl}`, true);
    note("Opened PR in browser", "✔ PR");
  }
}

// --- Main Loop ---
async function mainMenu() {
    ui.banner(); // Show Banner
    await checkForUpdates(); // Check & Prompt for pull (Smart Auto-Sync)

    while (true) {
        const op = await select({
            message: "What's the plan?",
            options: [
                { value: "release", label: "🚀 Release", hint: "Build, Tag, Push" },
                { value: "branch", label: "🌿 Branch", hint: "Switch, Update, PR" },
                { value: "undo", label: "⏪ Rollback", hint: "Rollback Commits using History" },
                { value: "sync", label: "🔄 Sync", hint: "Fetch & Pull latest" },
                { value: "quit", label: "🚪 Quit" },
            ],
        });

        if (isCancel(op) || op === "quit") {
            outro("👋 Bye!");
            process.exit(0);
        }

        try {
            if (op === "release") await flowRelease();
            if (op === "branch") await flowBranch();
            if (op === "undo") await flowUndo();
            if (op === "sync") await flowSync();
        } catch (e) {
            note(e.message, "⚠ Unexpected Error");
        }
        
        console.log("");
    }
}

// --- Entry Point ---
const program = new Command();
program.name("otto").description("AI-powered Release CLI").version("3.0.1");

program.command("release").action(async () => {
  ui.banner();
  await flowRelease();
});

program.command("branch").action(async () => {
  ui.banner();
  await flowBranch();
});

program.command("undo").action(async () => {
  ui.banner();
  await flowUndo();
});

program.command("sync").action(async () => {
    ui.banner();
    await flowSync();
});

if (!process.argv.slice(2).length) {
  await mainMenu();
} else {
  program.parse(process.argv);
}