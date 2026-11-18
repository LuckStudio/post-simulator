/** Pestaña "Cierre": llamada a seguir la cuenta y/o a escribir. */
export function ctaPanel({ store, f }) {
  const C = store.state.cta;
  return [
    f.group(
      'Mostrar cierre',
      'La última slide invita a seguir la cuenta o a escribir.',
      f.toggle('Incluir cierre', 'cta.on', { rebuild: true }),
    ),
    C.on && [
      f.group(
        'Qué mostrar',
        null,
        f.seg('', 'cta.mode', {
          both: 'Ambos en una slide',
          separate: 'Dos slides',
          seek: 'Solo candidatos',
          offer: 'Solo empresas',
        }),
        f.text('Usuario o cuenta', 'cta.handle', { ph: '@tucuenta' }),
      ),
      C.mode !== 'offer' &&
        f.group(
          'Para quien busca trabajo',
          null,
          f.text('Título', 'cta.seekTitle'),
          f.text('Texto', 'cta.seekText', { area: true, rows: 2 }),
          f.text('Botón', 'cta.seekBtn'),
        ),
      C.mode !== 'seek' &&
        f.group(
          'Para quien ofrece un puesto',
          null,
          f.text('Título', 'cta.offerTitle'),
          f.text('Texto', 'cta.offerText', { area: true, rows: 2 }),
          f.text('Botón', 'cta.offerBtn'),
        ),
    ],
  ];
}
