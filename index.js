/**
 * CrossTab syncs Vuex state across same-origin tabs
 *
 * @see https://github.com/storeon/crosstab
 *
 * @param {Object} config = {}
 * @param {String} config.key the storage key to use
 * @param {Boolean} config.recover if old state should be recovered on load
 * @param {Function<Boolean>} config.filter a filter function for ignoring events
 *
 * @returns {Function<void>}
 */
function CrossTab (config = {}) {
  const key = config.key || 'vuex-crosstab';
  const stateKey = config.key + '-state';
  const recover = config.recover || false;

  let ignoreNext = false;
  let ignoreDate = 0;
  let counter = 0;

  /**
   * Store plugin
   *
   * @param {Object} store
   */
  return function (store) {
    // bail if not in a browser
    if (typeof window === 'undefined') {
      return;
    }

    // try to recover previously stored state?
    if (recover) {
      try {
        const recoveredState = JSON.parse(window.localStorage[stateKey]) || {};
        Object.entries(recoveredState)
          .forEach(([prop, value]) => {
            store.state[prop] = value;
          });
      } catch (e) {}
    }

    // storage events are fired in the other non-focused same-origin tabs
    window.addEventListener('storage', event => {
      if (event.key === key) {
        const [ eventName, data, ignoreDateFromEvent ] = JSON.parse(event.newValue);

        if (ignoreDate !== ignoreDateFromEvent) {
          ignoreNext = true;
          store.commit(eventName, data);
        }
      }
    });

    store.subscribe((mutation, state) => {
      if (ignoreNext) {
        ignoreNext = false;

        return;
      }

      if (config.filter && !config.filter(mutation.type, mutation.payload)) {
        return;
      }

      try {
        ignoreDate = Date.now() + '' + counter++;
        // store the details of this mutation
        window.localStorage[key] = JSON.stringify([mutation.type, mutation.payload, ignoreDate]);
        // store the entire state for future recovery
        window.localStorage[stateKey] = JSON.stringify(state);
      } catch (e) {}
    });
  };
};

module.exports = CrossTab;
