//@ts-nocheck
/**
 * Debounce a promise callback.
 * @param fn A callback that returns a promise value
 * @param timeout the time to wait until the function is called
 * @returns a function reference that closures over a timeoutId. Returns a promise when called, if called again while its promise is unresolved it will reset the timeout, avoiding multiple calls during the timeout time
 */
export const debouncePromiseValue = <T = unknown>(fn, timeout) => {
  let timeoutId;
  return function (...args) {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    const promise = new Promise<T>((resolve) => {
      timeoutId = setTimeout(() => {
        resolve(fn(...args));
      }, timeout);
    });
    return promise;
  };
};
