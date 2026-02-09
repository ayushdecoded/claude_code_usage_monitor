# Installation Guide

## Quick Start

### 1. Clone the Repository

```bash
git clone <repository-url>
cd claude-usage-dashboard-next
```

### 2. Run the Interactive Installer

```bash
node install.js
```

The installer will:
- ✓ Verify Node.js and npm versions
- ✓ Install npm dependencies
- ✓ Set up auto-start hooks for Claude Code
- ✓ Create your configuration file
- ✓ Test the setup

### 3. Start the Dashboard

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Manual Installation (Alternative)

If you prefer to set up manually:

### 1. Install Dependencies

```bash
npm install
```

### 2. Create Configuration (Optional)

Create `~/.claude/.dashboard-config.json`:

```json
{
  "gracePeriodMinutes": 30,
  "sessionIdleTimeoutSeconds": 30,
  "autoStart": true,
  "disableShutdown": false,
  "port": 3000,
  "logLevel": "info"
}
```

### 3. Set Up Auto-Start Hook (Optional)

#### Windows

The hook file is already created at:
```
~/.claude/hooks/sessionStart.ps1
```

Just update the project path inside the file.

#### macOS/Linux

The hook file is at:
```
~/.claude/hooks/sessionStart.sh
```

Make it executable:
```bash
chmod +x ~/.claude/hooks/sessionStart.sh
```

Update the project path inside the file.

### 4. Start the Server

```bash
npm run dev
```

---

## Verification

Check that everything is working:

```bash
# 1. Verify server is running
curl http://localhost:3000/api/health

# 2. Check PID lock
cat ~/.claude/.dashboard-pid

# 3. View configuration
cat ~/.claude/.dashboard-config.json

# 4. Check hooks
ls -la ~/.claude/hooks/
```

---

## Configuration Options

### Environment Variables

Override configuration with environment variables:

```bash
# Disable auto-shutdown (for development)
DASHBOARD_DISABLE_SHUTDOWN=true npm run dev

# Change grace period to 60 minutes
DASHBOARD_GRACE_PERIOD_MS=3600000 npm run dev

# Change port
PORT=3001 npm run dev

# Enable debug logging
LOG_LEVEL=debug npm run dev
```

### Config File

Edit `~/.claude/.dashboard-config.json`:

| Option | Default | Description |
|--------|---------|-------------|
| `gracePeriodMinutes` | 30 | Grace period after all sessions close |
| `sessionIdleTimeoutSeconds` | 30 | Time before a session is considered idle |
| `autoStart` | true | Auto-start with Claude Code |
| `disableShutdown` | false | Disable auto-shutdown |
| `port` | 3000 | Server port |
| `logLevel` | info | Logging level (debug, info, warn, error) |

---

## Troubleshooting

### Port Already in Use

```bash
# Use a different port
PORT=3001 npm run dev
```

### Dashboard Won't Start

```bash
# Check for stale PID lock
cat ~/.claude/.dashboard-pid

# Remove if needed
rm ~/.claude/.dashboard-pid
```

### No Session Data

Ensure Claude Code is installed and you've used it at least once:
```bash
ls ~/.claude/projects/
```

### Auto-Start Not Working

**Windows:**
- Verify PowerShell execution policy:
  ```powershell
  Get-ExecutionPolicy
  ```
- If restricted, set to RemoteSigned:
  ```powershell
  Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
  ```

**macOS/Linux:**
- Verify hook is executable:
  ```bash
  ls -la ~/.claude/hooks/sessionStart.sh
  ```
- Make executable if needed:
  ```bash
  chmod +x ~/.claude/hooks/sessionStart.sh
  ```

---

## Uninstallation

To remove the dashboard:

1. Stop the server (Ctrl+C)
2. Remove the PID file:
   ```bash
   rm ~/.claude/.dashboard-pid
   ```
3. Remove hooks (optional):
   ```bash
   rm ~/.claude/hooks/sessionStart.*
   ```
4. Remove config (optional):
   ```bash
   rm ~/.claude/.dashboard-config.json
   ```
5. Delete the project directory

---

## Next Steps

After installation:
1. ✓ Access the dashboard at http://localhost:3000
2. ✓ Explore the different pages (Overview, Projects, Activity, Tokens, Costs, System)
3. ✓ Customize the configuration if needed
4. ✓ Set up auto-start hooks for convenience

For more information, see [README.md](README.md).
