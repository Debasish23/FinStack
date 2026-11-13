/* xlsx-lite — a tiny, dependency-free .xlsx reader.
   Reads cell values (cached formula results included) straight in the browser.
   Exposes: XlsxLite.read(arrayBuffer) -> Promise<{ sheets: [Sheet] }>          */
(function (global) {
  'use strict';

  const td = new TextDecoder('utf-8');

  async function inflateRaw(bytes) {
    if (typeof DecompressionStream === 'undefined') {
      throw new Error('This browser is too old to read Excel files. Please update it and try again.');
    }
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
    return new Uint8Array(await new Response(stream).arrayBuffer());
  }

  /* Return a map of file name -> lazy reader for every entry in the zip. */
  function readZipDirectory(buf) {
    const u8 = new Uint8Array(buf);
    const dv = new DataView(buf);
    let eocd = -1;
    for (let i = u8.length - 22; i >= Math.max(0, u8.length - 66000); i--) {
      if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
    }
    if (eocd < 0) throw new Error('That file does not look like an Excel workbook (.xlsx).');
    const count = dv.getUint16(eocd + 10, true);
    let p = dv.getUint32(eocd + 16, true);
    const files = {};
    for (let n = 0; n < count; n++) {
      if (dv.getUint32(p, true) !== 0x02014b50) break;
      const method = dv.getUint16(p + 10, true);
      const csize = dv.getUint32(p + 20, true);
      const nameLen = dv.getUint16(p + 28, true);
      const extraLen = dv.getUint16(p + 30, true);
      const commentLen = dv.getUint16(p + 32, true);
      const local = dv.getUint32(p + 42, true);
      const name = td.decode(u8.subarray(p + 46, p + 46 + nameLen));
      files[name] = async () => {
        const lNameLen = dv.getUint16(local + 26, true);
        const lExtraLen = dv.getUint16(local + 28, true);
        const start = local + 30 + lNameLen + lExtraLen;
        const data = u8.subarray(start, start + csize);
        if (method === 0) return td.decode(data);
        if (method === 8) return td.decode(await inflateRaw(data));
        throw new Error('Unsupported compression in workbook.');
      };
      p += 46 + nameLen + extraLen + commentLen;
    }
    return files;
  }

  const parseXml = (text) => new DOMParser().parseFromString(text, 'application/xml');
  const kids = (node, name) => Array.from(node.childNodes).filter((c) => c.localName === name);
  const all = (node, name) => Array.from(node.getElementsByTagName('*')).filter((c) => c.localName === name);

  function colToIndex(letters) {
    let n = 0;
    for (let i = 0; i < letters.length; i++) n = n * 26 + (letters.charCodeAt(i) - 64);
    return n;
  }

  /* Text of a rich-string node, ignoring phonetic runs. */
  function stringOf(node) {
    let out = '';
    (function walk(el) {
      for (const c of el.childNodes) {
        if (c.nodeType !== 1) continue;
        if (c.localName === 'rPh') continue;
        if (c.localName === 't') out += c.textContent;
        else walk(c);
      }
    })(node);
    return out;
  }

  class Sheet {
    constructor(name) { this.name = name; this.cells = new Map(); this.maxRow = 0; this.maxCol = 0; }
    set(r, c, v) {
      this.cells.set(r + ',' + c, v);
      if (r > this.maxRow) this.maxRow = r;
      if (c > this.maxCol) this.maxCol = c;
    }
    /* Raw value at 1-based row / column (undefined when empty). */
    get(r, c) { return this.cells.get(r + ',' + c); }
    /* Trimmed string at a cell ('' when empty). */
    text(r, c) { const v = this.get(r, c); return v == null ? '' : String(v).replace(/\s+/g, ' ').trim(); }
    /* Number at a cell, or null when the cell is not numeric. */
    num(r, c) {
      const v = this.get(r, c);
      if (typeof v === 'number') return isFinite(v) ? v : null;
      if (typeof v === 'string' && v.trim() !== '' && !isNaN(Number(v.replace(/,/g, '')))) return Number(v.replace(/,/g, ''));
      return null;
    }
    /* All [row, col] positions whose text passes the test, top-to-bottom. */
    find(test) {
      const hits = [];
      for (const [key, v] of this.cells) {
        if (typeof v !== 'string') continue;
        const t = v.replace(/\s+/g, ' ').trim();
        if (test(t)) { const [r, c] = key.split(',').map(Number); hits.push([r, c]); }
      }
      return hits.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    }
  }

  async function read(buf) {
    const files = readZipDirectory(buf);
    const need = async (name) => {
      if (!files[name]) throw new Error('That file does not look like an Excel workbook (.xlsx).');
      return parseXml(await files[name]());
    };

    let shared = [];
    if (files['xl/sharedStrings.xml']) {
      const doc = parseXml(await files['xl/sharedStrings.xml']());
      shared = kids(doc.documentElement, 'si').map(stringOf);
    }

    const wb = await need('xl/workbook.xml');
    const rels = await need('xl/_rels/workbook.xml.rels');
    const relMap = {};
    for (const r of all(rels, 'Relationship')) relMap[r.getAttribute('Id')] = r.getAttribute('Target');

    const sheets = [];
    for (const s of all(wb, 'sheet')) {
      const rid = s.getAttribute('r:id') || s.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id');
      let target = relMap[rid];
      if (!target) continue;
      target = target.startsWith('/') ? target.slice(1) : 'xl/' + target;
      if (!files[target]) continue;
      const doc = parseXml(await files[target]());
      const sheet = new Sheet(s.getAttribute('name') || '');
      for (const c of all(doc, 'c')) {
        const ref = c.getAttribute('r');
        const m = ref && /^([A-Z]+)(\d+)$/.exec(ref);
        if (!m) continue;
        const type = c.getAttribute('t');
        const vNode = kids(c, 'v')[0];
        let value;
        if (type === 'inlineStr') {
          const is = kids(c, 'is')[0];
          value = is ? stringOf(is) : '';
        } else if (!vNode) {
          continue;
        } else if (type === 's') {
          value = shared[Number(vNode.textContent)] || '';
        } else if (type === 'str' || type === 'e') {
          value = vNode.textContent;
        } else if (type === 'b') {
          value = vNode.textContent === '1';
        } else {
          const n = Number(vNode.textContent);
          value = isNaN(n) ? vNode.textContent : n;
        }
        if (value === '' || value == null) continue;
        sheet.set(Number(m[2]), colToIndex(m[1]), value);
      }
      sheets.push(sheet);
    }
    return { sheets };
  }

  global.XlsxLite = { read };
})(window);
