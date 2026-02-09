/**
 * Environnement Jest Node avec polyfill localStorage (évite SecurityError).
 */
const NodeEnvironment = require('jest-environment-node').TestEnvironment;

module.exports = class JestEnvironmentNodeLocalStorage extends NodeEnvironment {
  constructor(config, context) {
    super(config, context);
    const store = new Map();
    this.global.localStorage = {
      getItem: (k) => store.get(k) ?? null,
      setItem: (k, v) => { store.set(k, String(v)); },
      removeItem: (k) => { store.delete(k); },
      clear: () => store.clear(),
      get length() { return store.size; },
      key: (i) => [...store.keys()][i] ?? null,
    };
  }
};
