/**
 * usePaginationShortcuts - Keyboard shortcuts for pagination
 *
 * Shortcuts:
 * - Right Arrow / Alt+N: Next page
 * - Left Arrow / Alt+P: Previous page
 * - End / Alt+L: Last page
 * - Home / Alt+F: First page
 */

import { useEffect } from 'react';

interface PaginationControls {
  currentPage: number;
  totalPages: number;
  onNext: () => void;
  onPrevious: () => void;
  onFirst: () => void;
  onLast: () => void;
}

export function usePaginationShortcuts(controls: PaginationControls) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Check if input or textarea is focused
      const isTextInput =
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement;

      if (isTextInput && !event.ctrlKey && !event.altKey) {
        return;
      }

      // Right Arrow or Alt+N: Next page
      if (
        (event.key === 'ArrowRight' && !event.ctrlKey) ||
        (event.altKey && event.key.toLowerCase() === 'n')
      ) {
        event.preventDefault();
        if (controls.currentPage < controls.totalPages) {
          controls.onNext();
        }
      }

      // Left Arrow or Alt+P: Previous page
      if (
        (event.key === 'ArrowLeft' && !event.ctrlKey) ||
        (event.altKey && event.key.toLowerCase() === 'p')
      ) {
        event.preventDefault();
        if (controls.currentPage > 1) {
          controls.onPrevious();
        }
      }

      // End or Alt+L: Last page
      if (
        event.key === 'End' ||
        (event.altKey && event.key.toLowerCase() === 'l')
      ) {
        event.preventDefault();
        controls.onLast();
      }

      // Home or Alt+F: First page
      if (
        event.key === 'Home' ||
        (event.altKey && event.key.toLowerCase() === 'f')
      ) {
        event.preventDefault();
        controls.onFirst();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [controls]);
}
