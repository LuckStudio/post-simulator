import { $ } from './dom.js';

/** Aviso flotante. `isError` lo pinta en rojo. */
export function toast(msg, isError = false) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.toggle('err', !!isError);
  t.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => t.classList.remove('show'), 3200);
}

/** Diálogo de progreso de la grabación de vídeo, con cancelación. */
export function createRecorderDialog() {
  let cancelled = false;
  const modal = $('#recModal');
  $('#recCancel').onclick = () => {
    cancelled = true;
  };
  return {
    reset() {
      cancelled = false;
    },
    open(text) {
      $('#recText').textContent = text;
      $('#recBar').style.width = '0%';
      modal.classList.add('open');
      $('#recCancel').focus();
    },
    progress(f) {
      $('#recBar').style.width = (f * 100).toFixed(1) + '%';
    },
    close() {
      modal.classList.remove('open');
    },
    isCancelled: () => cancelled,
  };
}
