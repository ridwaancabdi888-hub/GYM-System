import { useEffect, useId, useRef } from 'react';
import { getFocusableElements, handleDialogKeydown } from '../utils/modalFocus.js';

export default function Modal({ open, onClose, title, children, footer, size = 'md' }) {
  const dialogRef = useRef(null);
  const onCloseRef = useRef(onClose);
  const titleId = useId();

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return undefined;

    const previousFocus = document.activeElement;
    const dialog = dialogRef.current;
    const onKeydown = (event) => handleDialogKeydown(event, dialog, () => onCloseRef.current());
    document.addEventListener('keydown', onKeydown);

    const frame = requestAnimationFrame(() => {
      (getFocusableElements(dialog)[0] || dialog).focus();
    });

    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('keydown', onKeydown);
      if (previousFocus && document.contains(previousFocus)) previousFocus.focus();
    };
  }, [open]);

  if (!open) return null;

  const widths = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl' };

  return (
    <div
      className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-slate-900/40 px-4 py-8"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`w-full ${widths[size]} rounded-xl bg-white shadow-xl`}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 id={titleId} className="text-base font-semibold text-slate-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-4">{footer}</div>}
      </div>
    </div>
  );
}
