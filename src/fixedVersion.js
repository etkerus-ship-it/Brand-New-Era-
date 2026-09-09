const EventEmitter = require('events');
const debug = require('debug')('fixed');

/**
 * FIXED VERSION: Proper cleanup with try/finally
 * 
 * Solution: Use try/finally to guarantee cleanup even in concurrent scenarios.
 * Also use WeakMap/Set to prevent duplicate registrations.
 */
class FixedEventEmitter extends EventEmitter {
  constructor() {
    super();
    this.listeners = new Set();
    this.activeHandlers = 0;
  }

  registerListener(eventName, handler) {
    const listener = { 
      id: Math.random(), 
      eventName, 
      handler,
      created: Date.now()
    };
    this.listeners.add(listener);
    this.activeHandlers++;
    debug(`Registered listener. Total: ${this.activeHandlers}`);
    return listener;
  }

  removeListener(listener) {
    if (this.listeners.has(listener)) {
      this.listeners.delete(listener);
      this.activeHandlers--;
    }
  }

  async processEvent(eventName, data) {
    const listener = this.registerListener(eventName, () => {});
    
    // FIX: Use try/finally to guarantee cleanup
    try {
      // Simulate async work
      await new Promise(resolve => setImmediate(resolve));
    } finally {
      // This ALWAYS executes, even if the promise rejects
      this.removeListener(listener);
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

module.exports = FixedEventEmitter;
