import { useState, useEffect } from 'react';

export default function useLocalState(key, defaultValue = '') {
  const [value, setValue] = useState(() =>
    typeof window !== 'undefined'
      ? JSON.parse(window.localStorage.getItem(key))
      : defaultValue,
  );

  useEffect(() => {
    window.localStorage.setItem(key, JSON.stringify(value));
  }, [value]);

  return [value, setValue];
}
