# Otto CLI - A Project by Sequence3

**AI-powered Git Release and Automation Tool**

Otto is a command-line tool that automates your git workflow. It generates conventional commit messages using AI, manages semantic versioning, handles branch management, and logs every release to a Google Sheet automatically.

---

## Table of Contents

- [Quick Start](#quick-start)
- [Installation](#installation)
- [Configuration](#configuration)
- [Commands](#commands)
- [Features](#features)
- [Google Sheets Setup](#google-sheets-setup-optional)
- [Project Structure](#project-structure)
- [Requirements](#requirements)
- [License](#license)

---

## Quick Start

Run directly with npx (no installation required):

```bash
npx otto-cli
```

Or install globally:

```bash
npm install -g otto-cli
otto-cli
```

Note: Ensure you are inside a Git repository.

---

## Installation

### Using npm

```bash
npm install -g otto-cli
```

### Using pnpm

```bash
pnpm add -g otto-cli
```

### From Source

```bash
git clone https://github.com/your-username/otto-cli.git
cd otto-cli
pnpm install
node index.js
```

---

## Configuration

Otto requires an OpenAI API key to generate commit messages. Optionally, you can connect a Google Sheet to log your releases.

### Environment Variables

| Variable                   | Required | Description                                        |
| -------------------------- | -------- | -------------------------------------------------- |
| `OPENAI_API_KEY`           | Yes      | Your OpenAI API key for AI-powered commit messages |
| `GOOGLE_SHEET_WEBHOOK_URL` | No       | Google Apps Script URL for release logging         |

### Option 1: Using .env File (Recommended)

Create a `.env` file in your project root:

```ini
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxx
GOOGLE_SHEET_WEBHOOK_URL=https://script.google.com/macros/s/xxxx/exec
```

### Option 2: Using Terminal Exports

```bash
export OPENAI_API_KEY="sk-proj-xxxxxxxx"
export GOOGLE_SHEET_WEBHOOK_URL="https://script.google.com/..."

npx otto-cli
```

---

## Commands

Otto can be run interactively or with direct commands.

### Interactive Mode

```bash
otto-cli
```

This opens the main menu with all available options.

### Direct Commands

| Command              | Description                                          |
| -------------------- | ---------------------------------------------------- |
| `otto-cli release`   | Run the full release flow (build, commit, tag, push) |
| `otto-cli build`     | Install dependencies and run the build script        |
| `otto-cli branch`    | Open the branch manager (switch, create, update, PR) |
| `otto-cli stash`     | Open the stash manager (save and pop stashes)        |
| `otto-cli undo`      | Rollback to a previous commit                        |
| `otto-cli sync`      | Fetch and pull latest changes from remote            |
| `otto-cli --help`    | Display help information                             |
| `otto-cli --version` | Display version number                               |

---

## Features

### Release Flow

The release command provides a complete automated release pipeline:

- **AI-Powered Commits**: Analyzes your staged changes and generates conventional commit messages with technical descriptions using OpenAI GPT-4o-mini.
- **Semantic Versioning**: Automatically bumps version (patch, minor, major) or creates snapshot releases.
- **Build Pipeline**: Runs `npm install` / `pnpm install` and executes your build script if present.
- **Push Options**: Choose between safe push or force push to remote.
- **Automatic Logging**: Logs release details to your connected Google Sheet.
- **Rollback on Failure**: If push fails, automatically reverts the commit and tag.

### Build Command

Run your project's build pipeline without releasing:

- Installs project dependencies
- Executes the build script from package.json
- Provides clear feedback if no build script exists

### Branch Manager

Efficient branch management with smart features:

- **Smart Switch**: Automatically stashes uncommitted changes, switches branches, and restores them.
- **Create Branch**: Quickly create new branches from the current HEAD.
- **Update Branch**: Pull latest changes from main into your current branch.
- **Open PR**: Opens a new Pull Request page in your browser for the current branch.

### Stash Manager

Simplified stash operations:

- **Save**: Stash current changes with an optional custom message.
- **Pop**: View all stashes and select which one to apply.
- **Conflict Handling**: Clear messaging when stash pop results in merge conflicts.

### Rollback (Undo)

Visual history management and reset operations:

- **Visual Log**: See a clean list of the last 15 commits with author and time.
- **Reset Modes**: Choose between Soft (keep staged), Mixed (keep in working dir), or Hard (destroy changes) reset.
- **Safety Confirmation**: Hard reset requires explicit confirmation to prevent accidental data loss.

### Sync

Keep your branch up to date:

- **Auto-Detection**: On startup, checks if your local branch is behind remote.
- **One-Click Pull**: Prompts you to pull changes before you start working.
- **Upstream Configuration**: Automatically configures upstream tracking for branches.

### Smart Features

- **Package Manager Detection**: Automatically detects whether to use npm or pnpm based on lock files.
- **Service Status**: Shows connected services (AI, Sheets) on startup.
- **Branch Status**: Displays current branch, HEAD commit, and commits behind origin.

---

## Google Sheets Setup (Optional)

To enable automatic release logging, follow these steps:

### Step 1: Create a New Sheet

Go to [sheets.new](https://sheets.new) and create a blank spreadsheet.

### Step 2: Open Apps Script

Click **Extensions** > **Apps Script**.

### Step 3: Add the Script

Delete any existing code and paste the following:

```javascript
function doPost(e) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    const data = JSON.parse(e.postData.contents);

    // Columns: Timestamp | User | Branch | Type | Commit Msg | Technical Description
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
  } catch (error) {
    return ContentService.createTextOutput(
      JSON.stringify({ status: "error", message: error.toString() }),
    ).setMimeType(ContentService.MimeType.JSON);
  }
}
```

### Step 4: Deploy as Web App

1. Click the **Deploy** button (top right) > **New deployment**.
2. Click the gear icon (Select type) > **Web app**.
3. Set **Description** to "Otto Logger".
4. Set **Execute as** to "Me" (your email).
5. Set **Who has access** to "Anyone" (required for the CLI to POST data).
6. Click **Deploy**.

### Step 5: Get the URL

Copy the **Web app URL** (starts with `https://script.google.com/...`) and add it to your environment variables as `GOOGLE_SHEET_WEBHOOK_URL`.

---

## Project Structure

```
otto-cli/
├── index.js              # CLI entry point
├── package.json
└── src/
    ├── index.js          # Main menu and CLI setup
    ├── config.js         # Environment configuration
    ├── utils/
    │   ├── shell.js      # Shell command execution
    │   └── text.js       # Text utilities
    ├── git/
    │   └── index.js      # Git helper functions
    ├── ui/
    │   └── index.js      # Terminal UI components
    ├── services/
    │   ├── sheets.js     # Google Sheets integration
    │   └── ai.js         # OpenAI integration
    └── commands/
        ├── release.js    # Release flow
        ├── build.js      # Build flow
        ├── branch.js     # Branch management
        ├── stash.js      # Stash management
        ├── undo.js       # Rollback flow
        ├── sync.js       # Sync flow
        └── updates.js    # Update checking
```

---

## Requirements

- Node.js 18.0.0 or higher
- Git installed and configured
- OpenAI API key

---

## Dependencies

- **commander**: CLI framework
- **@clack/prompts**: Interactive prompts
- **picocolors**: Terminal colors
- **openai**: OpenAI API client
- **dotenv**: Environment variable loading

---

## Links

- [Report Issues](https://github.com/your-username/otto-cli/issues)
- [npm Package](https://www.npmjs.com/package/otto-cli)
