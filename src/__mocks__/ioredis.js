class MockRedis {
  constructor() {
    this.data = {};
    this.eventHandlers = {};
    this.connected = false;
  }

  on(event, handler) {
    if (!this.eventHandlers[event]) {
      this.eventHandlers[event] = [];
    }
    this.eventHandlers[event].push(handler);
    return this;
  }

  connect() {
    this.connected = true;
    return Promise.resolve();
  }

  hset(key, field, value) {
    if (!this.data[key]) {
      this.data[key] = {};
    }
    this.data[key][field] = value;
    return Promise.resolve(1);
  }

  hget(key, field) {
    return Promise.resolve(this.data[key]?.[field] || null);
  }

  hgetall(key) {
    return Promise.resolve(this.data[key] || {});
  }

  del(key) {
    delete this.data[key];
    return Promise.resolve(1);
  }

  quit() {
    this.connected = false;
    return Promise.resolve();
  }

  disconnect() {
    this.connected = false;
    return Promise.resolve();
  }
}

module.exports = MockRedis;
