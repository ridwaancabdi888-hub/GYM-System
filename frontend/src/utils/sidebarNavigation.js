import { getFocusableElements, handleDialogKeydown } from './modalFocus.js';

export const DESKTOP_SIDEBAR_QUERY = '(min-width: 1024px)';

export function isSidebarInteractive(open, isDesktop) {
  return open || isDesktop;
}

export function focusSidebar(sidebar) {
  const firstControl = getFocusableElements(sidebar)[0];
  (firstControl || sidebar)?.focus();
}

export function handleSidebarKeydown(event, sidebar, onClose, doc = globalThis.document) {
  handleDialogKeydown(event, sidebar, onClose, doc);
}

export function subscribeToSidebarBreakpoint(mediaQuery, onChange) {
  const listener = (event) => onChange(event.matches);

  if (mediaQuery.addEventListener) {
    mediaQuery.addEventListener('change', listener);
    return () => mediaQuery.removeEventListener('change', listener);
  }

  mediaQuery.addListener(listener);
  return () => mediaQuery.removeListener(listener);
}
