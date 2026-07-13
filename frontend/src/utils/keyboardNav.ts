import { useEffect } from 'react';

// Keyboard navigation shared by every screen, so the app can be driven end to
// end without a mouse.
//
// What is deliberately NOT bound, and why:
//   - Left/Right arrows are left alone. Inside a text field they move the text
//     cursor, and stealing them to jump between columns would make editing a
//     price impossible. Tab/Shift+Tab already move between fields, natively.
//   - Up/Down inside a <select> or <textarea> are left alone: that is how a
//     select changes value and a textarea moves between its lines.
// Up/Down everywhere else is free, and is the one binding that actually earns
// its keep in a data-entry grid - it walks a whole column of prices or costs.

export const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function focusAndSelect(el: HTMLElement) {
  el.focus();
  // Landing on a value you are about to overwrite should select it, the way a
  // spreadsheet does - otherwise you type into the middle of the old number.
  if (el instanceof HTMLInputElement && (el.type === 'text' || el.type === 'number')) {
    el.select();
  }
}

/**
 * Up/Down walks a COLUMN of a data-entry table: from the cost field on one row
 * straight to the cost field on the next, keeping the column you are in.
 * Attach the ref to the element wrapping the <table>.
 */
export function useGridArrowNav(container: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    const root = container.current;
    if (!root) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;

      const target = e.target as HTMLElement;
      if (target.tagName === 'SELECT' || target.tagName === 'TEXTAREA') return;
      // A control that runs its own list (our combobox) owns its arrows.
      if (target.closest('[data-kbd-owns-arrows="true"]')) return;

      const cell = target.closest('td');
      const row = target.closest('tr');
      if (!cell || !row) return;

      const rows = Array.from(root.querySelectorAll<HTMLTableRowElement>('tbody tr'));
      const rowIdx = rows.indexOf(row as HTMLTableRowElement);
      if (rowIdx < 0) return;

      const colIdx = Array.from(row.children).indexOf(cell);

      // Walk on past rows that have nothing focusable in this column, rather
      // than dead-ending on them.
      const step = e.key === 'ArrowDown' ? 1 : -1;
      for (let i = rowIdx + step; i >= 0 && i < rows.length; i += step) {
        const destCell = rows[i].children[colIdx] as HTMLElement | undefined;
        const dest = destCell?.querySelector<HTMLElement>(FOCUSABLE);
        if (dest) {
          e.preventDefault();
          focusAndSelect(dest);
          return;
        }
      }
    };

    // Highlight the row you are standing in, so the eye can follow the keyboard.
    const onFocusIn = (e: FocusEvent) => {
      const row = (e.target as HTMLElement).closest('tr');
      root.querySelectorAll('[data-kbd-active="true"]').forEach(r => r.removeAttribute('data-kbd-active'));
      if (row && root.contains(row)) row.setAttribute('data-kbd-active', 'true');
    };
    const onFocusOut = (e: FocusEvent) => {
      // Only clear when focus actually leaves the table, not while moving inside it.
      if (!root.contains(e.relatedTarget as Node)) {
        root.querySelectorAll('[data-kbd-active="true"]').forEach(r => r.removeAttribute('data-kbd-active'));
      }
    };

    root.addEventListener('keydown', onKeyDown);
    root.addEventListener('focusin', onFocusIn);
    root.addEventListener('focusout', onFocusOut);
    return () => {
      root.removeEventListener('keydown', onKeyDown);
      root.removeEventListener('focusin', onFocusIn);
      root.removeEventListener('focusout', onFocusOut);
    };
  }, [container]);
}

/**
 * Makes a modal usable without a mouse. Clicking the dark backdrop closes these
 * dialogs, and a keyboard has no backdrop to click - so Escape has to do it.
 *
 * Also traps Tab inside the dialog (otherwise Tab wanders off into the page
 * behind it, focusing things the user cannot even see) and hands focus back to
 * whatever opened the dialog when it closes.
 *
 * Pass `open` so the hook can do nothing while the modal is closed.
 */
export function useModalKeyboard(
  dialog: React.RefObject<HTMLElement | null>,
  onClose: () => void,
  open = true,
) {
  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement as HTMLElement | null;

    // Focus the first thing worth typing into, else the dialog itself.
    const el = dialog.current;
    const first = el?.querySelector<HTMLElement>(FOCUSABLE);
    (first ?? el)?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== 'Tab' || !el) return;

      const items = Array.from(el.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        n => n.offsetParent !== null,
      );
      if (items.length === 0) return;
      const firstEl = items[0];
      const lastEl = items[items.length - 1];
      // Wrap around, so Tab can never escape the dialog.
      if (!e.shiftKey && document.activeElement === lastEl) {
        e.preventDefault();
        firstEl.focus();
      } else if (e.shiftKey && document.activeElement === firstEl) {
        e.preventDefault();
        lastEl.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      opener?.focus?.();
    };
  }, [dialog, onClose, open]);
}

/**
 * Spread onto a non-button element that is nonetheless clickable (a table row
 * that opens a record). Gives it what a <button> would have had for free: it can
 * be reached by Tab, and Enter or Space activates it.
 */
export function activatable(onActivate: () => void) {
  return {
    tabIndex: 0,
    role: 'button' as const,
    onClick: onActivate,
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      // Space would otherwise scroll the page out from under the user.
      e.preventDefault();
      onActivate();
    },
  };
}

/**
 * Up/Down (plus Home/End) moves through a vertical list of buttons - the
 * sidebar's 40-odd nav items, a menu, a set of tabs.
 */
export function useListArrowNav(container: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    const root = container.current;
    if (!root) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (!['ArrowUp', 'ArrowDown', 'Home', 'End'].includes(e.key)) return;
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'SELECT' || target.tagName === 'TEXTAREA') return;

      const items = Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        el => el.offsetParent !== null, // skip anything inside a collapsed group
      );
      if (items.length === 0) return;

      const idx = items.indexOf(target);
      let next = -1;
      if (e.key === 'Home') next = 0;
      else if (e.key === 'End') next = items.length - 1;
      else if (idx >= 0) next = e.key === 'ArrowDown' ? idx + 1 : idx - 1;
      else next = 0;

      if (next < 0 || next >= items.length) return; // let focus leave at the ends
      e.preventDefault();
      items[next].focus();
    };

    root.addEventListener('keydown', onKeyDown);
    return () => root.removeEventListener('keydown', onKeyDown);
  }, [container]);
}
