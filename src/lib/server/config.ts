import { readFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import type { DashboardConfig } from '../types';

interface UserConfig {
  gracePeriodMinutes?: number;
  sessionIdleTimeoutSeconds?: number;
  autoStart?: boolean;
  disableShutdown?: boolean;
  port?: number;
  logLevel?: string;
}

export function loadConfig(): DashboardConfig {
  const configPath = join(homedir(), '.claude', '.dashboard-config.json');
  let userConfig: UserConfig = {};

  // Try to load user config file
  try {
    const content = readFileSync(configPath, 'utf-8');
    userConfig = JSON.parse(content);
    console.log('[Config] Loaded user config from', configPath);
  } catch {
    // Use defaults (no config file is OK)
  }

  // Priority: ENV > File > Defaults
  return {
    gracePeriodMs: parseInt(process.env.DASHBOARD_GRACE_PERIOD_MS || '') ||
                   (userConfig.gracePeriodMinutes ? userConfig.gracePeriodMinutes * 60000 : 1800000),

    sessionIdleTimeoutMs: parseInt(process.env.DASHBOARD_SESSION_IDLE_TIMEOUT_MS || '') ||
                         (userConfig.sessionIdleTimeoutSeconds ? userConfig.sessionIdleTimeoutSeconds * 1000 : 30000),

    autoStart: process.env.DASHBOARD_AUTOSTART === 'true' ||
               userConfig.autoStart !== false,

    disableShutdown: process.env.DASHBOARD_DISABLE_SHUTDOWN === 'true' ||
                     userConfig.disableShutdown === true,

    port: parseInt(process.env.PORT || '') ||
          userConfig.port ||
          3000,

    logLevel: (process.env.LOG_LEVEL as any) ||
              userConfig.logLevel ||
              'info',
  };
}
