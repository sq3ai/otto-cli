import {
  spinner,
  select,
  confirm,
  text,
  isCancel,
  note,
  group,
} from "@clack/prompts";
import pc from "picocolors";
import { git } from "../git/index.js";
import { sh } from "../utils/shell.js";
import { wrap } from "../utils/text.js";
import { PM } from "../config.js";
import { logToSheet, generateCommit } from "../services/index.js";

/**
 * Release flow - build, tag, and push
 */
export async function flowRelease() {
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
            { value: "patch", label: "Patch", hint: "Bug fixes" },
            { value: "minor", label: "Minor", hint: "New features" },
            { value: "major", label: "Major", hint: "Breaking changes" },
            { value: "none", label: "Snapshot", hint: "No version bump" },
          ],
        }),
      build: () =>
        select({
          message: "Build Options",
          options: [
            { value: "full", label: "Full Build", hint: "Install deps + build" },
            { value: "install", label: "Install Only", hint: "Install deps, skip build" },
            { value: "skip", label: "Skip Build", hint: "Just commit and push" },
          ],
        }),
      push: () =>
        select({
          message: "Push Mode",
          options: [
            { value: "safe", label: "Safe Push", hint: "Standard push" },
            { value: "force", label: "Force Push", hint: "Overwrite remote" },
          ],
        }),
      ok: () => confirm({ message: "Start Release?" }),
    },
    {
      onCancel: () => {
        canceled = true;
        return;
      },
    }
  );

  if (canceled || !config.ok) return;

  const s = spinner();
  try {
    s.start(pc.dim("Syncing origin..."));
    sh("git fetch origin main", true);

    if (config.build !== "skip") {
      s.message(pc.dim("Installing dependencies..."));
      sh(`${PM} install`);

      if (config.build === "full") {
        const hasBuild =
          sh(
            `node -p "require('./package.json').scripts?.build ? 'yes' : 'no'"`,
            true
          ) === "yes";

        if (hasBuild) {
          s.message(pc.dim("Building project..."));
          sh(`${PM} run build`);
        }
      }
    }

    s.message(pc.dim("Staging files..."));
    sh("git add .");
    s.stop(pc.green("Pipeline Ready"));
  } catch (e) {
    s.stop(pc.red("Pipeline Failed"));
    note(e.message, "Error");
    return;
  }

  let commitInfo = { msg: "Manual/No Commit", desc: "No changes" };
  const diff = git.rawDiff();

  if (diff) {
    try {
      const ai = await generateCommit(diff);
      note(pc.italic(wrap(ai.desc, 60)), "📋 AI Summary");

      const msg = await text({
        message: "Commit Message",
        initialValue: ai.msg,
      });
      if (isCancel(msg)) return;

      sh(`git commit -m "${String(msg).replace(/"/g, '\\"')}"`);
      console.log(pc.green("✔ Committed"));
      commitInfo = { msg: String(msg), desc: ai.desc };
    } catch (e) {
      note("AI Generation failed or commit aborted", "⚠ warning");
    }
  } else {
    note("No changes to commit", "ℹ Skip");
  }

  const rb = spinner();
  const startMsg =
    config.type !== "none"
      ? `🔖 Bumping ${config.type}...`
      : "🚀 Preparing push...";
  rb.start(pc.blue(startMsg));

  try {
    if (config.type !== "none") {
      sh(`${PM} version ${config.type}`);
    }

    rb.message(pc.blue("🚀 Pushing to origin"));
    const cmd =
      config.push === "force"
        ? "git push origin HEAD --force --tags"
        : "git push origin HEAD --tags";
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
    } catch {
      /* ignore */
    }
  }
}
