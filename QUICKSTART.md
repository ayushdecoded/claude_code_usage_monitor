# Quick Start - Claude Usage Dashboard

Get up and running in 2 minutes! ⚡

## Installation

Choose your installation method:

### Option 1: One-Command Install (Recommended)

Download and run the bootstrap installer:

```bash
# Download the installer
curl -o bootstrap.js https://raw.githubusercontent.com/<user>/<repo>/main/bootstrap.js

# Run it
node bootstrap.js
```

The installer will:
- ✓ Clone the repository
- ✓ Install dependencies
- ✓ Guide you through configuration
- ✓ Set up auto-start hooks
- ✓ Test the installation

### Option 2: Manual Clone + Setup

If you prefer to clone manually:

```bash
# 1. Clone the repository
git clone <repository-url>
cd claude-usage-dashboard-next

# 2. Run the interactive setup wizard
npm run setup
```

The setup wizard will guide you through:
- ✓ Dependency installation
- ✓ Configuration options
- ✓ Auto-start hook installation
- ✓ Testing the setup

## Start Using

```bash
# Start the dashboard
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) 🚀

## What You'll See

- **Overview**: Summary of your Claude Code usage
- **Projects**: Per-project breakdown with costs
- **Activity**: Daily activity patterns
- **Tokens**: Token usage by type and model
- **Costs**: Cost analysis and trends
- **System**: Performance metrics

## Auto-Start with Claude Code

The setup wizard creates hooks so the dashboard automatically starts when you use Claude Code. No manual server management needed!

## Health Check

Verify everything is working:

```bash
curl http://localhost:3000/api/health | jq
```

## Need Help?

- Full documentation: [README.md](README.md)
- Installation guide: [INSTALL.md](INSTALL.md)
- Configuration options: See README.md

## Common Commands

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run setup        # Re-run setup wizard
```

## Development Mode

Disable auto-shutdown for development:

```bash
DASHBOARD_DISABLE_SHUTDOWN=true npm run dev
```

---

**That's it!** The dashboard is now tracking your Claude Code usage in real-time.
