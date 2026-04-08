import { useEffect, useRef } from 'react';

export const useKeyboard = () => {
  const keys = useRef<Record<string, boolean>>({});

  useEffect(() => {
    const handleDown = (e: KeyboardEvent) => { keys.current[e.code] = true; };
    const handleUp = (e: KeyboardEvent) => { keys.current[e.code] = false; };

    window.addEventListener('keydown', handleDown);
    window.addEventListener('keyup', handleUp);

    return () => {
      window.removeEventListener('keydown', handleDown);
      window.removeEventListener('keyup', handleUp);
    };
  }, []);

  return keys;
};