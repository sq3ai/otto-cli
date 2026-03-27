import OpenAI from "openai";
import { spinner } from "@clack/prompts";
import pc from "picocolors";
import { OPENAI_API_KEY } from "../config.js";
import { ui } from "../ui/index.js";

/**
 * Generate commit message using OpenAI
 * @param {string} diff - Git diff to analyze
 * @returns {Promise<{msg: string, desc: string}>} Generated message and description
 */
export async function generateCommit(diff) {
  if (!OPENAI_API_KEY) ui.die("Missing OPENAI_API_KEY");

  const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
  const s = spinner();
  s.start(pc.magenta("🤖 AI Analyzing changes"));

  try {
    const res = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0,
      messages: [
        {
          role: "system",
          content:
            "You are a Git commit message generator. Analyze diffs and return a JSON object with exactly two keys: " +
            '"msg" (a short conventional commit message, e.g. "feat: add user auth") and ' +
            '"desc" (a brief technical summary of the changes). Return only valid JSON, no markdown.',
        },
        {
          role: "user",
          content: diff.substring(0, 15000),
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
