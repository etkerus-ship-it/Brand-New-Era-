# Debugging Guide

## Quick Diagnostics

### Run the Reproducer with Garbage Collection

```bash
node --expose-gc reproducer.js
```

The `--expose-gc` flag enables manual garbage collection, making memory leaks more visible.

### Enable Debug Output

```bash
DEBUG=* npm run reproduce
```

This enables all debug logs from the event emitter.

### Monitor Memory in Real-time

```bash
# Terminal 1
node --expose-gc reproducer.js

# Terminal 2
watch -n 0.5 'ps aux | grep node'
```

## Understanding the Output

### Memory Usage Columns

- **Handlers**: Number of uncleaned event listeners still in memory
- **Memory (MB)**: Heap memory usage in megabytes
- **Status**: 
  - `✓ OK`: < 50 handlers
  - `⚠️ LEAK DETECTED`: 50-200 handlers
  - `🔴 CRITICAL`: > 200 handlers

### Expected vs Actual

**Expected (Fixed Version):**
```
Iteration | Handlers | Memory (MB) | Status
0         | 0        | 45         | ✅ CLEAN
10        | 0        | 45         | ✅ CLEAN
20        | 0        | 46         | ✅ CLEAN
```

**Actual (Buggy Version):**
```
Iteration | Handlers | Memory (MB) | Status
0         | 12       | 48         | ⚠️ LEAK DETECTED
10        | 87       | 92         | ⚠️ LEAK DETECTED
20        | 243      | 187        | 🔴 CRITICAL
```

## Analyzing Heap Dumps

### Generate a Heap Dump

```bash
npm run heap-dump
```

This creates a heap snapshot you can analyze in Chrome DevTools.

### Inspect the Heap

1. Open Chrome and navigate to `chrome://inspect`
2. Click "Open dedicated DevTools for Node"
3. Load the heap dump file
4. Search for "BuggyEventEmitter" to see retained listeners

## Common Issues

### Issue 1: Script Hangs or Crashes

**Cause**: Memory grows too large, Node.js runs out of heap space

**Solution**: 
```bash
node --max-old-space-size=4096 reproducer.js
```

### Issue 2: Handlers Not Growing

**Cause**: Event loop is optimized, race condition doesn't trigger

**Solution**: Increase concurrency
```javascript
// In reproducer.js, increase the loop
for (let i = 0; i < maxIterations * 100; i++) { // Increased from 10
```

### Issue 3: Memory Doesn't Decrease After Fix

**Cause**: Garbage collection hasn't run yet

**Solution**: 
```bash
node --expose-gc test-fixed.js
```

The `--expose-gc` flag enables `global.gc()` calls.

## Profiling the Code

### CPU Profile

```bash
node --prof reproducer.js
node --prof-process isolate-*.log > profile.txt
```

### Flame Graph

Use [0x](https://github.com/davidmarkclements/0x):

```bash
npx 0x reproducer.js
```

This opens an interactive flame graph in your browser.

## Comparing Versions

### Side-by-Side Test

```bash
echo "=== BUGGY VERSION ===" && npm run reproduce
echo -e "\n=== FIXED VERSION ===" && npm run test:fixed
```

### Memory Comparison Chart

Create a file `compare.js`:

```javascript
const BuggyEmitter = require('./src/buggyVersion');
const FixedEmitter = require('./src/fixedVersion');

async function compare() {
  const buggy = new BuggyEmitter();
  const fixed = new FixedEmitter();

  console.log('Events | Buggy (MB) | Fixed (MB) | Diff');
  
  for (let i = 0; i < 100; i += 10) {
    // Fire i events
    for (let j = 0; j < i; j++) {
      buggy.processEvent('test', {});
      fixed.processEvent('test', {});
    }
    
    console.log(
      `${i} | ${buggy.getMemoryUsage()} | ${fixed.getMemoryUsage()} | ${buggy.getMemoryUsage() - fixed.getMemoryUsage()}`
    );
  }
}

compare();
```

## Environment Details

```bash
node --version
npm --version
uname -a
free -h  # or 'vm_stat' on macOS
```

## Getting Help

If the reproducer doesn't work as expected:

1. Check Node.js version: `node --version` (must be >= 18.0.0)
2. Verify debug module is installed: `npm list debug`
3. Run with maximum verbosity: `DEBUG=* node --expose-gc reproducer.js`
4. Check system resources: `top` or `Activity Monitor`

## Next Steps

After confirming the bug:

1. Review `src/buggyVersion.js` to understand the race condition
2. Compare with `src/fixedVersion.js` to see the fix
3. Test the fix: `npm run test:fixed`
4. Apply the fix to your codebase
5. Run tests to verify: `npm test`
