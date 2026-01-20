import { select, text, isCancel } from "@clack/prompts";
import { OPENAI_API_KEY, SHEET_WEBHOOK_URL, updateConfig } from "../config.js";
import pc from "picocolors";

export async function flowSettings() {
  while (true) {
    const maskKey = (key) =>
      key ? `${key.substring(0, 3)}...${key.substring(key.length - 4)}` : "Not Set";
    const maskUrl = (url) =>
      url ? `${url.substring(0, 20)}...` : "Not Set";

    const selection = await select({
      message: "⚙️ Settings",
      options: [
        {
          value: "openai",
          label: "🤖 OpenAI API Key",
          hint: maskKey(OPENAI_API_KEY),
        },
        {
          value: "sheet",
          label: "📊 Google Sheets URL",
          hint: maskUrl(SHEET_WEBHOOK_URL),
        },
        { value: "back", label: "🔙 Back" },
      ],
    });

    if (isCancel(selection) || selection === "back") return;

    if (selection === "openai") {
      const newKey = await text({
        message: "Enter new OpenAI API Key:",
        initialValue: OPENAI_API_KEY || "",
        placeholder: "sk-...",
        validate: (value) => {
          if (!value) return "API Key is required.";
          if (!value.startsWith("sk-")) return "Key usually starts with sk-";
        },
      });

      if (!isCancel(newKey)) {
        updateConfig("OPENAI_API_KEY", newKey);
        console.log(pc.green("✔ OpenAI API Key updated."));
      }
    }

    if (selection === "sheet") {
      const newUrl = await text({
        message: "Enter Google Sheet Webhook URL:",
        initialValue: SHEET_WEBHOOK_URL || "",
        placeholder: "https://script.google.com/...",
        validate: (val) => {
          if (!val) return "URL is required.";
          if (!val.startsWith("http")) return "Invalid URL.";
        },
      });

      if (!isCancel(newUrl)) {
        updateConfig("GOOGLE_SHEET_WEBHOOK_URL", newUrl);
        console.log(pc.green("✔ Google Sheet URL updated."));
      }
    }
  }
}
