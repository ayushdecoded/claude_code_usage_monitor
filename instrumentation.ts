/**
 * Next.js instrumentation hook - runs once on server startup.
 * Used to initialize singleton services like file watchers and data stores.
 */

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Check PID lock first
    const { pidManager } = await import('./src/lib/server/pid-manager');
    const port = parseInt(process.env.PORT || '3000');
    const canStart = await pidManager.checkAndClaimLock(port);

    if (!canStart) {
      const existing = await pidManager.getExistingServer();
      console.log(`╔════════════════════════════════════════╗`);
      console.log(`║  Dashboard Already Running             ║`);
      console.log(`║  Port: ${existing?.port || '3000'}                              ║`);
      console.log(`║  PID: ${existing?.pid || 'unknown'}                             ║`);
      console.log(`╚════════════════════════════════════════╝`);
      process.exit(0);
    }

    // Lazy-load server-only dependencies
    const { initializeWatcher } = await import('./src/lib/server/watcher');
    const { initializeDataStore } = await import('./src/lib/server/dashboard');
    const { loadConfig } = await import('./src/lib/server/config');

    // Initialize services once on server startup
    await initializeDataStore();
    await initializeWatcher();

    const config = loadConfig();

    // Startup notification
    console.log(`╔═══════════════════════════════════════════════╗`);
    console.log(`║  🚀 Claude Usage Dashboard                    ║`);
    console.log(`║  📊 Running at http://localhost:${port}          ║`);
    console.log(`║  ⏱️  Grace period: ${config.gracePeriodMs / 60000} minutes after last close  ║`);
    console.log(`║  🔒 Single instance enforced                   ║`);
    if (config.disableShutdown) {
      console.log(`║  ⚠️  Auto-shutdown disabled (dev mode)         ║`);
    }
    console.log(`╚═══════════════════════════════════════════════╝`);

    // Cleanup on exit
    const cleanup = async () => {
      console.log('[Dashboard] Shutting down gracefully...');
      const { sessionTracker } = await import('./src/lib/server/session-tracker');
      sessionTracker.destroy();
      await pidManager.release();
      process.exit(0);
    };

    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);
  }
}
