const FixedEventEmitter = require('./src/fixedVersion');
const debug = require('debug')('test-fixed');

/**
 * TEST FIXED VERSION
 * 
 * Demonstrates the corrected event cleanup with try/finally
 * Run with: npm run test:fixed
 */

async function testFixedVersion() {
  console.log('\n' + '='.repeat(70));
  console.log('✅ TEST: Fixed Event Emitter (with try/finally)');
  console.log('='.repeat(70) + '\n');

  const emitter = new FixedEventEmitter();
  let iteration = 0;
  const maxIterations = 100;

  console.log('Starting fixed version test...\n');
  console.log('Iteration | Handlers | Memory (MB) | Status');
  console.log('-'.repeat(50));

  const interval = setInterval(() => {
    iteration++;
    const handlerCount = emitter.getListenerCount();
    const memoryUsage = emitter.getMemoryUsage();

    const status = handlerCount === 0 ? '✅ CLEAN' : '⚠️  LEAKED';

    console.log(
      `${String(iteration).padEnd(9)} | ${String(handlerCount).padEnd(8)} | ${String(memoryUsage).padEnd(11)} | ${status}`
    );

    if (iteration >= maxIterations) {
      clearInterval(interval);
      console.log('-'.repeat(50));
      console.log('\n📊 FINAL RESULTS:');
      console.log(`   Total Handlers Processed: ${iteration * 10}`);
      console.log(`   Active Handlers: ${emitter.getListenerCount()}`);
      console.log(`   Memory Used: ${emitter.getMemoryUsage()}MB`);
      
      if (emitter.getListenerCount() === 0) {
        console.log(`\n✅ SUCCESS: All handlers properly cleaned up!\n`);
      } else {
        console.log(`\n❌ FAILED: Handlers still in memory!\n`);
      }
      
      console.log('See README.md for comparison and next steps.\n');
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

if (!global.gc) {
  console.warn('⚠️  Tip: Run with "node --expose-gc test-fixed.js" for better visibility\n');
}

testFixedVersion().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
