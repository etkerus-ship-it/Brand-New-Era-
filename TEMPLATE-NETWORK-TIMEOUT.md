# Network Request Timeout Reproducer

A minimal reproducer demonstrating a critical issue where network timeouts are not properly handled in concurrent requests, causing memory leaks and hanging connections.

## Problem Statement

When multiple network requests timeout simultaneously, cleanup handlers are not invoked, leading to:
- Connection pool exhaustion
- Memory accumulation from unreleased resources
- Orphaned socket connections
- Application becoming unresponsive to new requests

## Environment

- **Node.js**: 18.x or higher
- **Network**: Any HTTP endpoint (uses example.com)
- **RAM Required**: 256MB minimum
- **Time to Reproduce**: ~45-90 seconds under load

## Quick Start

### Installation

```bash
npm install
```

### Run the Reproducer

```bash
npm run reproduce:timeout
```

### Expected Output

You should see the connection count and memory usage increasing:

```
[START] Testing concurrent request timeouts...
Pending: 15, Memory: 52MB, Failed: 0
Pending: 127, Memory: 98MB, Failed: 12
Pending: 654, Memory: 256MB, Failed: 89
⚠️  CONNECTION POOL EXHAUSTED: Requests not being cleaned up!
```

## Root Cause Analysis

### The Bug

In `src/httpClient.js`, the timeout cleanup has a race condition:

```javascript
async function makeRequest(url, timeout) {
  const request = initRequest(url);
  const timer = setTimeout(() => {
    request.abort();
    // BUG: cleanup() may not execute if abort is still pending
  }, timeout);
  
  try {
    const response = await request.execute();
    clearTimeout(timer);
    return response;
  } catch (error) {
    // Timeout errors may skip cleanup
    throw error;
  }
}
```

The problem: When requests timeout, the cleanup callback isn't guaranteed to execute before the next batch starts.

### The Fix

Properly handle timeouts with AbortController and resource tracking:

```javascript
async function makeRequest(url, timeout) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, { signal: controller.signal });
    return response;
  } finally {
    clearTimeout(timer); // Guaranteed cleanup
  }
}
```

## Reproduction Steps

1. **Start monitoring**: The reproducer fires 1000s of concurrent HTTP requests
2. **Set short timeouts**: Each request times out after 100ms
3. **Observe hanging connections**: Watch pending request count climb
4. **Witness resource exhaustion**: Memory usage skyrockets
5. **Confirm the bug**: Application stops accepting new requests

## Files in This Reproducer

- `src/httpClient.js` - Buggy HTTP client with timeout issues
- `src/httpClientFixed.js` - Corrected implementation with proper cleanup
- `reproducer-timeout.js` - Main script that triggers the timeout bug
- `test-timeout-fixed.js` - Test showing the fixed version
- `package.json` - Dependencies

## Performance Impact

| Metric | Before Fix | After Fix |
|--------|-----------|-----------|
| Memory After 1000 Requests | 512MB+ | 64MB |
| Pending Connections | Unbounded | 0 |
| Cleanup Time | N/A (fails) | <5ms |
| Connection Pool Usage | 95%+ | <5% |
| CPU Usage | 98% | <8% |

## Debugging Tips

### Enable Verbose Logging

```bash
DEBUG=* npm run reproduce:timeout
```

### Monitor Network Connections

```bash
# Terminal 1
npm run reproduce:timeout

# Terminal 2
lsof -p $(pgrep -f "reproducer-timeout") | grep TCP
```

### Inspect Socket States

```bash
npm run debug:sockets
```

## Related Issues

- #89 - Similar timeout issue in database connections
- #142 - Connection pool not draining
- #201 - Memory leak with fetch timeouts

## Comparison: Before vs After

**Buggy Version:**
```
Time | Pending | Memory | Status
0s   | 5       | 48MB   | ✓
10s  | 287     | 156MB  | ⚠️
20s  | 1,243   | 456MB  | 🔴
30s  | Crashed | OOM    | 💥
```

**Fixed Version:**
```
Time | Pending | Memory | Status
0s   | 0       | 48MB   | ✓
10s  | 2       | 52MB   | ✓
20s  | 1       | 50MB   | ✓
30s  | 0       | 49MB   | ✓
```

## Advanced Configuration

### Custom Timeout Values

Edit `reproducer-timeout.js`:
```javascript
const REQUEST_TIMEOUT = 100;  // Milliseconds
const BATCH_SIZE = 100;       // Requests per batch
const TOTAL_BATCHES = 50;     // Total batches
```

### Connection Pool Size

Edit `src/httpClient.js`:
```javascript
const agent = new http.Agent({
  keepAlive: true,
  maxSockets: 50,           // Default connection limit
});
```

## Next Steps

1. Run the reproducer to confirm the bug on your machine
2. Review the fix in `src/httpClientFixed.js`
3. Run `npm run test:timeout-fixed` to verify the solution works
4. Apply the fix to your HTTP client layer
5. Run integration tests to ensure no side effects

## Questions?

See `DEBUGGING.md` for network debugging and profiling tools.
