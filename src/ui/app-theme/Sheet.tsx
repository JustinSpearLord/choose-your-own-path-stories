import { useEffect, useRef, type ReactNode } from 'react';
import ui from './ui.module.css';

/** A bottom sheet dialog. Closes on Escape or a tap outside. */
export function Sheet({ label, onClose, children }: { label: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  close.current = onClose;

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close.current();
    };
    document.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      previous?.focus?.();
    };
  }, []);

  return (
    <div
      className={ui.backdrop}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div ref={ref} className={ui.sheet} role="dialog" aria-modal="true" aria-label={label} tabIndex={-1}>
        <span className={ui.sheetHandle} aria-hidden="true" />
        {children}
      </div>
    </div>
  );
}
