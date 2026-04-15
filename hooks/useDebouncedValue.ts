import { useEffect, useState } from "react";

export const useDebouncedValue = <T>(value: T, delay = 240) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handle = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handle);
  }, [delay, value]);

  return debouncedValue;
};
