import { spinner, note } from "@clack/prompts";
import pc from "picocolors";
import { git } from "../git/index.js";
import { sh } from "../utils/shell.js";

/**
 * Sync flow - fetch and pull from origin
 */
export async function flowSync() {
  if (!git.isRepo()) {
    note("Not a git repository.", "Error");
    return;
  }

  const s = spinner();
  s.start(pc.blue("📡 Fetching origin..."));

  try {
    sh("git fetch origin");
    const curr = git.branch();

    // Check if branch exists on remote to avoid error
    const remoteRef = sh(`git ls-remote --heads origin ${curr}`, true);

    if (!remoteRef) {
      s.stop(pc.yellow("⚠ No remote branch"));
      note(
        `Branch 'origin/${curr}' does not exist.\nPush your branch first to enable syncing.`,
        "ℹ Info"
      );
      return;
    }

    s.message(pc.blue(`🔄 Pulling origin/${curr}...`));

    // Explicitly pull from the remote matching current branch
    sh(`git pull origin ${curr}`);

    // Try to fix the upstream config for next time (silent)
    try {
      sh(`git branch --set-upstream-to=origin/${curr} ${curr}`, true);
    } catch {}

    s.stop(pc.green("✔ Sync Complete"));
  } catch (e) {
    s.stop(pc.red("✖ Sync Failed"));
    note(e.message, "Git Error");
  }
}
