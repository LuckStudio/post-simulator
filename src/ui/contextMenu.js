import { svgIcon } from './icons.js';

/**
 * Menú contextual accesible (clic derecho, tecla de menú o botón "más acciones").
 * - Se cierra con Escape, clic fuera, scroll, redimensionar o Tab.
 * - Flechas ↑/↓, Inicio y Fin para moverse; Intro o espacio para elegir.
 * - Al cerrarse devuelve el foco a quien lo abrió.
 *
 * Cada entrada: { label, icon?, hint?, onSelect, danger?, disabled?, checked? (boolean → casilla),
 *                 radio? (true → opción excluyente con `checked`) } o { separator: true }.
 */
export function createContextMenu() {
  let menu = null;
  let returnFocus = null;
  const cleanups = [];

  function close({ restoreFocus = true } = {}) {
    if (!menu) return;
    menu.remove();
    menu = null;
    cleanups.splice(0).forEach((fn) => fn());
    if (restoreFocus && returnFocus && document.contains(returnFocus)) returnFocus.focus();
    returnFocus = null;
  }

  /**
   * @param {{x:number, y:number, title?:string, items:object[], anchor?:DOMRect, opener?:HTMLElement|null}} o
   */
  function open({ x, y, title, items, anchor, opener = null }) {
    close({ restoreFocus: false });
    returnFocus = opener;

    menu = document.createElement('div');
    menu.className = 'menu';
    menu.setAttribute('role', 'menu');
    if (title) menu.setAttribute('aria-label', title);
    if (title) {
      const t = document.createElement('div');
      t.className = 'menu-title';
      t.setAttribute('role', 'presentation');
      t.textContent = title;
      menu.append(t);
    }

    for (const it of items.filter(Boolean)) {
      if (it.separator) {
        const s = document.createElement('div');
        s.className = 'menu-sep';
        s.setAttribute('role', 'separator');
        menu.append(s);
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
      } else if (it.icon) lead.append(svgIcon(it.icon, 18));
      const label = document.createElement('span');
      label.className = 'menu-label';
      label.textContent = it.label;
      b.append(lead, label);
      if (it.hint) {
        const hint = document.createElement('span');
        hint.className = 'menu-hint';
        hint.textContent = it.hint;
        b.append(hint);
      }
      b.addEventListener('click', () => {
        close({ restoreFocus: !it.onSelectMovesFocus });
        it.onSelect?.();
      });
      menu.append(b);
    }

    document.body.append(menu);
    position(x, y, anchor);

    const focusable = () => [...menu.querySelectorAll('.menu-item:not(:disabled)')];
    const move = (delta, abs) => {
      const list = focusable();
      if (!list.length) return;
      const i = list.indexOf(document.activeElement);
      const next = abs != null ? (abs < 0 ? list.length - 1 : 0) : (i + delta + list.length) % list.length;
      list[next].focus();
    };
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        close();
      } else if (e.key === 'ArrowDown') {
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
      } else if (e.key === 'Tab') close();
    };
    const onOutside = (e) => {
      if (menu && !menu.contains(e.target)) close({ restoreFocus: false });
    };
    const dismiss = () => close({ restoreFocus: false });
    document.addEventListener('keydown', onKey, true);
    document.addEventListener('pointerdown', onOutside, true);
    window.addEventListener('resize', dismiss);
    window.addEventListener('scroll', dismiss, true);
    window.addEventListener('blur', dismiss);
    cleanups.push(
      () => document.removeEventListener('keydown', onKey, true),
      () => document.removeEventListener('pointerdown', onOutside, true),
      () => window.removeEventListener('resize', dismiss),
      () => window.removeEventListener('scroll', dismiss, true),
      () => window.removeEventListener('blur', dismiss),
    );
    focusable()[0]?.focus();
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
      return !!menu;
    },
  };
}
