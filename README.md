# Claude Usage Dashboard

A real-time analytics dashboard for monitoring Claude Code usage, token consumption, and cost estimates. Automatically tracks your AI coding sessions and provides comprehensive insights.

![Dashboard Preview](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js) ![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript) ![License](https://img.shields.io/badge/license-MIT-green?style=flat-square)

## ✨ Features

### 📊 Real-Time Analytics
- **Token Usage Tracking**: Monitor input, output, cache read, and cache creation tokens
- **Cost Estimates**: Real-time cost calculations per model, project, and session
- **Activity Monitoring**: Track messages, sessions, and tool calls over time
- **Project Insights**: Per-project breakdowns with session counts and cost estimates

### 🚀 Smart Session Management
- **Auto-Start**: Automatically launches with Claude Code
- **Single Instance**: Prevents duplicate dashboard servers
- **Session Tracking**: Monitors active Claude Code sessions
- **Graceful Shutdown**: 30-minute grace period after all sessions close

### ⚡ Performance Optimized
- **Streaming Parser**: Memory-efficient JSONL parsing
- **Multi-Worker Processing**: Parallel file processing with worker processes
- **Smart Caching**: mtime-based caching for instant hot reloads
- **Real-Time Updates**: Server-Sent Events for live data refresh

## 🛠️ Installation

### Prerequisites
- Node.js 18+
- npm or yarn
- Git
- Claude Code (installed at `~/.claude/`)

### Quick Install (Recommended)

**One-command installation:**

```bash
# Download and run the bootstrap installer
curl -o bootstrap.js https://raw.githubusercontent.com/<user>/<repo>/main/bootstrap.js
node bootstrap.js
```

The interactive installer will:
- ✅ Clone the repository
- ✅ Install dependencies
- ✅ Configure the dashboard
- ✅ Set up auto-start hooks
- ✅ Test the installation

### Manual Installation

**For developers who prefer manual setup:**

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd claude-usage-dashboard-next
   ```

2. **Run the setup wizard**
   ```bash
   npm run setup
   ```

   The wizard will:
   - Install dependencies
   - Configure your preferences
   - Set up auto-start hooks
   - Test the installation

3. **Start the dashboard**
   ```bash
   npm run dev
   ```

4. **Access the dashboard**
   Open [http://localhost:3000](http://localhost:3000) in your browser

### Advanced Installation

See [INSTALL.md](INSTALL.md) for:
- Custom configuration options
- Manual setup without the wizard
- Troubleshooting installation issues

## 🎯 Auto-Start Configuration

### Automatic Launch with Claude Code

The dashboard can automatically start when you launch Claude Code using hooks.

#### Windows (PowerShell)

1. Hook is already created at `~/.claude/hooks/sessionStart.ps1`
2. Update the project path in the hook file if needed:
   ```powershell
   $projectRoot = "C:\Users\YourUsername\projects\claude-usage-dashboard-next"
   ```
3. Claude Code will automatically execute the hook on session start

#### Unix/macOS (Bash)

1. Hook is already created at `~/.claude/hooks/sessionStart.sh`
2. Make it executable:
   ```bash
   chmod +x ~/.claude/hooks/sessionStart.sh
   ```
3. Update the project path if needed:
   ```bash
   PROJECT_ROOT="$HOME/projects/claude-usage-dashboard-next"
   ```

### Configuration Options

Create a config file at `~/.claude/.dashboard-config.json`:

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

**Configuration Priority**: Environment Variables > Config File > Defaults

### Environment Variables

```bash
# Grace period after all sessions close (default: 30 minutes)
DASHBOARD_GRACE_PERIOD_MS=1800000

# Session idle timeout (default: 30 seconds)
DASHBOARD_SESSION_IDLE_TIMEOUT_MS=30000

# Disable auto-shutdown (useful for development)
DASHBOARD_DISABLE_SHUTDOWN=true

# Server port
PORT=3000

# Disable auto-start
DASHBOARD_AUTOSTART=false

# Log level (debug, info, warn, error)
LOG_LEVEL=info
```

## 📖 Usage

### Pages

- **Overview** (`/`) - Dashboard summary with key metrics
- **Projects** (`/projects`) - Per-project breakdown with costs
- **Activity** (`/activity`) - Daily activity charts and patterns
- **Tokens** (`/tokens`) - Token usage breakdown by type and model
- **Costs** (`/costs`) - Cost analysis and trends
- **System** (`/system`) - Performance metrics and system health

### API Endpoints

- `GET /api/dashboard-data` - Full dashboard data
- `GET /api/health` - Server health and session state
- `GET /api/metrics` - Performance metrics
- `GET /api/events` - SSE endpoint for real-time updates

### Health Monitoring

Check server status:
```bash
curl http://localhost:3000/api/health | jq
```

Example response:
```json
{
  "status": "ACTIVE",
  "uptime": 3600,
  "activeSessions": [
    {
      "projectId": "C--Users-arayu-projects-foo",
      "sessionId": "abc123",
      "lastActivity": "2026-02-09T21:30:00.000Z"
    }
  ],
  "graceTimer": {
    "active": false,
    "remainingMs": 0,
    "remainingMinutes": 0
  },
  "connectedClients": 2,
  "serverPid": 12345,
  "performance": {
    "parseTimeMs": 93,
    "cacheHitRate": 0.8
  }
}
```

## 🔧 Development

### Commands

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
```

### Project Structure

```
src/
├── app/
│   ├── api/              # API routes
│   │   ├── dashboard-data/
│   │   ├── events/       # SSE endpoint
│   │   ├── health/       # Health check
│   │   └── metrics/      # Performance metrics
│   ├── components/       # React components
│   ├── projects/         # Projects page
│   ├── activity/         # Activity page
│   ├── tokens/           # Tokens page
│   ├── costs/            # Costs page
│   ├── system/           # System metrics page
│   └── layout.tsx        # Root layout
├── lib/
│   ├── server/
│   │   ├── dashboard.ts        # Data aggregation
│   │   ├── parsers.ts          # JSONL parsers
│   │   ├── pricing.ts          # Cost calculations
│   │   ├── watcher.ts          # File watcher
│   │   ├── session-tracker.ts  # Session lifecycle
│   │   ├── pid-manager.ts      # Single instance lock
│   │   ├── config.ts           # Configuration loader
│   │   └── sse-manager.ts      # SSE broadcasting
│   └── client/
│       └── use-sse.ts          # SSE React hook
└── instrumentation.ts          # Server startup hook
```

### Performance Features

The dashboard includes several performance optimizations:

1. **Streaming JSONL Parser**: Uses Node.js readline for memory-efficient parsing
2. **Worker Processes**: Parallel file processing using `child_process.spawn()` with IPC
3. **Smart Caching**: mtime-based caching skips unchanged projects
4. **Concurrent I/O**: Processes up to 16 JSONL files in parallel per worker

Feature flags:
```bash
USE_WORKERS=false npm run dev  # Disable worker processes
USE_CACHE=false npm run dev    # Disable caching
```

## 🎨 Tech Stack

- **Framework**: Next.js 16 (App Router)
- **UI**: React 19, Tailwind CSS 4
- **Language**: TypeScript (strict mode)
- **Data Flow**: SSE for real-time updates
- **File Watching**: Chokidar
- **Build**: Turbopack

## 🐛 Troubleshooting

### Dashboard won't start
```bash
# Check if another instance is running
cat ~/.claude/.dashboard-pid

# If stale, remove the lock file
rm ~/.claude/.dashboard-pid
```

### Port already in use
```bash
# Change the port
PORT=3001 npm run dev
```

### No data showing
- Verify `~/.claude/` directory exists and contains session data
- Check browser console for errors
- Ensure stats-cache.json exists: `ls -la ~/.claude/stats-cache.json`

### Development mode (disable auto-shutdown)
```bash
DASHBOARD_DISABLE_SHUTDOWN=true npm run dev
```

## 📝 License

MIT

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 🙏 Acknowledgments

Built with [Next.js](https://nextjs.org/), powered by [Claude](https://claude.ai/).
