import { execSync } from "child_process";

/**
 * Execute a shell command and return the output
 * @param {string} cmd - Command to execute
 * @param {boolean} ignore - Whether to ignore errors
 * @returns {string} Command output
 */
export const sh = (cmd, ignore = false) => {
  try {
    return execSync(cmd, { stdio: "pipe" }).toString().trim();
  } catch (e) {
    if (!ignore)
      throw new Error(e?.stderr?.toString() || e?.message || String(e));
    return "";
  }
};
