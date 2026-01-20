import { intro, outro, note } from "@clack/prompts";
import pc from "picocolors";
import { git } from "../git/index.js";
import { PM } from "../config.js";

export const ui = {
  die: (msg) => {
    outro(pc.red(msg));
    process.exit(1);
  },

  banner: () => {
    console.clear();
    intro(pc.bgCyan(pc.black(" Otto - A Project by Sequence3 ")));

    const user = git.user();
    const br = git.branch();

    console.log(pc.dim(`👋 Hello, ${user} (on ${pc.cyan(br)})`));
    console.log(pc.dim(`🔧 Using: ${PM}`));

    // --- Services Check ---
    const services = [];
    if (process.env.OPENAI_API_KEY) services.push("AI");
    if (process.env.GOOGLE_SHEET_WEBHOOK_URL) services.push("Sheets");

    if (services.length > 0) {
      console.log(pc.dim(`⚡ Services: ${services.join(" + ")}`));
    }

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
            `${pc.dim(defInfo.hash)} ${pc.white(
              defInfo.msg.substring(0, 40)
            )} ${pc.dim("(" + defInfo.time + ")")}`
        );
      }

      const headInfo = git.commitInfo("HEAD");
      if (headInfo) {
        console.log(
          `${pc.blue("📍 HEAD".padEnd(13))} ` +
            `${pc.dim(headInfo.hash)} ${pc.white(
              headInfo.msg.substring(0, 40)
            )} ${pc.dim("(" + headInfo.time + ")")}`
        );
      }

      const behind = git.commitsBehind(defaultBr);
      if (parseInt(behind) > 0) {
        console.log(
          pc.yellow(`📉 Status:      ${behind} commits behind ${defaultBr}`)
        );
      } else {
        console.log(pc.dim(`✓ Up to date with ${defaultBr}`));
      }
    }
  },
};
