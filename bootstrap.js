#!/usr/bin/env node

/**
 * Claude Usage Dashboard - Bootstrap Installer
 *
 * This is a standalone installer that can be downloaded and run without
 * having the repository cloned. It will:
 * 1. Verify system requirements
 * 2. Clone the repository
 * 3. Run the full installation wizard
 *
 * Usage:
 *   curl -o bootstrap.js https://raw.githubusercontent.com/.../bootstrap.js
 *   node bootstrap.js
 *
 * Or one-liner:
 *   node -e "$(curl -fsSL https://raw.githubusercontent.com/.../bootstrap.js)"
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const https = require('https');

// Colors
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
};

const log = (text, color = 'reset') => console.log(`${colors[color]}${text}${colors.reset}`);
const success = (text) => log(`✓ ${text}`, 'green');
const error = (text) => log(`✗ ${text}`, 'red');
const info = (text) => log(`ℹ ${text}`, 'blue');
const warning = (text) => log(`⚠ ${text}`, 'yellow');

// Check if command exists
const hasCommand = (cmd) => {
  try {
    execSync(`${cmd} --version`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
};

// Download file
const downloadFile = (url, dest) => {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (response) => {
      if (response.statusCode === 200) {
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          resolve();
        });
      } else {
        fs.unlink(dest, () => {});
        reject(new Error(`Failed to download: ${response.statusCode}`));
      }
    }).on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
};

// Prompt for input
const prompt = (question) => {
  return new Promise((resolve) => {
    process.stdout.write(question + ' ');
    process.stdin.once('data', (data) => {
      resolve(data.toString().trim());
    });
  });
};

// Main bootstrap
const bootstrap = async () => {
  console.clear();

  log('╔' + '═'.repeat(58) + '╗', 'cyan');
  log('║' + ' '.repeat(8) + 'Claude Usage Dashboard Bootstrap' + ' '.repeat(18) + '║', 'cyan');
  log('╚' + '═'.repeat(58) + '╝', 'cyan');
  console.log('');

  info('This will install Claude Usage Dashboard on your system');
  console.log('');

  // Check Node.js
  log('Checking system requirements...', 'bright');
  console.log('');

  const nodeVersion = process.version;
  const nodeMajor = parseInt(nodeVersion.split('.')[0].slice(1));

  if (nodeMajor >= 18) {
    success(`Node.js ${nodeVersion}`);
  } else {
    error(`Node.js ${nodeVersion} - Requires Node.js 18 or higher`);
    error('Please upgrade Node.js: https://nodejs.org/');
    process.exit(1);
  }

  // Check npm
  if (hasCommand('npm')) {
    const npmVersion = execSync('npm --version', { encoding: 'utf-8' }).trim();
    success(`npm ${npmVersion}`);
  } else {
    error('npm not found');
    process.exit(1);
  }

  // Check git
  if (!hasCommand('git')) {
    error('Git not installed');
    console.log('');
    info('Install Git:');
    info('  Windows: https://git-scm.com/download/win');
    info('  macOS: brew install git');
    info('  Linux: sudo apt install git');
    process.exit(1);
  }
  const gitVersion = execSync('git --version', { encoding: 'utf-8' }).trim();
  success(gitVersion);

  console.log('');
  log('═'.repeat(60), 'cyan');
  console.log('');

  // Get installation preferences
  const repoUrl = await prompt('Repository URL [https://github.com/yourusername/claude-usage-dashboard-next.git]:')
                  || 'https://github.com/yourusername/claude-usage-dashboard-next.git';

  const defaultDir = path.join(os.homedir(), 'claude-usage-dashboard-next');
  const installDir = await prompt(`Installation directory [${defaultDir}]:`) || defaultDir;

  console.log('');
  log('Installation Summary:', 'bright');
  log(`  Repository: ${repoUrl}`, 'dim');
  log(`  Directory:  ${installDir}`, 'dim');
  console.log('');

  const confirm = await prompt('Proceed with installation? (y/n):');
  if (confirm.toLowerCase() !== 'y' && confirm.toLowerCase() !== 'yes') {
    info('Installation cancelled');
    process.exit(0);
  }

  console.log('');
  log('═'.repeat(60), 'cyan');
  console.log('');

  // Check if directory exists
  if (fs.existsSync(installDir)) {
    warning(`Directory already exists: ${installDir}`);
    const overwrite = await prompt('Continue? This may fail if directory is not empty (y/n):');
    if (overwrite.toLowerCase() !== 'y') {
      info('Installation cancelled');
      process.exit(0);
    }
  }

  // Clone repository
  info('Cloning repository...');
  console.log('');

  try {
    execSync(`git clone ${repoUrl} "${installDir}"`, { stdio: 'inherit' });
    console.log('');
    success('Repository cloned successfully');
  } catch (err) {
    console.log('');
    error('Failed to clone repository');
    process.exit(1);
  }

  console.log('');
  log('═'.repeat(60), 'cyan');
  console.log('');

  // Run the main installer
  info('Starting installation wizard...');
  console.log('');

  const installerPath = path.join(installDir, 'install.js');

  const installer = spawn('node', [installerPath], {
    cwd: installDir,
    stdio: 'inherit'
  });

  installer.on('close', (code) => {
    if (code === 0) {
      console.log('');
      log('═'.repeat(60), 'cyan');
      success('Bootstrap complete! 🎉');
      log('═'.repeat(60), 'cyan');
    } else {
      error('Installation failed');
      process.exit(1);
    }
  });
};

// Run bootstrap
bootstrap().catch((err) => {
  console.error('');
  error('Bootstrap failed: ' + err.message);
  process.exit(1);
});
