import { spinner, select, confirm, isCancel, note } from "@clack/prompts";
import pc from "picocolors";
import { git } from "../git/index.js";
import { sh } from "../utils/shell.js";

/**
 * Undo/Rollback flow - reset to a previous commit
 */
export async function flowUndo() {
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
      {
        value: "--mixed",
        label: "🚧 Mixed Reset",
        hint: "Keep changes in working dir",
      },
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
