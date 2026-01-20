import { SHEET_WEBHOOK_URL } from "../config.js";

/**
 * Log data to Google Sheets via webhook
 * @param {Object} data - Data to log
 */
export async function logToSheet(data) {
  if (!SHEET_WEBHOOK_URL) return;
  try {
    await fetch(SHEET_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  } catch {
    // ignore
  }
}
