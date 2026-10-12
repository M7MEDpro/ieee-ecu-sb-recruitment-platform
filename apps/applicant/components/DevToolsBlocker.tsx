'use client';

/**
 * @file DevToolsBlocker.tsx
 * @brief Client-side protection guard preventing F12, DevTools shortcuts, and Inspect context menu.
 * @author Senior Full-Stack Software Architect
 * @since 2026-09-26
 */

import { useEffect } from 'react';

/**
 * @brief Browser DevTools and Inspection Guard.
 * @details Restricts debugging shortcut keys and context menu during form submission.
 * @return {null} Null component rendering no DOM elements.
 */
export default function DevToolsBlocker() {
  useEffect(() => {
    // 1. Block Context Menu (Inspect / View Page Source on Right Click)
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      return false;
    };

    // 2. Block DevTools Keyboard Shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      // F12 key
      if (e.key === 'F12' || e.keyCode === 123) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }

      const key = (e.key || '').toUpperCase();

      // Ctrl + Shift + (I, J, C, K) [Windows / Linux DevTools & Console & Inspect Element]
      if ((e.ctrlKey || e.metaKey) && e.shiftKey) {
        if (key === 'I' || key === 'J' || key === 'C' || key === 'K') {
          e.preventDefault();
          e.stopPropagation();
          return false;
        }
      }

      // Cmd + Option + (I, J, C, U, K) [macOS Safari / Chrome DevTools]
      if (e.metaKey && e.altKey) {
        if (key === 'I' || key === 'J' || key === 'C' || key === 'U' || key === 'K') {
          e.preventDefault();
          e.stopPropagation();
          return false;
        }
      }

      // Ctrl + U (View Page Source)
      if ((e.ctrlKey || e.metaKey) && key === 'U') {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }

      // Ctrl + S (Save Page)
      if ((e.ctrlKey || e.metaKey) && key === 'S') {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    };

    window.addEventListener('contextmenu', handleContextMenu, { capture: true });
    window.addEventListener('keydown', handleKeyDown, { capture: true });

    return () => {
      window.removeEventListener('contextmenu', handleContextMenu, { capture: true });
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
    };
  }, []);

  return null;
}
