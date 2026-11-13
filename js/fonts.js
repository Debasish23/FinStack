/* FinStack fonts. To add one: put the file in assets/fonts/ and add a line to LIST below. */
(function (global) {
  'use strict';

  const LIST = [
    { name: 'Sony Sketch EF', file: 'SonySketchEF.ttf' },
    { name: 'Continuum', file: 'Contm.ttf' },
    { name: 'Nebula', file: 'Nebula.otf' },
    { name: 'New Academy', file: 'NewAcademy.ttf' },
    { name: 'Prototype', file: 'Prototype..ttf' },
    { name: 'Vibrocentric', file: 'Vibrocentric.otf' },
  ];
  const SYSTEM = 'System default';
  const DEFAULT = LIST[0].name;
  const KEY = 'finstack.font';
  const FALLBACK = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
  const FORMAT = { ttf: 'truetype', otf: 'opentype', woff: 'woff', woff2: 'woff2' };

  const family = (name) => 'FS ' + name;
  const stack = (name) => (name === SYSTEM ? FALLBACK : `"${family(name)}", ${FALLBACK}`);

  /* One @font-face per file; the browser only downloads a font once something uses it. */
  const style = document.createElement('style');
  style.textContent = LIST.map((f) => {
    const ext = f.file.split('.').pop().toLowerCase();
    return `@font-face{font-family:"${family(f.name)}";src:url("assets/fonts/${encodeURIComponent(f.file)}") format("${FORMAT[ext] || 'truetype'}");font-weight:100 900;font-display:swap;}`;
  }).join('');
  document.head.appendChild(style);

  function current() {
    let saved = null;
    try { saved = localStorage.getItem(KEY); } catch (e) { /* private mode */ }
    return saved === SYSTEM || LIST.some((f) => f.name === saved) ? saved : DEFAULT;
  }
  function set(name) {
    document.documentElement.style.setProperty('--font', stack(name));
    try { localStorage.setItem(KEY, name); } catch (e) { /* private mode */ }
  }

  document.documentElement.style.setProperty('--font', stack(current()));
  global.FinFonts = { names: LIST.map((f) => f.name).concat(SYSTEM), current, set, stack };
})(window);
