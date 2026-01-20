import { spinner, note } from "@clack/prompts";
import pc from "picocolors";
import { git } from "../git/index.js";
import { sh } from "../utils/shell.js";
import { PM } from "../config.js";

/**
 * Build flow - install deps, build project, stage files
 */
export async function flowBuild() {
  if (!git.isRepo()) {
    note("Not a git repository.", "Error");
    return;
  }

  const s = spinner();
  try {
    s.start(pc.dim("📦 Installing dependencies..."));
    sh(`${PM} install`);

    const hasBuild =
      sh(
        `node -p "require('./package.json').scripts?.build ? 'yes' : 'no'"`,
        true
      ) === "yes";

    if (hasBuild) {
      s.message(pc.dim("🛠️  Building project..."));
      sh(`${PM} run build`);
      s.stop(pc.green("✔ Build Complete"));
    } else {
      s.stop(pc.yellow("⚠ No build script found in package.json"));
      note("Add a 'build' script to package.json to enable building.", "ℹ Tip");
    }
  } catch (e) {
    s.stop(pc.red("✖ Build Failed"));
    note(e.message, "Error");
  }
}
