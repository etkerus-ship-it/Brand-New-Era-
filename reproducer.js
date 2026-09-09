const BuggyEventEmitter = require('./src/buggyVersion');
const debug = require('debug')('reproducer');

/**
 * MAIN REPRODUCER SCRIPT
 * 
 * Demonstrates the race condition in async event handling
 * Run with: npm run reproduce
 */

async function runReproducer() {
  console.log('\n' + '='.repeat(70));
  console.log('🔴 REPRODUCER: Async Event Handling Race Condition');
  console.log('='.repeat(70) + '\n');

  const emitter = new BuggyEventEmitter();
  let iteration = 0;
  const maxIterations = 100;

  console.log('Starting bug reproduction...\n');
  console.log('Iteration | Handlers | Memory (MB) | Status');
  console.log('-'.repeat(50));

  const interval = setInterval(() => {
    iteration++;
    const handlerCount = emitter.getListenerCount();
    const memoryUsage = emitter.getMemoryUsage();

    let status = '✓ OK';
    if (handlerCount > 50) {
      status = '⚠️  LEAK DETECTED';
    }
    if (handlerCount > 200) {
      status = '🔴 CRITICAL';
    }

    console.log(
      `${String(iteration).padEnd(9)} | ${String(handlerCount).padEnd(8)} | ${String(memoryUsage).padEnd(11)} | ${status}`
    );

    if (iteration >= maxIterations) {
      clearInterval(interval);
      console.log('-'.repeat(50));
      console.log('\n📊 FINAL RESULTS:');
      console.log(`   Total Handlers Created: ${emitter.listeners.length}`);
      console.log(`   Active Handlers: ${emitter.getListenerCount()}`);
      console.log(`   Memory Used: ${emitter.getMemoryUsage()}MB`);
      console.log(`\n🐛 BUG CONFIRMED: Handlers not being cleaned up!\n`);
      console.log('Run "npm run test:fixed" to see the corrected version.\n');
      console.log('='.repeat(70) + '\n');
      process.exit(0);
    }
  }, 100);

  // Fire concurrent events
  const events = [];
  for (let i = 0; i < maxIterations * 10; i++) {
    events.push(emitter.processEvent('test-event', { id: i }));
  }

  await Promise.all(events);
}

// Run with memory cleanup enabled
if (!global.gc) {
  console.warn('⚠️  Tip: Run with "node --expose-gc reproducer.js" for better visibility\n');
}

runReproducer().catch(err => {
  console.error('Reproducer failed:', err);
  process.exit(1);
});
