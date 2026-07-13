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
 * Arrow-key navigation for a data table. Two modes, because a list is read one
 * way and edited another:
 *
 *   ROW CURSOR - nothing focused inside a cell. Up/Down moves a highlighted row
 *     down the list, scrolling it into view. This is what pressing Down should
 *     do the moment you open a screen; before, the keypress landed on <body>,
 *     this handler never saw it, and the browser just scrolled the whole page.
 *     Enter (or Tab) steps from the row INTO its first field.
 *
 *   COLUMN WALK - already typing in a cell. Up/Down keeps the column and moves
 *     to the same field on the previous/next row, so a whole column of costs can
 *     be filled without ever leaving the keyboard.
 *
 * Left/Right are deliberately never bound: inside a text field they move the
 * text cursor, and stealing them would make editing a price impossible. Tab
 * already moves between fields, natively.
 *
 * Attach the ref to the element wrapping the <table>.
 */
export function useGridArrowNav(container: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    const root = container.current;
    if (!root) return;

    const getRows = () => Array.from(root.querySelectorAll<HTMLTableRowElement>('tbody tr'));

    // Rows are not focusable by default. Give them a roving tabindex: the cursor
    // row is the single tab stop, the rest are reachable only by the arrows - so
    // Tab does not have to walk 101 rows to get past the table.
    const prepare = () => {
      const rows = getRows();
      if (rows.length === 0) return;
      const hasStop = rows.some(r => r.getAttribute('tabindex') === '0');
      rows.forEach(r => {
        if (!r.hasAttribute('tabindex')) r.setAttribute('tabindex', '-1');
      });
      if (!hasStop) rows[0].setAttribute('tabindex', '0');
    };
    prepare();
    // The list re-renders (filtering, loading), so re-prepare when rows change.
    const observer = new MutationObserver(prepare);
    observer.observe(root, { childList: true, subtree: true });

    function focusRow(row: HTMLTableRowElement) {
      getRows().forEach(r => {
        r.setAttribute('tabindex', r === row ? '0' : '-1');
        if (r === row) r.setAttribute('data-kbd-active', 'true');
        else r.removeAttribute('data-kbd-active');
      });
      row.focus({ preventScroll: true });
      // preventScroll + scrollIntoView('nearest') keeps the row visible without
      // yanking the page around the way a raw .focus() does.
      row.scrollIntoView({ block: 'nearest' });
    }

    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      // A control that runs its own list (the combobox) owns its arrows.
      if (target.closest?.('[data-kbd-owns-arrows="true"]')) return;

      const rows = getRows();
      if (rows.length === 0) return;
      const row = target.closest?.('tr') as HTMLTableRowElement | null;

      // --- step from the row cursor INTO the row's fields ---
      if (e.key === 'Enter' && row && target === row) {
        const first = row.querySelector<HTMLElement>(FOCUSABLE);
        if (first) {
          e.preventDefault();
          focusAndSelect(first);
        }
        return;
      }

      if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
      if (target.tagName === 'SELECT' || target.tagName === 'TEXTAREA') return;

      const step = e.key === 'ArrowDown' ? 1 : -1;

      // --- ROW CURSOR: focus is on a row itself ---
      if (row && target === row) {
        const next = rows[rows.indexOf(row) + step];
        if (!next) return; // at an end - let focus stay put
        e.preventDefault();
        focusRow(next);
        return;
      }

      // --- COLUMN WALK: focus is in a field inside a cell ---
      const cell = target.closest?.('td');
      if (cell && row) {
        const rowIdx = rows.indexOf(row);
        if (rowIdx < 0) return;
        const colIdx = Array.from(row.children).indexOf(cell);
        // Walk past rows with nothing focusable in this column rather than
        // dead-ending on them.
        for (let i = rowIdx + step; i >= 0 && i < rows.length; i += step) {
          const destCell = rows[i].children[colIdx] as HTMLElement | undefined;
          const dest = destCell?.querySelector<HTMLElement>(FOCUSABLE);
          if (dest) {
            e.preventDefault();
            focusAndSelect(dest);
            return;
          }
        }
      }
    };

    // No CONTROL has focus - the case that made Down scroll instead of moving a
    // row. It is not enough to test for <body>: after clicking a sidebar item,
    // focus stays on that nav button, so the arrows drove the sidebar list and
    // the table never saw them. The test is therefore "is a focusable control
    // holding focus?" - if one is (a field, a nav button, a menu), it keeps its
    // arrows and the grid stays out of the way. Only when nothing is - body, or
    // the content pane itself - does the grid take them.
    const onDocKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
      const active = document.activeElement as HTMLElement | null;
      if (active && active !== document.body && active.matches?.(FOCUSABLE)) return;
      const rows = getRows();
      if (rows.length === 0) return;
      e.preventDefault();
      focusRow(e.key === 'ArrowDown' ? rows[0] : rows[rows.length - 1]);
    };

    // Keep the highlight on whichever row holds focus, however it got there.
    const onFocusIn = (e: FocusEvent) => {
      const r = (e.target as HTMLElement).closest?.('tr');
      root.querySelectorAll('[data-kbd-active="true"]').forEach(x => x.removeAttribute('data-kbd-active'));
      if (r && root.contains(r)) r.setAttribute('data-kbd-active', 'true');
    };
    const onFocusOut = (e: FocusEvent) => {
      if (!root.contains(e.relatedTarget as Node)) {
        root.querySelectorAll('[data-kbd-active="true"]').forEach(x => x.removeAttribute('data-kbd-active'));
      }
    };

    root.addEventListener('keydown', onKeyDown);
    root.addEventListener('focusin', onFocusIn);
    root.addEventListener('focusout', onFocusOut);
    document.addEventListener('keydown', onDocKeyDown);
    return () => {
      observer.disconnect();
      root.removeEventListener('keydown', onKeyDown);
      root.removeEventListener('focusin', onFocusIn);
      root.removeEventListener('focusout', onFocusOut);
      document.removeEventListener('keydown', onDocKeyDown);
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
