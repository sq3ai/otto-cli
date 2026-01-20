import { text, confirm } from "@clack/prompts";
import { OPENAI_API_KEY, SHEET_WEBHOOK_URL, updateConfig } from "../config.js";
import pc from "picocolors";

export async function ensureConfig() {
  let updated = false;

  if (!OPENAI_API_KEY) {
    console.log(pc.yellow("ℹ OpenAI API Key is missing."));
    const key = await text({
      message: "Enter your OpenAI API Key:",
      placeholder: "sk-...",
      validate: (value) => {
        if (!value) return "API Key is required.";
        if (!value.startsWith("sk-")) return "Key usually starts with sk-";
      },
    });

    if (key === undefined || typeof key === "symbol") {
      process.exit(0);
    }

    updateConfig("OPENAI_API_KEY", key);
    updated = true;
  }

  if (!SHEET_WEBHOOK_URL) {
    const setupSheets = await confirm({
      message: "Do you want to configure Google Sheets logging now?",
      initialValue: true,
    });

    if (setupSheets === undefined || typeof setupSheets === "symbol") {
      process.exit(0);
    }

    if (setupSheets) {
      const url = await text({
        message: "Enter Google Sheet Webhook URL:",
        placeholder: "https://script.google.com/...",
        validate: (val) => {
          if (!val) return "URL is required if you want to enable logging.";
          if (!val.startsWith("http")) return "Invalid URL.";
        },
      });

      if (url === undefined || typeof url === "symbol") {
        process.exit(0);
      }

      updateConfig("GOOGLE_SHEET_WEBHOOK_URL", url);
      updated = true;
    }
  }

  if (updated) {
    console.log(pc.green("✔ Configuration saved successfully."));
  }
}
