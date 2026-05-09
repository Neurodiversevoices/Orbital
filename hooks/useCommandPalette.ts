import { useEffect, useState } from "react";

const _state = { open: false, listeners: new Set<() => void>() };

const broadcast = () => _state.listeners.forEach((f) => f());

export function useCommandPalette() {
  const [open, setOpen] = useState(_state.open);

  useEffect(() => {
    const sync = () => setOpen(_state.open);
    _state.listeners.add(sync);
    return () => {
      _state.listeners.delete(sync);
    };
  }, []);

  const show = () => {
    _state.open = true;
    broadcast();
  };
  const hide = () => {
    _state.open = false;
    broadcast();
  };
  const toggle = () => {
    _state.open = !_state.open;
    broadcast();
  };

  return { open, show, hide, toggle };
}
