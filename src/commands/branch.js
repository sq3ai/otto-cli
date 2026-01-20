import { spinner, select, text, isCancel, note } from "@clack/prompts";
import pc from "picocolors";
import { git } from "../git/index.js";
import { sh } from "../utils/shell.js";

/**
 * Branch manager flow - switch, create, update, PR
 */
export async function flowBranch() {
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
      options: branches
        .filter((b) => b !== curr)
        .map((b) => ({ value: b, label: b })),
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
    const name = await text({
      message: "Branch Name",
      placeholder: "feat/new-thing",
    });
    if (isCancel(name)) return;
    try {
      sh(`git checkout -b ${name}`);
      note(`Checked out to ${name}`, "✔ Created");
    } catch (e) {
      note(e.message, "✖ Failed");
    }
  }

  if (action === "pr") {
    const url = sh("git config --get remote.origin.url", true)
      .replace(".git", "")
      .replace(":", "/")
      .replace("git@", "https://");
    const prUrl = `${url}/pull/new/${curr}`;
    sh(
      process.platform === "darwin" ? `open ${prUrl}` : `start ${prUrl}`,
      true
    );
    note("Opened PR in browser", "✔ PR");
  }
}
