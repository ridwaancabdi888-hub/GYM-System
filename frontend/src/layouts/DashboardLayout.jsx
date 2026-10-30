import { useCallback, useEffect, useRef, useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar.jsx';
import Topbar from '../components/Topbar.jsx';
import {
  DESKTOP_SIDEBAR_QUERY,
  focusSidebar,
  handleSidebarKeydown,
  subscribeToSidebarBreakpoint,
} from '../utils/sidebarNavigation.js';

const SIDEBAR_ID = 'primary-sidebar';

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(DESKTOP_SIDEBAR_QUERY).matches,
  );
  const sidebarRef = useRef(null);
  const menuButtonRef = useRef(null);
  const restoreMenuFocusRef = useRef(true);

  const closeSidebar = useCallback((restoreFocus = true) => {
    restoreMenuFocusRef.current = restoreFocus;
    setSidebarOpen(false);
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia(DESKTOP_SIDEBAR_QUERY);
    setIsDesktop(mediaQuery.matches);

    return subscribeToSidebarBreakpoint(mediaQuery, (matches) => {
      setIsDesktop(matches);
      if (matches) closeSidebar(false);
    });
  }, [closeSidebar]);

  useEffect(() => {
    if (!sidebarOpen || isDesktop) return undefined;

    const sidebar = sidebarRef.current;
    const previousOverflow = document.body.style.overflow;
    const frame = requestAnimationFrame(() => focusSidebar(sidebar));
    const onKeydown = (event) => handleSidebarKeydown(event, sidebar, () => closeSidebar(true));

    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKeydown);

    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('keydown', onKeydown);
      document.body.style.overflow = previousOverflow;

      const menuButton = menuButtonRef.current;
      if (restoreMenuFocusRef.current && !window.matchMedia(DESKTOP_SIDEBAR_QUERY).matches) {
        menuButton?.focus();
      }
      restoreMenuFocusRef.current = true;
    };
  }, [closeSidebar, isDesktop, sidebarOpen]);

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar
        open={sidebarOpen}
        isDesktop={isDesktop}
        onClose={() => closeSidebar(true)}
        sidebarRef={sidebarRef}
        sidebarId={SIDEBAR_ID}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          onMenuClick={() => setSidebarOpen(true)}
          menuButtonRef={menuButtonRef}
          menuOpen={sidebarOpen}
          menuControls={SIDEBAR_ID}
        />
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
