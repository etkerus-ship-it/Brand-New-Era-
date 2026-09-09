const EventEmitter = require('events');
const debug = require('debug')('reproducer');

/**
 * BUGGY VERSION: Race condition in async event cleanup
 * 
 * The problem: Event listeners are not properly removed when multiple
 * async operations complete simultaneously, causing memory leaks.
 */
class BuggyEventEmitter extends EventEmitter {
  constructor() {
    super();
    this.listeners = [];
    this.activeHandlers = 0;
  }

  registerListener(eventName, handler) {
    const listener = { id: Math.random(), eventName, handler };
    this.listeners.push(listener);
    this.activeHandlers++;
    debug(`Registered listener. Total: ${this.activeHandlers}`);
    return listener;
  }

  // BUG: This doesn't properly clean up in concurrent scenarios
  removeListener(listener) {
    const index = this.listeners.indexOf(listener);
    if (index > -1) {
      this.listeners.splice(index, 1);
      this.activeHandlers--;
    }
  }

  async processEvent(eventName, data) {
    const listener = this.registerListener(eventName, () => {});
    
    try {
      // Simulate async work
      await new Promise(resolve => setImmediate(resolve));
      
      // BUG: In concurrent scenarios, this may not execute
      // because the event loop prioritizes other operations
      this.removeListener(listener);
    } catch (err) {
      // Cleanup may be skipped on error
      console.error('Error processing event:', err);
    }
  }

  getMemoryUsage() {
    if (global.gc) {
      global.gc();
    }
    return Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
  }

  getListenerCount() {
    return this.activeHandlers;
  }
}

module.exports = BuggyEventEmitter;
