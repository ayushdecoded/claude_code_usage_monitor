#!/usr/bin/env node

/**
 * Claude Usage Dashboard - Interactive Setup Wizard
 *
 * This script handles two installation modes:
 * 1. Pre-cloned: Run from within an already cloned repository
 * 2. Fresh install: Clone the repository and set up from scratch
 *
 * Features:
 * - Automatic repository cloning
 * - Dependency installation
 * - Auto-start hook configuration
 * - User preferences setup
 * - System testing and verification
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn, execSync } = require('child_process');

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
  bgBlue: '\x1b[44m',
  bgGreen: '\x1b[42m',
};

// Utility functions
const log = (text, color = 'reset') => {
  console.log(`${colors[color]}${text}${colors.reset}`);
};

const header = (text) => {
  console.log('\n');
  log('═'.repeat(60), 'cyan');
  log(`  ${text}`, 'cyan');
  log('═'.repeat(60), 'cyan');
  console.log('');
};

const success = (text) => log(`✓ ${text}`, 'green');
const error = (text) => log(`✗ ${text}`, 'red');
const warning = (text) => log(`⚠ ${text}`, 'yellow');
const info = (text) => log(`ℹ ${text}`, 'blue');
const step = (num, text) => log(`${num}. ${text}`, 'bright');

const isWindows = process.platform === 'win32';
const isUnix = !isWindows;
const claudePath = path.join(os.homedir(), '.claude');
const hooksPath = path.join(claudePath, 'hooks');
const configPath = path.join(claudePath, '.dashboard-config.json');
const pidPath = path.join(claudePath, '.dashboard-pid');

// Pause for reading
const pause = (ms = 1000) => new Promise(resolve => setTimeout(resolve, ms));

// Check if file exists
const fileExists = (filePath) => {
  try {
    return fs.statSync(filePath).isFile();
  } catch {
    return false;
  }
};

// Check if directory exists
const dirExists = (dirPath) => {
  try {
    return fs.statSync(dirPath).isDirectory();
  } catch {
    return false;
  }
};

// Create directory recursively
const ensureDir = (dirPath) => {
  if (!dirExists(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

// Prompt user for yes/no
const promptYesNo = (question) => {
  return new Promise((resolve) => {
    log(question + ' (y/n): ', 'bright');
    process.stdin.once('data', (data) => {
      const answer = data.toString().trim().toLowerCase();
      resolve(answer === 'y' || answer === 'yes');
    });
  });
};

// Prompt user for text input
const promptText = (question, defaultValue = '') => {
  return new Promise((resolve) => {
    const prompt = defaultValue ? `${question} [${defaultValue}]: ` : `${question}: `;
    log(prompt, 'bright');
    process.stdin.once('data', (data) => {
      const answer = data.toString().trim();
      resolve(answer || defaultValue);
    });
  });
};

// Installation state
let installationMode = 'unknown'; // 'pre-cloned' or 'fresh'
let projectDirectory = path.resolve(__dirname);

// Get the project directory
const getProjectDirectory = () => {
  return projectDirectory;
};

// Detect if running from a cloned repo
const isPreCloned = () => {
  const packageJsonPath = path.join(__dirname, 'package.json');
  const nextConfigPath = path.join(__dirname, 'next.config.ts');

  if (fileExists(packageJsonPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
      if (pkg.name === 'claude-usage-dashboard-next') {
        return true;
      }
    } catch {}
  }

  return fileExists(nextConfigPath);
};

// Clone the repository
const cloneRepository = async (targetDir, repoUrl) => {
  info(`Cloning repository to ${targetDir}...`);

  return new Promise((resolve, reject) => {
    const git = spawn('git', ['clone', repoUrl, targetDir], {
      stdio: 'inherit'
    });

    git.on('close', (code) => {
      if (code === 0) {
        success('Repository cloned successfully');
        projectDirectory = targetDir;
        resolve(true);
      } else {
        error('Failed to clone repository');
        reject(new Error('Git clone failed'));
      }
    });
  });
};

// Check if git is installed
const hasGit = () => {
  try {
    execSync('git --version', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
};

// Register hook in Claude Code settings
const registerHook = async () => {
  const settingsPath = path.join(claudePath, 'settings.json');

  // Read existing settings (or create empty object)
  let settings = {};
  if (fileExists(settingsPath)) {
    try {
      const content = fs.readFileSync(settingsPath, 'utf-8');
      settings = JSON.parse(content);
    } catch (err) {
      warning('Could not parse settings.json, creating new configuration');
      settings = {};
    }
  }

  // Check if SessionStart hook already exists
  if (settings.hooks?.SessionStart && settings.hooks.SessionStart.length > 0) {
    const overwrite = await promptYesNo('SessionStart hook already configured. Overwrite?');
    if (!overwrite) {
      info('Keeping existing SessionStart hook configuration');
      return;
    }
  }

  // Prepare hook command based on platform
  const hookCommand = isWindows
    ? `powershell -NoProfile -ExecutionPolicy Bypass -File "$env:USERPROFILE\\.claude\\hooks\\sessionStart.ps1"`
    : `$HOME/.claude/hooks/sessionStart.sh`;

  // Create hooks section if it doesn't exist
  if (!settings.hooks) {
    settings.hooks = {};
  }

  // Add SessionStart hook configuration
  settings.hooks.SessionStart = [{
    matcher: 'startup|resume',
    hooks: [{
      type: 'command',
      command: hookCommand
    }]
  }];

  // Write back to settings.json
  try {
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
    success('Hook registered in Claude Code settings');
  } catch (err) {
    error('Failed to register hook in settings: ' + err.message);
    warning('You may need to manually add the hook to settings.json');
  }
};

// Setup hooks
const setupHooks = async () => {
  header('Setting Up Auto-Start Hooks');

  ensureDir(hooksPath);

  if (isWindows) {
    // Windows PowerShell hook
    const psHookPath = path.join(hooksPath, 'sessionStart.ps1');
    const projectRoot = getProjectDirectory().replace(/\\/g, '\\\\');

    const psContent = `# Claude Code SessionStart Hook - Windows
# Auto-starts dashboard when Claude Code session begins

$pidFile = "$env:USERPROFILE\\.claude\\.dashboard-pid"
$projectRoot = "${projectRoot}"

# Check if dashboard is already running
if (Test-Path $pidFile) {
    try {
        $lock = Get-Content $pidFile | ConvertFrom-Json
        $process = Get-Process -Id $lock.pid -ErrorAction SilentlyContinue

        if ($process) {
            Write-Host "[Dashboard] Already running on port $($lock.port)" -ForegroundColor Green
            exit 0
        }
    } catch {
        # Stale lock, continue to start
    }
}

# Start dashboard in background
Write-Host "[Dashboard] Starting usage dashboard..." -ForegroundColor Cyan

try {
    $startInfo = New-Object System.Diagnostics.ProcessStartInfo
    $startInfo.FileName = "npm"
    $startInfo.Arguments = "run dev"
    $startInfo.WorkingDirectory = $projectRoot
    $startInfo.WindowStyle = [System.Diagnostics.ProcessWindowStyle]::Hidden
    $startInfo.CreateNoWindow = $true

    [System.Diagnostics.Process]::Start($startInfo) | Out-Null

    # Wait for server to start
    $timeout = 10
    $elapsed = 0
    while (-not (Test-Path $pidFile) -and $elapsed -lt $timeout) {
        Start-Sleep -Milliseconds 500
        $elapsed += 0.5
    }

    if (Test-Path $pidFile) {
        $lock = Get-Content $pidFile | ConvertFrom-Json
        Write-Host "[Dashboard] Started on http://localhost:$($lock.port)" -ForegroundColor Green
    } else {
        Write-Host "[Dashboard] Started but PID file not found" -ForegroundColor Yellow
    }
} catch {
    Write-Host "[Dashboard] Failed to start: $_" -ForegroundColor Red
}`;

    fs.writeFileSync(psHookPath, psContent);
    success(`PowerShell hook created at ${psHookPath}`);
  } else {
    // Unix Bash hook
    const bashHookPath = path.join(hooksPath, 'sessionStart.sh');
    const projectRoot = getProjectDirectory();

    const bashContent = `#!/bin/bash
# Claude Code SessionStart Hook - Unix
# Auto-starts dashboard when Claude Code session begins

PID_FILE="$HOME/.claude/.dashboard-pid"
PROJECT_ROOT="${projectRoot}"

# Check if dashboard is already running
if [ -f "$PID_FILE" ]; then
    PID=$(jq -r '.pid' "$PID_FILE" 2>/dev/null)
    PORT=$(jq -r '.port' "$PID_FILE" 2>/dev/null)

    if [ -n "$PID" ] && kill -0 "$PID" 2>/dev/null; then
        echo "[Dashboard] ✓ Already running on port $PORT"
        exit 0
    fi
fi

# Start dashboard in background
echo "[Dashboard] 🚀 Starting usage dashboard..."

cd "$PROJECT_ROOT" || exit 1
npm run dev > "$HOME/.claude/dashboard-startup.log" 2>&1 &

# Wait for server to start
timeout=10
elapsed=0
while [ ! -f "$PID_FILE" ] && [ $elapsed -lt $timeout ]; do
    sleep 0.5
    elapsed=$((elapsed + 1))
done

if [ -f "$PID_FILE" ]; then
    PORT=$(jq -r '.port' "$PID_FILE")
    echo "[Dashboard] ✓ Started on http://localhost:$PORT"
else
    echo "[Dashboard] ⚠️  Started but PID file not found"
fi`;

    fs.writeFileSync(bashHookPath, bashContent);
    fs.chmodSync(bashHookPath, 0o755);
    success(`Bash hook created at ${bashHookPath}`);
  }

  // Register the hook in Claude Code settings
  await registerHook();
};

// Setup configuration
const setupConfig = async () => {
  header('Configuration Setup');

  if (fileExists(configPath)) {
    const overwrite = await promptYesNo('Configuration file already exists. Overwrite?');
    if (!overwrite) {
      info('Keeping existing configuration');
      return;
    }
  }

  info('Configure the dashboard (or press Enter for defaults):');
  console.log('');

  const gracePeriodMinutes = await promptText('Grace period after all sessions close (minutes)', '30');
  const sessionIdleSeconds = await promptText('Session idle timeout (seconds)', '30');
  const port = await promptText('Server port', '3000');
  const disableShutdown = await promptYesNo('Disable auto-shutdown (development mode)?');

  const config = {
    gracePeriodMinutes: parseInt(gracePeriodMinutes),
    sessionIdleTimeoutSeconds: parseInt(sessionIdleSeconds),
    autoStart: true,
    disableShutdown,
    port: parseInt(port),
    logLevel: 'info'
  };

  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  success(`Configuration saved to ${configPath}`);
  console.log('');
  log(JSON.stringify(config, null, 2), 'dim');
};

// Verify Node.js and npm
const verifyDependencies = () => {
  header('Verifying Dependencies');

  // Check Node.js
  const nodeVersion = process.version;
  const nodeMajor = parseInt(nodeVersion.split('.')[0].slice(1));

  if (nodeMajor >= 18) {
    success(`Node.js ${nodeVersion}`);
  } else {
    error(`Node.js ${nodeVersion} - Requires Node.js 18 or higher`);
    process.exit(1);
  }

  // Check npm
  try {
    const { execSync } = require('child_process');
    const npmVersion = execSync('npm --version', { encoding: 'utf-8' }).trim();
    success(`npm ${npmVersion}`);
  } catch {
    error('npm not found');
    process.exit(1);
  }

  // Check Claude path
  if (dirExists(claudePath)) {
    success(`Claude Code path: ${claudePath}`);
  } else {
    warning(`Claude Code path not found at ${claudePath}`);
    warning('This is OK if you haven\'t used Claude Code yet');
  }
};

// Check Node modules
const checkNodeModules = () => {
  const nodeModulesPath = path.join(getProjectDirectory(), 'node_modules');
  if (!dirExists(nodeModulesPath)) {
    warning('node_modules not found. Will install dependencies...');
    return false;
  }
  return true;
};

// Install npm dependencies
const installDependencies = async () => {
  header('Installing Dependencies');

  if (checkNodeModules()) {
    success('Dependencies already installed');
    return true;
  }

  info('Running: npm install');
  info('This may take a few minutes...');
  console.log('');

  return new Promise((resolve) => {
    const npm = spawn(isWindows ? 'npm.cmd' : 'npm', ['install'], {
      cwd: getProjectDirectory(),
      stdio: 'inherit',
      shell: true
    });

    npm.on('close', (code) => {
      console.log('');
      if (code === 0) {
        success('Dependencies installed');
        resolve(true);
      } else {
        error('Failed to install dependencies');
        error('Please try running manually: npm install');
        resolve(false);
      }
    });

    npm.on('error', (err) => {
      error('Failed to run npm install: ' + err.message);
      resolve(false);
    });
  });
};

// Test the setup
const testSetup = async () => {
  header('Testing Setup');

  info('Checking PID lock file location...');
  const pidDir = path.dirname(pidPath);
  if (dirExists(pidDir)) {
    success(`PID directory exists: ${pidDir}`);
  } else {
    warning(`PID directory will be created on first run: ${pidDir}`);
  }

  info('Checking hooks...');
  if (isWindows) {
    const psHook = path.join(hooksPath, 'sessionStart.ps1');
    if (fileExists(psHook)) {
      success(`PowerShell hook ready: ${psHook}`);
    } else {
      error('PowerShell hook not found');
    }
  } else {
    const bashHook = path.join(hooksPath, 'sessionStart.sh');
    if (fileExists(bashHook)) {
      success(`Bash hook ready: ${bashHook}`);
    } else {
      error('Bash hook not found');
    }
  }

  info('Configuration file...');
  if (fileExists(configPath)) {
    success(`Configuration ready: ${configPath}`);
  } else {
    warning('No configuration file - using defaults');
  }

  info('Hook registration...');
  const settingsPath = path.join(claudePath, 'settings.json');
  if (fileExists(settingsPath)) {
    try {
      const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
      if (settings.hooks?.SessionStart) {
        success('SessionStart hook registered in settings.json');
      } else {
        warning('Hook not registered in settings.json');
      }
    } catch {
      warning('Could not verify hook registration');
    }
  } else {
    warning('settings.json not found');
  }
};

// Show next steps
const showNextSteps = () => {
  header('Setup Complete! 🎉');

  console.log('');
  log('Next Steps:', 'bright');
  console.log('');

  if (isWindows) {
    log('1. Claude Code Auto-Start (Optional)', 'yellow');
    log('   The PowerShell hook is ready at:', 'dim');
    log(`   ${path.join(hooksPath, 'sessionStart.ps1')}`, 'dim');
    log('   Claude Code will automatically run it when you start a session.', 'dim');
    console.log('');
  } else {
    log('1. Claude Code Auto-Start (Optional)', 'yellow');
    log('   The Bash hook is ready at:', 'dim');
    log(`   ${path.join(hooksPath, 'sessionStart.sh')}`, 'dim');
    log('   Claude Code will automatically run it when you start a session.', 'dim');
    console.log('');
  }

  log('2. Start the Dashboard', 'yellow');
  log('   Run:', 'dim');
  log('   npm run dev', 'blue');
  log('   Then open http://localhost:3000 in your browser', 'dim');
  console.log('');

  log('3. Monitor Health', 'yellow');
  log('   Check server status:', 'dim');
  log('   curl http://localhost:3000/api/health | jq', 'blue');
  console.log('');

  log('4. Customize Configuration (Optional)', 'yellow');
  log('   Edit:', 'dim');
  log(`   ${configPath}`, 'blue');
  log('   Changes take effect on next restart.', 'dim');
  console.log('');

  log('5. Documentation', 'yellow');
  log('   See README.md for detailed information:', 'dim');
  log('   - Advanced configuration options', 'dim');
  log('   - Performance tuning', 'dim');
  log('   - Troubleshooting guide', 'dim');
  console.log('');

  log('═'.repeat(60), 'cyan');
  log('Happy coding! Your dashboard is ready 🚀', 'green');
  log('═'.repeat(60), 'cyan');
};

// Select installation mode
const selectInstallationMode = async () => {
  header('Installation Mode');

  if (isPreCloned()) {
    info('Detected: Running from cloned repository');
    installationMode = 'pre-cloned';
    success('Using existing repository at: ' + projectDirectory);
    return;
  }

  info('This installer can be run in two ways:');
  console.log('');
  log('  1. Fresh Install - Clone and set up the repository', 'bright');
  log('  2. Pre-Cloned - Set up an existing clone', 'bright');
  console.log('');

  const mode = await promptText('Select mode (1 or 2)', '1');

  if (mode === '1') {
    installationMode = 'fresh';
    await handleFreshInstall();
  } else {
    installationMode = 'pre-cloned';
    await handlePreClonedInstall();
  }
};

// Handle fresh installation (clone repo)
const handleFreshInstall = async () => {
  header('Fresh Installation');

  // Check git
  if (!hasGit()) {
    error('Git is not installed. Please install Git first:');
    info('Windows: https://git-scm.com/download/win');
    info('macOS: brew install git');
    info('Linux: sudo apt install git');
    process.exit(1);
  }
  success('Git detected');

  // Get repository URL
  console.log('');
  info('Enter the repository URL:');
  const defaultRepo = 'https://github.com/yourusername/claude-usage-dashboard-next.git';
  const repoUrl = await promptText('Repository URL', defaultRepo);

  // Get installation directory
  console.log('');
  info('Where should the dashboard be installed?');
  const defaultDir = path.join(os.homedir(), 'claude-usage-dashboard-next');
  const targetDir = await promptText('Installation directory', defaultDir);

  // Check if directory exists
  if (dirExists(targetDir)) {
    warning(`Directory already exists: ${targetDir}`);
    const overwrite = await promptYesNo('Continue anyway? (will fail if not empty)');
    if (!overwrite) {
      info('Installation cancelled');
      process.exit(0);
    }
  }

  // Clone repository
  try {
    await cloneRepository(targetDir, repoUrl);
    success('Repository cloned to: ' + targetDir);
  } catch (err) {
    error('Failed to clone repository: ' + err.message);
    process.exit(1);
  }
};

// Handle pre-cloned installation
const handlePreClonedInstall = async () => {
  header('Pre-Cloned Setup');

  info('Enter the path to the cloned repository:');
  const defaultPath = process.cwd();
  const repoPath = await promptText('Repository path', defaultPath);

  if (!dirExists(repoPath)) {
    error(`Directory not found: ${repoPath}`);
    process.exit(1);
  }

  const packageJsonPath = path.join(repoPath, 'package.json');
  if (!fileExists(packageJsonPath)) {
    error('package.json not found. This does not appear to be a valid repository.');
    process.exit(1);
  }

  projectDirectory = path.resolve(repoPath);
  success('Using repository at: ' + projectDirectory);
};

// Main installation flow
const main = async () => {
  console.clear();

  log('╔' + '═'.repeat(58) + '╗', 'cyan');
  log('║' + ' '.repeat(10) + 'Claude Usage Dashboard Setup' + ' '.repeat(21) + '║', 'cyan');
  log('╚' + '═'.repeat(58) + '╝', 'cyan');

  await pause(500);

  try {
    // Enable raw mode for prompts (if stdin is a TTY)
    const isTTY = process.stdin.isTTY;
    if (isTTY) {
      process.stdin.setRawMode(true);
      process.stdin.resume();
    }

    // Select installation mode
    await selectInstallationMode();
    await pause(500);

    if (isTTY) {
      process.stdin.setRawMode(false);
    }

    // Verify system dependencies
    verifyDependencies();
    await pause(1000);

    // Install npm dependencies
    const installed = await installDependencies();
    if (!installed) {
      error('Installation failed. Please run: npm install');
      process.exit(1);
    }
    await pause(1000);

    // Set up hooks
    await setupHooks();
    await pause(500);

    // Enable raw mode for config prompts (if stdin is a TTY)
    if (isTTY) {
      process.stdin.setRawMode(true);
      process.stdin.resume();
    }

    // Configure dashboard
    await setupConfig();

    if (isTTY) {
      process.stdin.setRawMode(false);
    }

    await pause(500);

    // Test the setup
    await testSetup();
    await pause(500);

    // Show next steps
    showNextSteps();

    process.exit(0);
  } catch (err) {
    console.error('');
    error('Setup failed: ' + err.message);
    if (err.stack) {
      log(err.stack, 'dim');
    }
    process.exit(1);
  }
};

// Run installer
main();
