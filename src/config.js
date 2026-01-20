import dotenv from "dotenv";
import fs from "fs";

dotenv.config();

// --- Configuration & Helpers ---
export const SHEET_WEBHOOK_URL = process.env.GOOGLE_SHEET_WEBHOOK_URL;
export const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
export const PM = fs.existsSync("pnpm-lock.yaml") ? "pnpm" : "npm";
