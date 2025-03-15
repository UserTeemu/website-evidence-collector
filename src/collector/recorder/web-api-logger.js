/// This script is injected into a webpage to log all access to the Cookies API and the Localstorage API.
/// It is kept in a separate JS file, to prevent the TS compiler from changing or interpreting it.
export function localStorageLogger() {
  // inject storage set recorder
  // https://stackoverflow.com/a/49093643/1407622
  Object.defineProperty(window, "localStorage", {
    configurable: true,
    enumerable: true,
    value: new Proxy(localStorage, {
      set: function (ls, prop, value) {
        //console.log(`direct assignment: ${prop} = ${value}`);
        let stack = StackTrace.getSync({ offline: true });
        let hash = {};
        hash[prop] = value;

        // reportEvent is called within the browser context - this is defined further down
        window.reportEvent(
          "Storage.LocalStorage",
          stack,
          hash,
          window.location,
        );
        ls[prop] = value;
        return true;
      },
      get: function (ls, prop) {
        // The only property access we care about is setItem. We pass
        // anything else back without complaint. But using the proxy
        // fouls 'this', setting it to this {set: fn(), get: fn()}
        // object.
        if (prop !== "setItem") {
          if (typeof ls[prop] === "function") {
            return ls[prop].bind(ls);
          } else {
            return ls[prop];
          }
        }
        return (...args) => {
          let stack = StackTrace.getSync({ offline: true });
          let hash = {};
          hash[args[0]] = args[1];
          window.reportEvent(
            "Storage.LocalStorage",
            stack,
            hash,
            window.location,
          );
          ls.setItem.apply(ls, args);
        };
      },
    }),
  });
}
// this modifies the document.cookie object, so when a site tries to set a cookie
// this code will intercept it, log it, and then set the cookie
export function cookieLogger() {
  // original object
  let origDescriptor = Object.getOwnPropertyDescriptor(
    Document.prototype,
    "cookie",
  );

  // new method, which will log the cookie being set, and then pass it on
  // to the original object
  Object.defineProperty(document, "cookie", {
    get() {
      return origDescriptor.get.call(this);
    },
    set(value) {
      // https://www.stacktracejs.com/#!/docs/stacktrace-js
      let stack = StackTrace.getSync({ offline: true });

      // inside our wrapper we execute the .reportEvent from within the browser
      // reportEvent is defined further down
      window.reportEvent("Cookie.JS", stack, value, window.location);
      return origDescriptor.set.call(this, value);
    },
    enumerable: true,
    configurable: true,
  });
}
