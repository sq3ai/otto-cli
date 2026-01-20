import { sh } from "../utils/shell.js";

/**
 * Git helper functions
 */
export const git = {
  isRepo: () => sh("git rev-parse --is-inside-work-tree", true) === "true",

  branch: () => {
    if (!git.isRepo()) return "no-git";
    const b = sh("git symbolic-ref --short -q HEAD", true);
    if (b) return b;
    const d = sh("git rev-parse --short HEAD", true);
    return d ? `detached@${d}` : "unborn";
  },

  defaultBranch: () => {
    if (!git.isRepo()) return null;
    try {
      sh("git rev-parse --verify origin/main");
      return "origin/main";
    } catch {
      try {
        sh("git rev-parse --verify origin/master");
        return "origin/master";
      } catch {
        return "main";
      }
    }
  },

  commitInfo: (ref) => {
    try {
      const out = sh(`git log -1 --format="%h|%s|%ar" ${ref}`, true);
      if (!out) return null;
      const [hash, msg, time] = out.split("|");
      return { hash, msg, time };
    } catch {
      return null;
    }
  },

  commitsBehind: (target) => {
    try {
      return sh(`git rev-list --count HEAD..${target}`, true);
    } catch {
      return "0";
    }
  },

  upstreamBehindCount: () => {
    if (!git.isRepo()) return 0;
    try {
      const count = sh("git rev-list --count HEAD..@{u}", true);
      return parseInt(count) || 0;
    } catch {
      return 0;
    }
  },

  user: () => sh("git config user.name", true) || "Ghost",

  diff: (staged = true) =>
    sh(`git diff ${staged ? "--cached" : ""} --stat`, true),

  rawDiff: () => sh("git diff --cached", true),

  // Auto-stash for switching branches
  stash: () => {
    if (!git.isRepo()) return false;
    const isDirty = sh("git status --porcelain", true).length > 0;
    if (!isDirty) return false;
    sh('git stash push -m "Otto Auto-Switch"', true);
    return true;
  },

  // Manual stash with message
  stashSave: (msg = "Otto Stash") => {
    const isDirty = sh("git status --porcelain", true).length > 0;
    if (!isDirty) throw new Error("No local changes to stash");
    sh(`git stash push -m "${msg}"`);
    return true;
  },

  // List all stashes
  stashList: () => {
    const out = sh("git stash list", true);
    if (!out) return [];
    // Output: stash@{0}: On main: message...
    return out.split("\n").map((line) => {
      const firstColon = line.indexOf(":");
      const ref = line.substring(0, firstColon);
      const msg = line.substring(firstColon + 1).trim();
      return { ref, msg };
    });
  },

  pop: () => {
    if (!git.isRepo()) return false;
    try {
      sh("git stash pop");
      return true;
    } catch {
      return false;
    }
  },

  log: (limit = 10) => {
    if (!git.isRepo()) return [];
    const out = sh(
      `git log -n ${limit} --pretty=format:"%h|%s|%an|%ar"`,
      true
    );
    if (!out) return [];
    return out.split("\n").map((line) => {
      const [hash, msg, author, time] = line.split("|");
      return { hash, msg, author, time };
    });
  },
};
