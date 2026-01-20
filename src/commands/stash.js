import { spinner, select, text, isCancel, note } from "@clack/prompts";
import pc from "picocolors";
import { git } from "../git/index.js";
import { sh } from "../utils/shell.js";

/**
 * Stash manager flow - save and pop stashes
 */
export async function flowStash() {
  if (!git.isRepo()) {
    note("Not a git repository.", "Error");
    return;
  }

  const action = await select({
    message: "Stash Manager",
    options: [
      { value: "save", label: "💾 Save", hint: "Stash current changes" },
      { value: "pop", label: "🥡 Pop", hint: "Apply saved stash" },
    ],
  });

  if (isCancel(action)) return;

  if (action === "save") {
    try {
      const msg = await text({
        message: "Stash Message (Optional)",
        placeholder: "WIP: Refactoring...",
      });
      if (isCancel(msg)) return;

      const s = spinner();
      s.start(pc.dim("Saving stash..."));
      git.stashSave(msg || "Otto Stash");
      s.stop(pc.green("✔ Stashed successfully"));
    } catch (e) {
      note(e.message, "⚠ Info");
    }
  }

  if (action === "pop") {
    const stashes = git.stashList();
    if (stashes.length === 0) {
      note("No stashes found.", "ℹ Empty");
      return;
    }

    const target = await select({
      message: "Select Stash to Pop",
      options: stashes.map((s) => ({
        value: s.ref,
        label: s.msg,
        hint: s.ref,
      })),
    });

    if (isCancel(target)) return;

    const s = spinner();
    s.start(pc.dim(`Popping ${target}...`));
    try {
      sh(`git stash pop ${target}`);
      s.stop(pc.green("✔ Popped successfully"));
    } catch (e) {
      s.stop(pc.red("✖ Pop resulted in conflicts"));
      note(
        "Changes are applied but there are merge conflicts. Resolve them manually.",
        "⚠ Conflict"
      );
    }
  }
}
