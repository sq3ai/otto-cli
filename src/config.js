import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import os from "os";

dotenv.config();

const HOMEDIR = os.homedir();
const CONFIG_DIR = path.join(HOMEDIR, ".otto-cli");
const CONFIG_FILE = path.join(CONFIG_DIR, "config.json");

function loadGlobalConfig() {
  if (fs.existsSync(CONFIG_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(CONFIG_FILE, "utf8"));
    } catch (e) {
      return {};
    }
  }
  return {};
}

function saveGlobalConfig(newConfig) {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(newConfig, null, 2));
}

const globalConf = loadGlobalConfig();

// --- Configuration & Helpers ---
export let SHEET_WEBHOOK_URL =
  process.env.GOOGLE_SHEET_WEBHOOK_URL || globalConf.GOOGLE_SHEET_WEBHOOK_URL;
export let OPENAI_API_KEY =
  process.env.OPENAI_API_KEY || globalConf.OPENAI_API_KEY;
export const PM = fs.existsSync("pnpm-lock.yaml") ? "pnpm" : "npm";

export function updateConfig(key, value) {
  const current = loadGlobalConfig();
  const updated = { ...current, [key]: value };
  saveGlobalConfig(updated);

  if (key === "GOOGLE_SHEET_WEBHOOK_URL") SHEET_WEBHOOK_URL = value;
  if (key === "OPENAI_API_KEY") OPENAI_API_KEY = value;
}
