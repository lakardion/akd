import { useEffect, useState } from "react";

/**
 * Use when you have a rapidly changing value that you want to wait a certain amount of time before you get a value from it
 * @param value
 */
export const useDebouncedValue = <T>(value: T, timeoutMs: number) => {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebounced(value);
    }, timeoutMs);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [timeoutMs, value]);

  return debounced;
};
