import { promises as fs } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import type { PIDLock } from '../types';

export class PIDManager {
  private pidFile = join(homedir(), '.claude', '.dashboard-pid');
  private heartbeatInterval: NodeJS.Timeout | null = null;

  async checkAndClaimLock(port: number): Promise<boolean> {
    // Check existing lock
    const existing = await this.getExistingServer();
    if (existing && await this.isProcessAlive(existing.pid)) {
      console.log(`[PidManager] Server already running on port ${existing.port} (PID: ${existing.pid})`);
      return false;
    }

    // Clean stale lock
    if (existing) {
      console.log(`[PidManager] Cleaning stale lock (PID ${existing.pid} not running)`);
      await this.release();
    }

    // Claim lock
    const lock: PIDLock = {
      pid: process.pid,
      port,
      startedAt: new Date().toISOString(),
      lastHeartbeat: new Date().toISOString(),
    };

    await fs.writeFile(this.pidFile, JSON.stringify(lock, null, 2));
    this.startHeartbeat();
    console.log(`[PidManager] Lock acquired (PID: ${process.pid}, Port: ${port})`);
    return true;
  }

  async getExistingServer(): Promise<{ pid: number; port: number } | null> {
    try {
      const data = await fs.readFile(this.pidFile, 'utf-8');
      const lock: PIDLock = JSON.parse(data);
      return { pid: lock.pid, port: lock.port };
    } catch {
      return null;
    }
  }

  private async isProcessAlive(pid: number): Promise<boolean> {
    try {
      process.kill(pid, 0); // Signal 0 = check if process exists
      return true;
    } catch {
      return false;
    }
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(async () => {
      try {
        const data = await fs.readFile(this.pidFile, 'utf-8');
        const lock: PIDLock = JSON.parse(data);
        lock.lastHeartbeat = new Date().toISOString();
        await fs.writeFile(this.pidFile, JSON.stringify(lock, null, 2));
      } catch (error) {
        console.error('[PidManager] Heartbeat update failed:', error);
      }
    }, 10000); // Every 10 seconds
  }

  async release(): Promise<void> {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    try {
      await fs.unlink(this.pidFile);
      console.log('[PidManager] Lock released');
    } catch {
      // Ignore errors during cleanup
    }
  }
}

export const pidManager = new PIDManager();
