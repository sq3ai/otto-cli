# Otto - A Project by Sequence3

> AI-Powered Git Automation & Release Tool

Otto is a powerful CLI that automates your git workflow while keeping everything organized. It uses AI to write conventional commit messages, manages semantic versioning, simplifies branch management, and automatically logs every release to a Google Sheet.

[![npm version](https://img.shields.io/npm/v/otto-cli.svg)](https://www.npmjs.com/package/otto-cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Table of Contents

- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [Key Features](#key-features)
- [Usage & Commands](#usage--commands)
- [Google Sheets Integration](#google-sheets-integration)
- [Comparison](#why-otto)

---

## Quick Start

You can run Otto directly without installation:

```bash
npx otto-cli
```

Or install it globally for daily use:

```bash
npm install -g otto-cli
# or
pnpm add -g otto-cli
```

Once installed, simply run `otto-cli` or `otto` in any git repository to start the interactive menu.

---

## Configuration

Otto is designed to be zero-friction. When you run it for the first time, it will interactively ask for the necessary credentials and save them securely to your global configuration (`~/.otto-cli/config.json`).

**Required:**

- **OpenAI API Key**: Used to analyze diffs and generate commit messages.

**Optional:**

- **Google Sheets Webhook URL**: Used to log release history automatically.

You can modify these settings at any time by running:

```bash
otto-cli settings
```

Or selecting "⚙️ Settings" from the main menu.

---

## Key Features

### 🤖 AI-Powered Commits

Stop writing "fix bug" or "update". Otto analyzes your staged changes using GPT-4o-mini and generates descriptive, conventional commit messages and technical descriptions automatically.

### 🏷️ Semantic Versioning

- Automatically suggests user-friendly version bumps (Patch, Minor, Major).
- Supports snapshot/canary releases.
- Creates annotated git tags.

### 📊 Release Logging

Keep a permanent record of every deployment. Otto sends a structured payload (User, Branch, Version, Commit Message, Technical Description) to your Google Sheet.

### 🌿 Smart Branch Management

- **Safe Switch**: Automatically stashes changes before switching branches and pops them after.
- **Easy PRs**: Open a Pull Request for your current branch with one click.
- **Cleanup**: Delete old local branches easily.

### ⏪ Visual Undo & Rollback

Mistakes happen. Otto provides a clean, visual history of your recent commits and allows you to perform Soft, Mixed, or Hard resets safely with confirmation prompts.

---

## Usage & Commands

You can use Otto in **Interactive Mode** (recommended) or via **Direct Commands**.

### Interactive Mode

Just type `otto` or `otto-cli` to enter the interactive dashboard.

### CLI Commands

| Command         | Description                                                 |
| :-------------- | :---------------------------------------------------------- |
| `otto release`  | **The Core Flow**: Build -> AI Commit -> Tag -> Push -> Log |
| `otto build`    | Run `install` and `build` scripts from package.json         |
| `otto branch`   | Manage branches (Switch, Create, Delete, PR)                |
| `otto stash`    | Interactive stash management (Save, Apply, Drop)            |
| `otto undo`     | Visual commit history and rollback/reset tool               |
| `otto sync`     | Fetch and Pull changes with one command                     |
| `otto settings` | View or update API keys and configurations                  |

---

## Google Sheets Integration

To enable the automatic changelog/release logger, follow these steps to deploy a simple Webhook.

### 1. Create the Sheet

Go to [sheets.new](https://sheets.new) and create a blank spreadsheet.

### 2. Add the Script

Click **Extensions** > **Apps Script** in the top menu. Remove any existing code and paste this:

```javascript
function doPost(e) {
  const sheet = SpreadsheetApp.getActiveSheet();
  const data = JSON.parse(e.postData.contents);

  // Appends: Timestamp | User | Branch | Type | Message | Description
  sheet.appendRow([
    new Date(),
    data.user,
    data.branch,
    data.type,
    data.message,
    data.description,
  ]);

  return ContentService.createTextOutput(
    JSON.stringify({ status: "success" }),
  ).setMimeType(ContentService.MimeType.JSON);
}
```

### 3. Deploy

1. Click the blue **Deploy** button > **New deployment**.
2. Click the gear icon next to "Select type" and choose **Web app**.
3. Description: `Otto Logger`
4. Execute as: **Me**
5. Who has access: **Anyone** (Important! This allows the CLI to send data without OAuth complexity).
6. Click **Deploy**.

### 4. Configure Otto

Copy the **Web app URL** (it starts with `https://script.google.com/...`).
Run `otto settings` and paste the URL when prompted.

---

## Why Otto?

Most release tools are just scripts. Otto is an **intelligent assistant**.

- It doesn't just bump versions; it documents _why_ the version changed.
- It doesn't just checkout branches; it protects your work-in-progress.
- It doesn't just run builds; it ensures you're synced with remote first.

### Requirements

- Node.js 18.0.0 or higher
- Git

---

**Otto** is a project by **Sequence3**.
[GitHub](https://github.com/sq3ai/otto-cli) | [Issues](https://github.com/sq3ai/otto-cli/issues)
