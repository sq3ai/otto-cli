import { confirm, isCancel, spinner } from "@clack/prompts";
import pc from "picocolors";
import { git } from "../git/index.js";
import { ui } from "../ui/index.js";

/**
 * Check for updates and offer to pull if behind
 */
export async function checkForUpdates() {
  if (!git.isRepo()) return;

  try {
    const { sh } = await import("../utils/shell.js");
    sh("git fetch", true);
  } catch {
    return;
  }

  let behind = 0;
  const current = git.branch();
  const defaultBr = git.defaultBranch();

  // Smart check: If on main, check against origin/main regardless of upstream config
  if (
    defaultBr &&
    (current === "main" ||
      current === "master" ||
      current === defaultBr.replace("origin/", ""))
  ) {
    behind = parseInt(git.commitsBehind(defaultBr)) || 0;
  } else {
    behind = git.upstreamBehindCount();
  }

  if (behind > 0) {
    const shouldPull = await confirm({
      message: `Your branch is behind by ${behind} commits. Pull them?`,
    });

    if (isCancel(shouldPull)) process.exit(0);

    if (shouldPull) {
      const { sh } = await import("../utils/shell.js");
      const s = spinner();
      s.start(pc.blue("🔄 Pulling latest changes..."));
      try {
        sh(`git pull origin ${current}`);
        s.stop(pc.green("✔ Updated"));
        ui.banner();
      } catch (e) {
        s.stop(pc.red("✖ Pull Failed"));
        const { note } = await import("@clack/prompts");
        note(e.message);
      }
    }
  }
}
