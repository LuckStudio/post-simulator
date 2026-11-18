import { svgIcon } from './icons.js';
import { openSheet } from './sheet.js';

const isNarrow = () => !!window.matchMedia?.('(max-width: 900px)').matches;

/**
 * Menú contextual accesible (clic derecho, tecla de menú o botón "más acciones").
 * - En pantallas anchas es un menú flotante junto al puntero; en estrechas, una hoja inferior.
 * - Se cierra con Escape, clic fuera, scroll, redimensionar o Tab (el menú flotante).
 * - Flechas ↑/↓, Inicio y Fin para moverse; Intro o espacio para elegir.
 * - Al cerrarse devuelve el foco a quien lo abrió.
 *
 * Cada entrada: { label, icon?, desc? (línea secundaria), hint?, onSelect, danger?, disabled?,
 *                 checked? (boolean → casilla), radio? (true → opción excluyente con `checked`),
 *                 onSelectMovesFocus? } o { separator: true }.
 */
export function createContextMenu() {
  let menu = null;
  let sheet = null;
  let returnFocus = null;
  const cleanups = [];

  function close({ restoreFocus = true } = {}) {
    if (sheet) {
      sheet.close({ restoreFocus });
      return;
    }
    if (!menu) return;
    menu.remove();
    menu = null;
    cleanups.splice(0).forEach((fn) => fn());
    if (restoreFocus && returnFocus && document.contains(returnFocus)) returnFocus.focus();
    returnFocus = null;
  }

  /** Rellena `list` con las entradas. `pick(item)` se llama al elegir una. */
  function fill(list, items, pick) {
    for (const it of items.filter(Boolean)) {
      if (it.separator) {
        const s = document.createElement('div');
        s.className = 'menu-sep';
        s.setAttribute('role', 'separator');
        list.append(s);
        continue;
      }
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'menu-item' + (it.danger ? ' danger' : '');
      b.disabled = !!it.disabled;
      const isChoice = typeof it.checked === 'boolean';
      b.setAttribute('role', isChoice ? (it.radio ? 'menuitemradio' : 'menuitemcheckbox') : 'menuitem');
      if (isChoice) b.setAttribute('aria-checked', String(it.checked));
      b.tabIndex = -1;

      const lead = document.createElement('span');
      lead.className = 'menu-lead';
      lead.setAttribute('aria-hidden', 'true');
      if (isChoice) {
        if (it.checked) lead.append(svgIcon('check', 16, 2.2));
      } else if (it.icon) lead.append(svgIcon(it.icon, 20));

      const text = document.createElement('span');
      text.className = 'menu-text';
      const label = document.createElement('span');
      label.className = 'menu-label';
      label.textContent = it.label;
      text.append(label);
      if (it.desc) {
        const desc = document.createElement('span');
        desc.className = 'menu-desc';
        desc.textContent = it.desc;
        text.append(desc);
      }
      b.append(lead, text);
      if (it.hint) {
        const hint = document.createElement('span');
        hint.className = 'menu-hint';
        hint.textContent = it.hint;
        b.append(hint);
      }
      b.addEventListener('click', () => pick(it));
      list.append(b);
    }
  }

  /** Navegación con teclado entre las entradas de `root`. Devuelve cómo quitar el manejador. */
  function keyboardNav(root, { closeOnTab }) {
    const focusable = () => [...root.querySelectorAll('.menu-item:not(:disabled)')];
    const move = (delta, abs) => {
      const list = focusable();
      if (!list.length) return;
      const i = list.indexOf(document.activeElement);
      const next = abs != null ? (abs < 0 ? list.length - 1 : 0) : (i + delta + list.length) % list.length;
      list[next].focus();
    };
    const onKey = (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        move(1);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        move(-1);
      } else if (e.key === 'Home') {
        e.preventDefault();
        move(0, 0);
      } else if (e.key === 'End') {
        e.preventDefault();
        move(0, -1);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        close();
      } else if (e.key === 'Tab' && closeOnTab) close();
    };
    document.addEventListener('keydown', onKey, true);
    focusable()[0]?.focus();
    return () => document.removeEventListener('keydown', onKey, true);
  }

  /**
   * @param {{x:number, y:number, title?:string, items:object[], anchor?:DOMRect, opener?:HTMLElement|null}} o
   */
  function open({ x, y, title, items, anchor, opener = null }) {
    close({ restoreFocus: false });
    returnFocus = opener;

    if (isNarrow()) {
      const list = document.createElement('div');
      list.className = 'menu in-sheet';
      list.setAttribute('role', 'menu');
      if (title) list.setAttribute('aria-label', title);
      fill(list, items, (it) => {
        close({ restoreFocus: !it.onSelectMovesFocus });
        it.onSelect?.();
      });
      let offKeys = () => {};
      sheet = openSheet({
        title: title || 'Acciones',
        content: list,
        opener,
        onClose: () => {
          offKeys();
          sheet = null;
          returnFocus = null;
        },
      });
      offKeys = keyboardNav(list, { closeOnTab: false });
      return;
    }

    menu = document.createElement('div');
    menu.className = 'menu';
    menu.setAttribute('role', 'menu');
    if (title) {
      menu.setAttribute('aria-label', title);
      const t = document.createElement('div');
      t.className = 'menu-title';
      t.setAttribute('role', 'presentation');
      t.textContent = title;
      menu.append(t);
    }
    fill(menu, items, (it) => {
      close({ restoreFocus: !it.onSelectMovesFocus });
      it.onSelect?.();
    });
    document.body.append(menu);
    position(x, y, anchor);

    const onOutside = (e) => {
      if (menu && !menu.contains(e.target)) close({ restoreFocus: false });
    };
    const dismiss = () => close({ restoreFocus: false });
    document.addEventListener('pointerdown', onOutside, true);
    window.addEventListener('resize', dismiss);
    window.addEventListener('scroll', dismiss, true);
    window.addEventListener('blur', dismiss);
    cleanups.push(
      keyboardNav(menu, { closeOnTab: true }),
      () => document.removeEventListener('pointerdown', onOutside, true),
      () => window.removeEventListener('resize', dismiss),
      () => window.removeEventListener('scroll', dismiss, true),
      () => window.removeEventListener('blur', dismiss),
    );
  }

  /** Coloca el menú junto al puntero (o encima/debajo de un botón) sin salirse de la pantalla. */
  function position(x, y, anchor) {
    const pad = 8;
    const { width: w, height: h } = menu.getBoundingClientRect();
    let left = x;
    let top = y;
    if (anchor) {
      left = anchor.left;
      top = anchor.top - h - 6;
      if (top < pad) top = anchor.bottom + 6;
    }
    left = Math.max(pad, Math.min(left, window.innerWidth - w - pad));
    top = Math.max(pad, Math.min(top, window.innerHeight - h - pad));
    menu.style.left = left + 'px';
    menu.style.top = top + 'px';
  }

  return {
    open,
    close,
    get isOpen() {
      return !!menu || !!sheet;
    },
  };
}
