# Installation Modes

The Claude Usage Dashboard supports two installation workflows to accommodate different user preferences.

## 🚀 Mode 1: One-Command Bootstrap (Easiest)

**Best for:** New users, quick setup, automated installation

### How it works:

1. Download the bootstrap script
2. Run it
3. Done!

```bash
curl -o bootstrap.js https://raw.githubusercontent.com/<user>/<repo>/main/bootstrap.js
node bootstrap.js
```

### What it does:

```
┌─────────────────────────────────────┐
│  Bootstrap Script (bootstrap.js)    │
├─────────────────────────────────────┤
│  1. Check system requirements       │
│     ✓ Node.js 18+                   │
│     ✓ npm                            │
│     ✓ git                            │
│                                      │
│  2. Prompt for preferences          │
│     - Repository URL                 │
│     - Installation directory         │
│                                      │
│  3. Clone repository                 │
│     git clone <url> <dir>           │
│                                      │
│  4. Run main installer               │
│     node install.js                  │
└─────────────────────────────────────┘
         ↓
┌─────────────────────────────────────┐
│  Main Installer (install.js)        │
├─────────────────────────────────────┤
│  1. Install npm dependencies         │
│  2. Set up auto-start hooks          │
│  3. Create configuration file        │
│  4. Test the installation            │
│  5. Show next steps                  │
└─────────────────────────────────────┘
```

### User Experience:

```
$ node bootstrap.js

╔══════════════════════════════════════════════════════╗
║        Claude Usage Dashboard Bootstrap              ║
╚══════════════════════════════════════════════════════╝

ℹ This will install Claude Usage Dashboard on your system

Checking system requirements...

✓ Node.js v20.10.0
✓ npm 10.2.3
✓ git version 2.42.0

═══════════════════════════════════════════════════════

Repository URL [https://github.com/...]:
Installation directory [/home/user/claude-usage-dashboard-next]:

Installation Summary:
  Repository: https://github.com/.../claude-usage-dashboard-next.git
  Directory:  /home/user/claude-usage-dashboard-next

Proceed with installation? (y/n): y

═══════════════════════════════════════════════════════

ℹ Cloning repository...
[git output...]

✓ Repository cloned successfully

═══════════════════════════════════════════════════════

ℹ Starting installation wizard...

[Main installer runs...]

═══════════════════════════════════════════════════════
✓ Bootstrap complete! 🎉
═══════════════════════════════════════════════════════
```

---

## 🔧 Mode 2: Pre-Cloned Setup (Developer-Friendly)

**Best for:** Developers, contributors, custom installations

### How it works:

1. Clone the repository manually
2. Run the setup wizard
3. Done!

```bash
git clone <repository-url>
cd claude-usage-dashboard-next
npm run setup
```

### What it does:

```
┌─────────────────────────────────────┐
│  Main Installer (install.js)        │
├─────────────────────────────────────┤
│  1. Detect installation mode        │
│     ✓ Pre-cloned (running in repo)  │
│                                      │
│  2. Verify dependencies              │
│     - Check Node.js version          │
│     - Check npm                      │
│     - Check Claude path              │
│                                      │
│  3. Install npm dependencies         │
│     npm install                      │
│                                      │
│  4. Set up auto-start hooks          │
│     - Create sessionStart.ps1        │
│     - Create sessionStart.sh         │
│     - Set permissions                │
│                                      │
│  5. Configure dashboard              │
│     - Grace period                   │
│     - Session timeout                │
│     - Port                           │
│     - Auto-shutdown toggle           │
│                                      │
│  6. Test installation                │
│     - Verify PID lock location       │
│     - Check hooks                    │
│     - Validate configuration         │
│                                      │
│  7. Show next steps                  │
│     - How to start the server        │
│     - Health check commands          │
│     - Configuration options          │
└─────────────────────────────────────┘
```

### User Experience:

```
$ npm run setup

╔══════════════════════════════════════════════════════╗
║          Claude Usage Dashboard Setup                ║
╚══════════════════════════════════════════════════════╝

═══════════════════════════════════════════════════════
  Installation Mode
═══════════════════════════════════════════════════════

ℹ Detected: Running from cloned repository
✓ Using existing repository at: /path/to/repo

═══════════════════════════════════════════════════════
  Verifying Dependencies
═══════════════════════════════════════════════════════

✓ Node.js v20.10.0
✓ npm 10.2.3
✓ Claude Code path: /home/user/.claude

═══════════════════════════════════════════════════════
  Installing Dependencies
═══════════════════════════════════════════════════════

ℹ Running: npm install
[npm output...]

✓ Dependencies installed

═══════════════════════════════════════════════════════
  Setting Up Auto-Start Hooks
═══════════════════════════════════════════════════════

✓ Bash hook created at /home/user/.claude/hooks/sessionStart.sh

═══════════════════════════════════════════════════════
  Configuration Setup
═══════════════════════════════════════════════════════

ℹ Configure the dashboard (or press Enter for defaults):

Grace period after all sessions close (minutes) [30]:
Session idle timeout (seconds) [30]:
Server port [3000]:
Disable auto-shutdown (development mode)? (y/n): n

✓ Configuration saved to /home/user/.claude/.dashboard-config.json

{
  "gracePeriodMinutes": 30,
  "sessionIdleTimeoutSeconds": 30,
  "autoStart": true,
  "disableShutdown": false,
  "port": 3000,
  "logLevel": "info"
}

═══════════════════════════════════════════════════════
  Testing Setup
═══════════════════════════════════════════════════════

ℹ Checking PID lock file location...
✓ PID directory exists: /home/user/.claude

ℹ Checking hooks...
✓ Bash hook ready: /home/user/.claude/hooks/sessionStart.sh

ℹ Configuration file...
✓ Configuration ready: /home/user/.claude/.dashboard-config.json

═══════════════════════════════════════════════════════
  Setup Complete! 🎉
═══════════════════════════════════════════════════════

Next Steps:

1. Claude Code Auto-Start (Optional)
   The Bash hook is ready at:
   /home/user/.claude/hooks/sessionStart.sh
   Claude Code will automatically run it when you start a session.

2. Start the Dashboard
   Run:
   npm run dev
   Then open http://localhost:3000 in your browser

3. Monitor Health
   Check server status:
   curl http://localhost:3000/api/health | jq

4. Customize Configuration (Optional)
   Edit:
   /home/user/.claude/.dashboard-config.json
   Changes take effect on next restart.

5. Documentation
   See README.md for detailed information:
   - Advanced configuration options
   - Performance tuning
   - Troubleshooting guide

═══════════════════════════════════════════════════════
Happy coding! Your dashboard is ready 🚀
═══════════════════════════════════════════════════════
```

---

## 📊 Comparison

| Feature | Bootstrap | Pre-Cloned |
|---------|-----------|------------|
| **Clones repo** | ✅ Automatic | ❌ Manual |
| **Installation location** | ✅ Choose | ✅ Current dir |
| **Dependencies** | ✅ Auto-install | ✅ Auto-install |
| **Configuration** | ✅ Interactive | ✅ Interactive |
| **Hooks setup** | ✅ Automatic | ✅ Automatic |
| **Best for** | End users | Developers |
| **Steps required** | 2 | 3 |
| **Customization** | Standard | Full control |

---

## 🎯 Which Should You Use?

### Use Bootstrap if:
- ✅ You want the fastest installation
- ✅ You don't need to customize before installing
- ✅ You want a "just works" experience
- ✅ You're new to the project

### Use Pre-Cloned if:
- ✅ You want to review the code first
- ✅ You're contributing to the project
- ✅ You need custom git settings (fork, branch, etc.)
- ✅ You're doing development work

---

## 🔄 Re-running Setup

Both modes support re-running the setup:

```bash
# From the project directory
npm run setup
```

This will:
- Detect existing configuration
- Ask if you want to overwrite
- Re-create hooks if needed
- Validate the installation

---

## 🛠️ Technical Details

### Bootstrap Script (`bootstrap.js`)
- **Standalone**: No dependencies required
- **Downloads**: Clones from GitHub
- **Delegates**: Runs `install.js` after cloning
- **Portable**: Can be hosted on GitHub or CDN

### Main Installer (`install.js`)
- **Dual-mode**: Detects if pre-cloned or fresh install
- **Interactive**: Uses stdin for prompts
- **Cross-platform**: Works on Windows, macOS, Linux
- **Idempotent**: Safe to run multiple times

### Smart Detection

The installer automatically detects the environment:

```javascript
// Checks for package.json with correct name
// Checks for next.config.ts
// If found → Pre-cloned mode
// If not found → Fresh install mode (prompts for repo)
```

---

## 📝 For Open Source Distribution

### Recommended Installation Command:

```bash
node -e "$(curl -fsSL https://raw.githubusercontent.com/<user>/<repo>/main/bootstrap.js)"
```

This one-liner:
1. Downloads the bootstrap script
2. Executes it immediately
3. Guides user through complete setup
4. Results in fully configured dashboard

Perfect for README copy-paste installation!
