/* FinStack — views, charts, privacy toggles, import flow. */
(function () {
  'use strict';

  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const sum = FinData.sum;
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* private mode */ } },
    del(k) { try { localStorage.removeItem(k); } catch (e) { /* ignore */ } },
  };

  /* ---------- Icons ---------- */
  const svg = (d, extra) => `<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ${extra || ''}>${d}</svg>`;
  const I = {
    eye: svg('<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>'),
    eyeOff: svg('<path d="M3 3l18 18"/><path d="M10.6 5.1A10.8 10.8 0 0 1 12 5c6.4 0 10 7 10 7a17.6 17.6 0 0 1-3.2 4.1M6.5 6.6C3.7 8.5 2 12 2 12s3.6 7 10 7a9.8 9.8 0 0 0 4.3-1"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/>'),
    close: svg('<path d="M6 6l12 12M18 6 6 18"/>'),
    home: svg('<path d="M4 11.5 12 4l8 7.5"/><path d="M6 10v9h12v-9"/>'),
    layers: svg('<path d="m12 3 9 4.5-9 4.5-9-4.5L12 3Z"/><path d="m3 12 9 4.5 9-4.5"/><path d="m3 16.5 9 4.5 9-4.5"/>'),
    chart: svg('<path d="M4 20V10M10 20V4M16 20v-7M21 20H3"/>'),
    wallet: svg('<path d="M4 7h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7Zm0 0V6a2 2 0 0 1 2-2h10"/><circle cx="16" cy="13.5" r="1.2"/>'),
    bank: svg('<path d="M3 9.5 12 4l9 5.5"/><path d="M5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 20h18"/>'),
    card: svg('<rect x="3" y="5.5" width="18" height="13" rx="2.5"/><path d="M3 10h18M7 15h3"/>'),
    shield: svg('<path d="M12 3 5 6v5.5c0 4.3 2.9 7.6 7 9.5 4.1-1.9 7-5.2 7-9.5V6l-7-3Z"/>'),
    download: svg('<path d="M12 4v12M7.5 11.5 12 16l4.5-4.5"/><path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/>'),
    upload: svg('<path d="M12 16V4M7.5 8.5 12 4l4.5 4.5"/><path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/>'),
    user: svg('<circle cx="12" cy="8" r="3.5"/><path d="M5 20c.8-3.5 3.6-5.5 7-5.5s6.2 2 7 5.5"/>'),
    sun: svg('<circle cx="12" cy="12" r="4"/><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8"/>'),
    sunset: svg('<path d="M12 3v5M9.5 5.5 12 8l2.5-2.5"/><path d="M6 17a6 6 0 0 1 12 0"/><path d="M2 17h3M19 17h3M4 21h16"/>'),
    moon: svg('<path d="M20 14.5A8.5 8.5 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5Z"/>'),
    arrow: svg('<path d="M5 12h14M13 6l6 6-6 6"/>'),
    plus: svg('<path d="M12 5v14M5 12h14"/>'),
    trash: svg('<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>'),
    reset: svg('<path d="M4 12a8 8 0 1 0 2.6-5.9"/><path d="M4 4v4.5h4.5"/>'),
    ok: svg('<circle cx="12" cy="12" r="9"/><path class="tick" pathLength="1" d="m8 12.3 2.8 2.8L16.2 9.5"/>'),
    warn: svg('<path d="M12 4 2.8 19.5h18.4L12 4Z"/><path d="M12 10v4.5M12 17.2v.1"/>'),
    bad: svg('<circle cx="12" cy="12" r="9"/><path d="M12 7.5v5.5M12 16.2v.1"/>'),
    info: svg('<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5M12 7.8v.1"/>'),
    bolt: svg('<path d="M13 3 5 13.5h6L10 21l8-10.5h-6L13 3Z"/>'),
    clock: svg('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
    calendar: svg('<rect x="3.5" y="5" width="17" height="15" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>'),
    pencil: svg('<path d="M4 20h4L19 9l-4-4L4 16v4Z"/><path d="m13.5 6.5 4 4"/>'),
    minus: svg('<path d="M5 12h14"/>'),
    type: svg('<path d="M5 7V5h14v2M12 5v14M9 19h6"/>'),
    plane: svg('<path d="M3 13.5 21 5l-4.5 15-4-6.5-9.5 0Z"/><path d="m12.5 13.5 4-5"/>'),
  };
  const S = ['var(--s1)', 'var(--s2)', 'var(--s3)', 'var(--s4)', 'var(--s5)', 'var(--s6)', 'var(--s7)', 'var(--s8)'];

  /* ---------- State ---------- */
  const state = { model: FinData.load(), m: null, reveal: false, tiles: new Set(), budgetTab: null, yearly: false, justAdded: -1, editMonthly: false, addedPath: '' };
  const recalc = () => { state.m = FinData.metrics(state.model); };
  recalc();
  const displayName = () => {
    const saved = store.get('finstack.name');
    if (saved != null) return saved;
    return state.model.meta.sample ? '' : ((state.model.income[0] || {}).name || '');
  };

  /* ---------- Money formatting + masking ---------- */
  const inr = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });
  const trim = (n, d) => String(Number(n.toFixed(d)));
  const fmtFull = (v) => (v < 0 ? '−' : '') + '₹' + inr.format(Math.abs(Math.round(v)));
  function fmtCompact(v) {
    const a = Math.abs(v), sign = v < 0 ? '−' : '';
    if (a >= 1e7) return sign + '₹' + trim(a / 1e7, 2) + ' Cr';
    if (a >= 1e5) return sign + '₹' + trim(a / 1e5, 2) + ' L';
    if (a >= 1e3) return sign + '₹' + trim(a / 1e3, 1) + 'K';
    return fmtFull(v);
  }
  const pct = (x, d) => (isFinite(x) ? trim(x * 100, d == null ? 0 : d) : '0') + '%';
  const amt = (v, compact, cls) => `<span class="amt ${cls || ''}" data-v="${Number(v) || 0}"${compact ? ' data-c' : ''}></span>`;

  function isVisible(el) {
    const tile = el.closest('[data-tile]');
    return tile ? state.tiles.has(tile.dataset.tile) : state.reveal;
  }
  function countUp(el, to, f) {
    cancelAnimationFrame(el._raf);
    if (reduceMotion) { el.textContent = f(to); return; }
    const t0 = performance.now(), dur = 900;
    (function step(now) {
      const p = Math.min(1, (now - t0) / dur);
      el.textContent = f(to * (1 - Math.pow(1 - p, 4)));
      if (p < 1) el._raf = requestAnimationFrame(step);
    })(t0);
  }
  /* Write every amount under root: masked dots, or the number (counting up when revealed). */
  function paint(root, animate) {
    for (const el of $$('.amt', root || document)) {
      const f = el.hasAttribute('data-c') ? fmtCompact : fmtFull;
      const v = Number(el.dataset.v);
      const show = isVisible(el);
      const was = el.classList.contains('shown');
      el.classList.toggle('shown', show);
      el.classList.toggle('masked', !show);
      if (!show) { cancelAnimationFrame(el._raf); el.textContent = '₹ ••••'; el.setAttribute('aria-label', 'Hidden amount'); continue; }
      el.removeAttribute('aria-label');
      if (animate && !was) countUp(el, v, f); else { cancelAnimationFrame(el._raf); el.textContent = f(v); }
    }
    const all = $('#eye-all');
    all.innerHTML = state.reveal ? I.eye : I.eyeOff;
    all.setAttribute('aria-pressed', String(state.reveal));
    all.setAttribute('aria-label', state.reveal ? 'Hide all amounts' : 'Show all amounts');
    for (const b of $$('[data-action="tile-eye"]')) {
      const on = state.tiles.has(b.dataset.id);
      b.innerHTML = on ? I.eye : I.eyeOff;
      b.setAttribute('aria-pressed', String(on));
    }
  }

  /* ---------- Small building blocks ---------- */
  const KIND_ICON = { good: I.ok, warn: I.warn, bad: I.bad, info: I.info };
  const chip = (kind, text) => `<span class="chip chip-${kind}">${KIND_ICON[kind]}<span>${esc(text)}</span></span>`;
  const head = (title, sub) => `<header class="page-head" data-reveal><h1>${esc(title)}</h1><p>${sub}</p></header>`;
  const stat = (label, value, note, i) => `<div class="stat" data-reveal style="--i:${i || 0}"><span class="stat-label">${esc(label)}</span><span class="stat-value">${value}</span>${note ? `<span class="stat-note">${note}</span>` : ''}</div>`;
  const card = (title, body, opts) => {
    const o = opts || {};
    return `<section class="card ${o.cls || ''}" data-reveal style="--i:${o.i || 0}">${title ? `<div class="card-head"><h2>${esc(title)}</h2>${o.aside || ''}</div>` : ''}${o.sub ? `<p class="card-sub">${o.sub}</p>` : ''}${body}</section>`;
  };
  const empty = (text) => `<p class="empty">${esc(text)}</p>`;

  const ASSET_NAMES = { mf: 'Mutual Funds', etf: 'ETFs', fd: 'Fixed Deposits', debtfund: 'Debt Fund', stocksequity: 'Stocks', cash: 'Cash' };
  const assetName = (n) => ASSET_NAMES[String(n).toLowerCase().replace(/[^a-z]/g, '')] || n;

  /* Donut with legend; hover / tap a slice or a legend row to inspect it. */
  function donut(items, centerLabel) {
    items = items.filter((it) => it.value > 0);
    const total = sum(items, (it) => it.value);
    if (!total) return empty('Nothing to chart yet.');
    const C = 2 * Math.PI * 42, gap = items.length > 1 ? 1.3 : 0;
    let off = 0;
    const segs = items.map((it, i) => {
      const len = (it.value / total) * C;
      const s = `<circle class="dn-seg" data-seg="${i}" cx="50" cy="50" r="42" style="--len:${Math.max(len - gap, 0.2).toFixed(3)};--off:${(-off).toFixed(3)};--i:${i};stroke:${it.color}"/>`;
      off += len;
      return s;
    }).join('');
    const legend = items.map((it, i) => `<li data-seg="${i}" tabindex="0"><i style="background:${it.color}"></i><span class="lg-name">${esc(it.label)}</span><span class="lg-pct">${pct(it.value / total, 1)}</span>${amt(it.value, true, 'lg-val')}</li>`).join('');
    const data = esc(JSON.stringify({ label: centerLabel, total, items: items.map((it) => ({ l: it.label, v: it.value })) }));
    return `<div class="donut-wrap" data-donut="${data}">
      <div class="donut"><svg viewBox="0 0 100 100" role="img" aria-label="${esc(centerLabel)} breakdown"><circle class="dn-track" cx="50" cy="50" r="42"/>${segs}</svg>
        <div class="dn-center"><span class="dn-label">${esc(centerLabel)}</span>${amt(total, true, 'dn-value')}<span class="dn-pct"></span></div></div>
      <ul class="legend">${legend}</ul></div>`;
  }
  function focusSeg(wrap, idx) {
    const d = JSON.parse(wrap.dataset.donut);
    const it = idx == null ? null : d.items[idx];
    $$('[data-seg]', wrap).forEach((el) => el.classList.toggle('active', it != null && Number(el.dataset.seg) === idx));
    wrap.classList.toggle('focused', it != null);
    $('.dn-label', wrap).textContent = it ? it.l : d.label;
    $('.dn-value', wrap).dataset.v = it ? it.v : d.total;
    $('.dn-pct', wrap).textContent = it ? pct(it.v / d.total, 1) + ' of total' : '';
    paint(wrap.querySelector('.dn-center'));
  }

  /* Progress ring with content in the middle. */
  function ring(frac, inner, cls) {
    const C = 2 * Math.PI * 44;
    return `<div class="ring ${cls || ''}"><svg viewBox="0 0 100 100" aria-hidden="true"><circle class="ring-track" cx="50" cy="50" r="44"/><circle class="ring-fill" cx="50" cy="50" r="44" style="--c:${C.toFixed(2)};--to:${(C * (1 - Math.max(0, Math.min(1, frac)))).toFixed(2)}"/></svg><div class="ring-inner">${inner}</div></div>`;
  }
  const bar = (frac, color, extra) => `<div class="bar"><i style="--w:${Math.max(0, Math.min(1, frac)) * 100}%;${color ? 'background:' + color : ''}"></i>${extra || ''}</div>`;

  /* ---------- Health checks ---------- */
  function emergencyVerdict(months) {
    if (months >= 6) return { kind: 'good', word: 'Excellent' };
    if (months >= 3) return { kind: 'good', word: 'Healthy' };
    if (months >= 1) return { kind: 'warn', word: 'Still building' };
    return { kind: 'bad', word: 'Needs attention' };
  }
  function pulse() {
    const { m, model } = state, out = [];
    if (m.emergencyTotal || m.essentials) {
      const v = emergencyVerdict(m.runway);
      out.push({ kind: v.kind, title: `Emergency fund is ${v.word.toLowerCase()}`, detail: `Covers ${trim(m.runway, 1)} months of essential spending (goal: 6).`, href: '#/emergency' });
    }
    if (m.income) {
      const r = m.savingsRate, k = r >= 0.3 ? 'good' : r >= 0.2 ? 'good' : r >= 0.1 ? 'warn' : 'bad';
      const w = r >= 0.3 ? 'excellent' : r >= 0.2 ? 'on track' : 'low';
      out.push({ kind: k, title: `Savings rate is ${w}`, detail: `${pct(r, 1)} of income goes to savings and investments.`, href: '#/budget' });
      out.push(m.unallocated >= 0
        ? { kind: 'good', title: 'Budget is within income', detail: `${amt(m.unallocated)} left unallocated each month.`, href: '#/budget' }
        : { kind: 'bad', title: 'Budget exceeds income', detail: `Planned spending is ${amt(-m.unallocated)} over monthly income.`, href: '#/budget' });
    }
    if (model.monthly.expenses.length || m.billsNow) {
      out.push(m.monthLeft >= 0
        ? { kind: 'good', title: `${model.monthly.label || 'This month'} is in surplus`, detail: `${amt(m.monthLeft)} left after household costs and card bills.`, href: '#/monthly' }
        : { kind: 'bad', title: `${model.monthly.label || 'This month'} is running short`, detail: `Spending is ${amt(-m.monthLeft)} more than the money coming in.`, href: '#/monthly' });
    }
    if (model.banks.length) {
      const low = m.lowAccounts;
      out.push(low.length
        ? { kind: 'warn', title: `${low.length} account${low.length > 1 ? 's' : ''} below minimum balance`, detail: esc(low.map((b) => `${b.bank}${b.holder ? ' (' + b.holder.split(' ')[0] + ')' : ''}`).join(', ')) + ' — top up to avoid charges.', href: '#/banks' }
        : { kind: 'good', title: 'All accounts above minimum balance', detail: 'No non-maintenance charges expected.', href: '#/banks' });
    }
    if (model.shield.length) {
      out.push({ kind: 'good', title: 'Insurance shield is in place', detail: esc(model.shield.map((s) => s.name.trim()).join(' · ')), href: '#/emergency' });
    }
    if (m.cardLimit && m.billsTotal) {
      const u = m.utilisation;
      out.push({ kind: u < 0.3 ? 'good' : u < 0.5 ? 'warn' : 'bad', title: `Credit utilisation is ${u < 0.1 ? 'excellent' : u < 0.3 ? 'healthy' : 'high'}`, detail: `${pct(u, 1)} of total card limit used on the latest statement.`, href: '#/cards' });
    }
    return out;
  }

  /* ---------- Views ---------- */
  const views = {};

  function greeting(d) {
    const h = d.getHours();
    if (h >= 5 && h < 12) return ['Good Morning', I.sun, 'Here is where things stand this morning.'];
    if (h >= 12 && h < 17) return ['Good Afternoon', I.sun, 'Here is where things stand today.'];
    if (h >= 17) return ['Good Evening', I.sunset, 'Here is where things stand this evening.'];
    return ['Good Night', I.moon, 'A quiet look at where things stand.'];
  }
  function tick() {
    const d = new Date(), hm = $('#clk-hm');
    if (!hm) return;
    const p = (n) => String(n).padStart(2, '0');
    hm.textContent = p(d.getHours() % 12 || 12) + ':' + p(d.getMinutes());
    $('#clk-s').textContent = p(d.getSeconds());
    $('#clk-ap').textContent = d.getHours() < 12 ? 'AM' : 'PM';
    $('#date').textContent = d.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    const g = greeting(d);
    if ($('#greet-text').textContent !== g[0]) { $('#greet-text').textContent = g[0]; $('#greet-icon').innerHTML = g[1]; $('#greet-sub').textContent = g[2]; }
  }

  views.dashboard = function () {
    const { m, model } = state;
    const name = displayName();
    const v = emergencyVerdict(m.runway);
    const holders = new Set(model.banks.map((b) => b.holder)).size;
    const classes = model.holdings.rows.length || new Set(model.funds.map((f) => f.type)).size;
    const tiles = [
      { id: 'net', label: 'Total Net Worth', icon: I.layers, v: m.netWorth, sub: 'Banks, investments and reserves', href: '' },
      { id: 'bank', label: 'Bank Liquidity', icon: I.bank, v: m.bankTotal, sub: `${model.banks.length} accounts · ${holders} holder${holders === 1 ? '' : 's'}`, href: '#/banks' },
      { id: 'port', label: 'Portfolio Assets', icon: I.chart, v: m.portfolio, sub: `${model.funds.length} funds · long-term holdings`, href: '#/investments' },
      { id: 'emer', label: 'Emergency Reserve', icon: I.shield, v: m.emergencyTotal, sub: chip(v.kind, `${v.word} · ${trim(m.runway, 1)} mo`), raw: true, href: '#/emergency' },
    ].map((t, i) => `<article class="tile ${i === 0 ? 'tile-hero' : ''}" data-tile="${t.id}" data-reveal style="--i:${i}">
        <div class="tile-top"><span class="tile-icon">${t.icon}</span><span class="tile-label">${t.label}</span>
          <button class="eye" data-action="tile-eye" data-id="${t.id}" aria-label="Show or hide ${t.label}" aria-pressed="false"></button></div>
        <div class="tile-value">${amt(t.v)}</div>
        <div class="tile-sub"><span>${t.raw ? t.sub : esc(t.sub)}</span>${t.href ? `<a class="tile-link" href="${t.href}" aria-label="Open ${t.label}">${I.arrow}</a>` : ''}</div>
      </article>`).join('');

    const checks = pulse();
    const pass = checks.filter((c) => c.kind === 'good').length;
    const todo = checks.length - pass;
    const pulseBody = checks.length ? `<div class="pulse">
        ${ring(checks.length ? pass / checks.length : 0, `<b>${pass}<small>/${checks.length}</small></b><span>checks passed</span>`, todo ? '' : 'ring-good')}
        <div class="pulse-text"><h3>${todo ? `Strong, with ${todo} thing${todo > 1 ? 's' : ''} to look at` : 'Everything looks excellent'}</h3>
        <ul class="checks">${checks.map((c, i) => `<li class="check check-${c.kind}" style="--i:${i}"><a href="${c.href}">${KIND_ICON[c.kind]}<span><b>${esc(c.title)}</b><small>${c.detail}</small></span></a></li>`).join('')}</ul></div>
      </div>` : empty('Import your workbook to see your financial pulse.');

    const mix = model.holdings.rows.map((r, i) => ({ label: assetName(r.name), value: sum(r.values), color: S[i % 8] }));
    const g = greeting(new Date());
    const flow = budgetStack();
    const netNote = `<details class="note"><summary>How net worth is calculated</summary>
      <p>Bank balances ${amt(m.bankTotal)} + investments and reserves ${amt(m.investedTotal)} − reserve cash already counted in the bank balances ${amt(m.cashOverlap)}. Assets only; card dues and EMIs are not deducted.</p></details>`;

    return `
      <section class="hero" data-reveal>
        <p class="hero-kicker"><span id="greet-icon">${g[1]}</span><span id="date"></span></p>
        <h1 class="greet"><span id="greet-text">${g[0]}</span>${name ? `, <em>${esc(name)}</em>` : ''}</h1>
        <div class="clock" aria-live="off"><span id="clk-hm">--:--</span><span class="clk-s" id="clk-s">--</span><span class="clk-ap" id="clk-ap"></span></div>
        <p class="hero-sub" id="greet-sub">${g[2]}</p>
      </section>
      ${model.meta.sample ? `<section class="banner" data-reveal><div>${I.info}<p><b>You are viewing sample data.</b> Import your Excel workbook to see your own numbers — it stays on this device.</p></div><span class="tool-btns"><a class="btn" href="assets/FinStack-template.xlsx" download="FinStack-template.xlsx">${I.download}Get template</a><button class="btn btn-primary" data-action="import">${I.upload}Import Excel</button></span></section>` : ''}
      <section class="tiles">${tiles}</section>
      ${netNote}
      <div class="grid2">
        ${card('Financial pulse', pulseBody, { i: 0 })}
        ${card('Where your money sits', donut(mix, 'Invested'), { i: 1, aside: `<a class="more" href="#/investments">Details ${I.arrow}</a>` })}
      </div>
      ${flow ? card('Monthly money flow', flow, { aside: `<a class="more" href="#/budget">Budget ${I.arrow}</a>` }) : ''}
      <nav class="quick" aria-label="Sections">${NAV.slice(1).map((n, i) => `<a href="#/${n.route}" data-reveal style="--i:${i}">${n.icon}<span>${n.label}</span>${I.arrow}</a>`).join('')}</nav>`;
  };

  /* Income split into needs / wants / savings / insurance / unallocated. */
  function budgetStack() {
    const { m } = state;
    if (!m.income && !m.allocated) return '';
    const parts = [
      { label: 'Needs', value: m.needs, color: S[0] }, { label: 'Wants', value: m.wants, color: S[1] },
      { label: 'Savings', value: m.savings, color: S[2] }, { label: 'Insurance', value: m.insurance, color: S[3] },
      { label: 'Unallocated', value: Math.max(0, m.unallocated), color: 'var(--neutral)' },
    ].filter((p) => p.value > 0);
    const total = sum(parts, (p) => p.value);
    return `<div class="stack-top"><span>Monthly income</span>${amt(m.income)}</div>
      <div class="stack" role="img" aria-label="Monthly income split">${parts.map((p) => `<i style="flex:${p.value};background:${p.color}" title="${esc(p.label)} ${pct(p.value / total, 1)}"></i>`).join('')}</div>
      <ul class="legend legend-row">${parts.map((p) => `<li><i style="background:${p.color}"></i><span class="lg-name">${p.label}</span><span class="lg-pct">${pct(p.value / total, 1)}</span>${amt(p.value, true, 'lg-val')}</li>`).join('')}</ul>`;
  }

  views.investments = function () {
    const { m, model } = state;
    const H = model.holdings;
    const mix = H.rows.map((r, i) => ({ label: assetName(r.name), value: sum(r.values), color: S[i % 8] }));
    const colTotals = H.cols.map((_, ci) => sum(H.rows, (r) => r.values[ci]));
    const max = Math.max(1, ...H.rows.flatMap((r) => r.values));
    const split = H.rows.length ? `<ul class="legend legend-row">${H.cols.map((c, i) => `<li><i style="background:${S[i]}"></i><span class="lg-name">${esc(c)}</span></li>`).join('')}</ul>
      <div class="pairs">${H.rows.map((r) => `<div class="pair"><span class="pair-name">${esc(assetName(r.name))}</span><div class="pair-bars">${r.values.map((v, i) => `<div class="pair-row">${bar(v / max, S[i])}${amt(v, true)}</div>`).join('')}</div></div>`).join('')}</div>` : empty('No holdings summary found.');

    const types = [];
    model.funds.forEach((f) => { if (!types.includes(f.type)) types.push(f.type); });
    const targeted = sum(model.funds.filter((f) => model.fundTargets[f.type] != null), (f) => sum(Object.values(f.amounts)));
    const funds = types.map((t) => {
      const list = model.funds.filter((f) => f.type === t);
      const total = sum(list, (f) => sum(Object.values(f.amounts)));
      const target = model.fundTargets[t];
      let tag = '';
      if (target != null && targeted) {
        const actual = (total / targeted) * 100, diff = Math.abs(actual - target);
        tag = `<span class="fund-target">Target ${trim(target, 1)}% · Actual ${trim(actual, 1)}%</span>${chip(diff <= 2 ? 'good' : 'warn', diff <= 2 ? 'On target' : `Off by ${trim(diff, 1)} pts`)}`;
      }
      return `<div class="fund-group"><div class="fund-head"><h3>${esc(t)}</h3>${amt(total, true)}<span class="grow"></span>${tag}</div>
        ${list.map((f) => {
          const owners = model.fundOwners.filter((o) => f.amounts[o.key] > 0);
          const done = owners.length && owners.every((o) => /done/i.test(f.status[o.key] || ''));
          return `<div class="fund"><div class="fund-name"><b>${esc(f.name)}</b><span>${owners.map((o) => `${esc(o.name)} ${amt(f.amounts[o.key], true)}`).join(' · ')}</span></div>${chip(done ? 'good' : 'info', done ? 'Invested' : 'Pending')}</div>`;
        }).join('')}</div>`;
    }).join('');

    return head('Investment Portfolio', 'Every holding, who owns it, and how it tracks against your plan.') +
      `<div class="stats">${stat('Portfolio assets', amt(m.portfolio), 'Excludes emergency reserve', 0)}${H.cols.map((c, i) => stat(c, amt(colTotals[i]), 'All holdings', i + 1)).join('')}</div>
      <div class="grid2">${card('Asset mix', donut(mix, 'Invested'))}${card('By person', split, { i: 1 })}</div>
      ${card('Funds and deposits', funds || empty('No funds found in the workbook.'), { sub: model.funds.length ? `${model.funds.length} holdings across ${types.length} categories. Targets compare each category against the planned allocation.` : '' })}`;
  };

  function catPanel() {
    const groups = state.model.budget.groups;
    const g = groups.find((x) => x.key === state.budgetTab) || groups[0];
    if (!g) return empty('No budget categories found.');
    const key = state.yearly ? 'yearly' : 'monthly';
    const items = g.items.slice().sort((a, b) => b[key] - a[key]);
    const max = Math.max(1, ...items.map((i) => i[key]));
    const total = sum(items, (i) => i[key]);
    return `<div class="tabs" role="tablist">${groups.map((x) => `<button role="tab" aria-selected="${x === g}" class="tab ${x === g ? 'on' : ''}" data-action="tab" data-id="${esc(x.key)}">${esc(x.name)}</button>`).join('')}
        <span class="grow"></span><div class="seg"><button class="${state.yearly ? '' : 'on'}" data-action="period" data-id="m">Monthly</button><button class="${state.yearly ? 'on' : ''}" data-action="period" data-id="y">Yearly</button></div></div>
      <div class="rows in">${items.map((it, i) => `<div class="row" style="--i:${i}"><span class="row-name">${esc(it.name)}</span>${bar(it[key] / max, 'var(--s1)')}${amt(it[key])}</div>`).join('')}
        <div class="row row-total"><span class="row-name">Total</span><span></span>${amt(total)}</div></div>`;
  }

  views.budget = function () {
    const { m, model } = state;
    if (!state.budgetTab && model.budget.groups[0]) state.budgetTab = model.budget.groups[0].key;
    const actual = { needs: m.needs, wants: m.wants, savings: m.savings, insurance: m.insurance, cash: Math.max(0, m.unallocated) };
    const targets = model.budget.targets.map((t) => {
      const k = t.name.toLowerCase(), a = actual[k];
      if (a == null) return '';
      const hi = Math.max(a, t.amount) || 1, saver = k === 'savings' || k === 'cash';
      const diff = a - t.amount;
      const ok = saver ? diff >= 0 : diff <= 0;
      const label = diff === 0 ? 'On target' : `${fmtCompact(Math.abs(diff)).replace('₹', '')} ${diff > 0 ? 'over' : 'under'}`;
      return `<div class="target"><div class="target-top"><b>${esc(k === 'cash' ? 'Cash (unallocated)' : t.name)}</b><span class="grow"></span>${state.reveal ? chip(ok ? 'good' : 'warn', label) : chip(ok ? 'good' : 'warn', diff === 0 ? 'On target' : diff > 0 ? 'Over target' : 'Under target')}</div>
        ${bar(a / hi, 'var(--s1)', `<u style="left:${(t.amount / hi) * 100}%"></u>`)}
        <div class="target-foot"><span>Planned ${amt(a)}</span><span>Target ${amt(t.amount)}</span></div></div>`;
    }).join('');

    const rule = m.income ? [['Needs', (m.needs + m.insurance) / m.income, 0.5, false, 'incl. insurance'], ['Wants', m.wants / m.income, 0.3, false, ''], ['Savings', m.savings / m.income, 0.2, true, '']]
      .map(([n, a, t, higher, note]) => {
        const ok = higher ? a >= t : a <= t;
        return `<div class="rule"><div class="rule-top"><b>${n}</b>${note ? `<small>${note}</small>` : ''}<span class="grow"></span><span class="rule-num">${pct(a, 1)} <small>vs ${higher ? 'at least' : 'up to'} ${pct(t)}</small></span></div>${bar(a, 'var(--s1)', `<u style="left:${t * 100}%"></u>`)}<div class="rule-foot">${chip(ok ? 'good' : 'warn', ok ? (higher ? 'Ahead of guideline' : 'Within guideline') : (higher ? 'Below guideline' : 'Above guideline'))}</div></div>`;
      }).join('') : empty('Add income to compare against the 50/30/20 guideline.');

    const maxInc = Math.max(1, ...model.income.map((i) => i.amount));
    return head('Budget Plan', 'How each month of income is put to work.') +
      `<div class="stats">${stat('Monthly income', amt(m.income), '', 0)}${stat('Allocated', amt(m.allocated), m.income ? pct(m.allocated / m.income, 1) + ' of income' : '', 1)}${stat('Unallocated', amt(m.unallocated), 'Free cash each month', 2)}${stat('Savings rate', `<span class="plain">${pct(m.savingsRate, 1)}</span>`, chip(m.savingsRate >= 0.2 ? 'good' : 'warn', m.savingsRate >= 0.3 ? 'Excellent' : m.savingsRate >= 0.2 ? 'On track' : 'Low'), 3)}</div>
      ${card('Monthly money flow', budgetStack() || empty('No budget found.'))}
      <div class="grid2">
        ${card('Income', model.income.length ? `<div class="rows">${model.income.map((p, i) => `<div class="row" style="--i:${i}"><span class="row-name">${esc(p.name)}</span>${bar(p.amount / maxInc, 'var(--s1)')}${amt(p.amount)}</div>`).join('')}</div>` : empty('No income rows found.'))}
        ${card('Plan vs your targets', targets || empty('No targets found.'), { i: 1, sub: targets ? 'The marker shows your target for each bucket.' : '' })}
      </div>
      ${card('The 50 / 30 / 20 guideline', rule, { sub: 'A common rule of thumb: up to 50% on needs, up to 30% on wants, at least 20% saved.' })}
      ${card('Categories', `<div id="cat-panel">${catPanel()}</div>`)}`;
  };

  views.banks = function () {
    const { m, model } = state;
    const max = Math.max(1, ...model.banks.map((b) => Math.max(b.balance, b.min)));
    const holders = [];
    model.banks.forEach((b) => { if (!holders.includes(b.holder)) holders.push(b.holder); });
    const groups = holders.map((h, gi) => {
      const list = model.banks.map((b, idx) => ({ b, idx })).filter((x) => x.b.holder === h);
      return card(h || 'Accounts', `<div class="accounts">${list.map(({ b, idx }) => {
        const low = b.min > 0 && b.balance < b.min;
        return `<div class="account ${idx === state.justAdded ? 'just-added' : ''}">
          <span class="avatar">${esc(b.bank.replace(/[^A-Za-z]/g, '').slice(0, 2).toUpperCase() || '₹')}</span>
          <div class="account-main"><div class="account-top"><b>${esc(b.bank)}</b><span class="grow"></span>${amt(b.balance)}</div>
            <div class="account-sub"><span>${esc(b.purpose || 'Account')}</span><span class="grow"></span>${b.min ? `<span>Min ${amt(b.min, true)}</span>` : '<span>No minimum</span>'}</div>
            ${bar(b.balance / max, 'var(--s1)', b.min ? `<u style="left:${(b.min / max) * 100}%"></u>` : '')}
            <div class="account-foot">${chip(low ? 'warn' : 'good', low ? 'Below minimum balance' : b.min ? 'Above minimum' : 'Healthy')}${low ? `<span class="hint">Short by ${amt(b.min - b.balance)}</span>` : ''}<span class="grow"></span>${b.manual ? `<button class="link-btn" data-action="del-account" data-id="${idx}">${I.trash}Remove</button>` : ''}</div>
          </div></div>`;
      }).join('')}</div>`, { i: gi, aside: amt(sum(list, (x) => x.b.balance), false, 'aside-amt') });
    }).join('');
    return head('Bank Accounts', 'Balances, minimums and what each account is for.') +
      `<div class="stats">${stat('Bank liquidity', amt(m.bankTotal), `${model.banks.length} accounts`, 0)}${stat('Locked as minimum', amt(m.bankMin), 'Must stay in the accounts', 1)}${stat('Free to use', amt(Math.max(0, m.bankTotal - m.bankMin)), 'Above minimum balances', 2)}</div>
      <div class="toolbar" data-reveal><span>${m.lowAccounts.length ? chip('warn', `${m.lowAccounts.length} below minimum`) : chip('good', 'All accounts above minimum')}</span><button class="btn btn-primary" data-action="add-account">${I.plus}Add account</button></div>
      ${groups || card('', empty('No bank accounts yet. Import your workbook or add one.'))}`;
  };

  const GRADS = ['linear-gradient(135deg,#1f3a5f,#0e1b2e)', 'linear-gradient(135deg,#3b2a55,#17102a)', 'linear-gradient(135deg,#14493f,#0a211d)', 'linear-gradient(135deg,#5a2f2a,#261210)', 'linear-gradient(135deg,#3d3d3a,#161615)', 'linear-gradient(135deg,#4b3b16,#1f1808)'];
  const hash = (s) => Array.from(s).reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) >>> 0, 7);
  const lounge = (v, unit) => { const t = String(v || '').trim(); if (!t || t === '0') return 'None'; return /^\d+$/.test(t) ? `${t} / ${unit}` : t; };

  function emiList() {
    return `<div class="emis">${state.model.emis.map((e, i) => {
      const done = e.total > 0 && e.paid >= e.total;
      return `<div class="emi" style="--i:${i}"><div class="emi-top"><b>${esc(e.name || 'EMI')}</b><span class="grow"></span>${amt(e.monthly)}<small>/mo</small></div>
        ${bar(e.total ? e.paid / e.total : 0, done ? 'var(--good)' : 'var(--s1)')}
        <div class="emi-foot"><span>${e.total ? `${e.paid} of ${e.total} paid` : ''}${e.end ? ` · ends ${esc(e.end)}` : ''}${e.bank ? ` · ${esc(e.bank)}` : ''}</span><span class="grow"></span>${done ? chip('good', 'Completed') : chip('info', `${Math.max(0, e.total - e.paid)} left`)}</div></div>`;
    }).join('')}</div>`;
  }

  views.cards = function () {
    const { m, model } = state;
    const owners = [];
    model.cards.forEach((c) => { if (!owners.includes(c.owner)) owners.push(c.owner); });
    const sections = owners.map((o, oi) => {
      const list = model.cards.filter((c) => c.owner === o);
      return card(o ? `${o}'s cards` : 'Cards', `<div class="cc-grid">${list.map((c, i) => `<article class="cc" style="--i:${i}">
          <div class="cc-face" style="background:${GRADS[hash(c.name) % GRADS.length]}"><div class="cc-top"><b>${esc(c.name)}</b><span class="cc-chip"></span></div>
            <div class="cc-bottom"><div><small>Credit limit</small>${amt(c.limit)}</div><span>${esc(o)}</span></div></div>
          <dl class="cc-info"><div><dt>${I.plane}Domestic lounge</dt><dd>${esc(lounge(c.domestic, 'quarter'))}</dd></div><div><dt>${I.plane}International lounge</dt><dd>${esc(lounge(c.intl, 'year'))}</dd></div>
            <div><dt>Annual fee</dt><dd>${!c.fee || c.fee === '0' ? chip('good', 'Lifetime free') : esc(/^\d+$/.test(c.fee) ? fmtFull(Number(c.fee)) : c.fee)}</dd></div>
            <div><dt>Lounge condition</dt><dd>${esc(c.condition || '—')}</dd></div></dl></article>`).join('')}</div>`,
        { i: oi, aside: `<span class="aside-note">Limit ${amt(sum(list, (c) => c.limit), true)}</span>` });
    }).join('');

    let bills = '';
    if (m.statement) {
      const items = m.statement.items.filter((b) => b.amount > 0).sort((a, b) => b.amount - a.amount);
      const max = Math.max(1, ...items.map((b) => b.amount));
      bills = card(m.statement.label, `<div class="rows">${items.map((b, i) => `<div class="row" style="--i:${i}"><span class="row-name">${esc(b.name)}</span>${bar(b.amount / max, 'var(--s1)')}${amt(b.amount)}</div>`).join('')}<div class="row row-total"><span class="row-name">Total</span><span></span>${amt(m.billsTotal)}</div></div>`,
        { aside: m.cardLimit ? chip(m.utilisation < 0.3 ? 'good' : 'warn', `${pct(m.utilisation, 1)} utilisation`) : '' });
    }
    const emis = model.emis.length ? card('EMI schedule', emiList(), { aside: `<span class="aside-note">Active ${amt(m.emiMonthly, true)}/mo</span>` }) : '';

    return head('Credit Cards', 'Limits, lounge access, fees and what is being paid off.') +
      `<div class="stats">${stat('Total credit limit', amt(m.cardLimit), `${model.cards.length} cards`, 0)}${m.billsTotal ? stat('Latest statement', amt(m.billsTotal), `${pct(m.utilisation, 1)} of limit used`, 1) : ''}${model.emis.length ? stat('Active EMIs', amt(m.emiMonthly), `${m.activeEmis} running · per month`, 2) : ''}</div>
      ${sections || card('', empty('No credit cards found in the workbook.'))}
      <div class="grid2">${bills}${emis}</div>`;
  };

  /* ---------- Monthly track (editable) ---------- */
  const fld = (path, value, num, label, cls) => `<input class="fld ${cls || ''}" data-bind="${path}" ${num ? 'type="number" inputmode="numeric" min="0" step="1"' : 'type="text" maxlength="40"'} value="${esc(value == null ? '' : value)}" placeholder="${esc(label)}" aria-label="${esc(label)}" autocomplete="off">`;
  const delBtn = (list, i, what) => `<button class="icon-btn sm" data-action="mt-del" data-list="${list}" data-id="${i}" aria-label="Remove ${esc(what || 'row')}">${I.trash}</button>`;
  const addBtn = (list, label) => `<button class="btn btn-ghost" data-action="mt-add" data-list="${list}">${I.plus}${label}</button>`;
  const fresh = (path) => (state.addedPath === path ? 'just-added' : '');
  const prevTag = () => { const p = state.model.monthly.prev; return p ? (p.label.replace(/credit card bills?/i, '').trim() || 'Last') : ''; };

  function mtStats() {
    const { m } = state, left = m.monthLeft;
    return stat('Money in', amt(m.monthIn), 'Salary and other credits', 0) + stat('Household expenses', amt(m.household), `${state.model.monthly.expenses.length} items`, 1) +
      stat('Card bills', amt(m.billsNow), 'Due this month', 2) +
      stat(left >= 0 ? 'Remaining' : 'Shortage', amt(Math.abs(left)), chip(left >= 0 ? 'good' : 'bad', left >= 0 ? 'Month is covered' : 'Spending exceeds income'), 3);
  }
  function amountRows(list, path, edit, addLabel, totalKey, hint) {
    const max = Math.max(1, ...list.map((x) => Number(x.amount) || 0));
    const body = edit
      ? list.map((x, i) => `<div class="erow ${fresh(path + '.' + i)}">${fld(`${path}.${i}.name`, x.name, false, 'Name')}${fld(`${path}.${i}.amount`, x.amount, true, 'Amount', 'num')}${delBtn(path, i, x.name)}</div>`).join('') + addBtn(path, addLabel)
      : (list.length ? list.map((x, i) => `<div class="row" style="--i:${i}"><span class="row-name">${esc(x.name || '—')}${hint ? hint(x) : ''}</span>${bar((Number(x.amount) || 0) / max, 'var(--s1)')}${amt(x.amount)}</div>`).join('') : empty('Nothing here yet. Tap Edit to add rows.'));
    return `<div class="rows">${body}<div class="row row-total"><span class="row-name">Total</span><span></span><span class="amt" data-total="${totalKey}" data-v="${state.m[totalKey]}"></span></div></div>`;
  }

  views.monthly = function () {
    const { m, model } = state, M = model.monthly, edit = state.editMonthly;
    const tag = prevTag();
    const prevOf = (x) => {
      const p = M.prev && M.prev.items.find((i) => i.name.toLowerCase() === String(x.name).toLowerCase());
      return p && p.amount ? `<small>${esc(tag)} ${amt(p.amount, true)}</small>` : '';
    };
    const income = edit
      ? `<div class="form-row"><label class="lbl">Salary credit (₹)${fld('monthly.salary', M.salary, true, 'Salary credit', 'num')}</label><label class="lbl">Misc credit (₹)${fld('monthly.misc', M.misc, true, 'Misc credit', 'num')}</label></div>`
      : `<div class="rows"><div class="row"><span class="row-name">Salary credit</span><span></span>${amt(M.salary)}</div><div class="row"><span class="row-name">Misc</span><span></span>${amt(M.misc)}</div><div class="row row-total"><span class="row-name">Total</span><span></span><span class="amt" data-total="monthIn" data-v="${m.monthIn}"></span></div></div>`;

    const emis = edit
      ? `<div class="emis">${model.emis.map((e, i) => `<div class="emi eemi ${fresh('emis.' + i)}">
          <div class="erow">${fld(`emis.${i}.name`, e.name, false, 'EMI name')}${fld(`emis.${i}.monthly`, e.monthly, true, 'Monthly', 'num')}${delBtn('emis', i, e.name)}</div>
          <div class="erow2"><span class="stepper"><button class="icon-btn sm" data-action="emi-step" data-id="${i}" data-d="-1" aria-label="One fewer paid">${I.minus}</button><b>${e.paid}</b><button class="icon-btn sm" data-action="emi-step" data-id="${i}" data-d="1" aria-label="One more paid">${I.plus}</button></span>
            <label class="inline">paid of ${fld(`emis.${i}.total`, e.total, true, 'Total months', 'tiny')}</label>${fld(`emis.${i}.end`, e.end, false, 'Ends', 'short')}${fld(`emis.${i}.bank`, e.bank, false, 'Card / bank', 'short')}</div></div>`).join('')}</div>${addBtn('emis', 'Add EMI')}`
      : (model.emis.length ? emiList() : empty('No EMIs running.'));

    const notes = edit
      ? `<div class="rows">${M.notes.map((n, i) => `<div class="erow erow-note ${fresh('monthly.notes.' + i)}">${fld(`monthly.notes.${i}.name`, n.name, false, 'Name')}${fld(`monthly.notes.${i}.amount`, n.amount, true, 'Amount', 'num')}${delBtn('monthly.notes', i, n.name)}${fld(`monthly.notes.${i}.note`, n.note, false, 'Note', 'wide')}</div>`).join('')}${addBtn('monthly.notes', 'Add note')}</div>`
      : `<div class="rows">${M.notes.map((n) => `<div class="row"><span class="row-name">${esc(n.name)}</span><span class="note-text">${esc(n.note)}</span>${amt(n.amount)}</div>`).join('')}</div>`;

    return head('Monthly Track', 'The month in progress — update it as bills and payments land.') +
      `<div class="toolbar" data-reveal>
        ${edit ? `<label class="lbl month-lbl">Month${fld('monthly.label', M.label, false, 'Month')}</label>` : `<span class="month">${I.calendar}<b>${esc(M.label || 'This month')}</b></span>`}
        <span class="tool-btns">${edit ? `<button class="btn btn-primary" data-action="mt-done">${I.ok}Done</button>` : `<button class="btn" data-action="mt-new">${I.calendar}Start new month</button><button class="btn btn-primary" data-action="mt-edit">${I.pencil}Edit</button>`}</span>
      </div>
      <div class="stats" id="mt-stats">${mtStats()}</div>
      ${edit ? `<p class="fine edit-note" data-reveal>${I.info} Changes save automatically on this device. Re-importing the Excel file replaces them.</p>` : ''}
      <div class="grid2">
        ${card('Household expenses', amountRows(M.expenses, 'monthly.expenses', edit, 'Add expense', 'household'))}
        <div class="col">${card('Money in', income, { i: 1 })}
          ${card('Credit card bills', amountRows(M.bills, 'monthly.bills', edit, 'Add card', 'billsNow', prevOf), { i: 2, sub: !edit && M.prev ? `Last statement (${esc(tag)}): ${amt(sum(M.prev.items, (i) => i.amount))}` : '' })}</div>
      </div>
      <div class="grid2">${card('EMI schedule', emis, { aside: `<span class="aside-note">Active <span class="amt" data-c data-total="emiMonthly" data-v="${m.emiMonthly}"></span>/mo</span>` })}
        ${edit || M.notes.length ? card('Other tracking', notes, { i: 1 }) : ''}</div>`;
  };

  /* Recompute and update the totals in place, without touching the inputs being typed in. */
  let saveTimer = 0;
  function monthlyChanged() {
    recalc();
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => FinData.save(state.model), 250);
    const stats = $('#mt-stats');
    if (stats) { stats.innerHTML = mtStats(); $$('[data-reveal]', stats).forEach((el) => el.classList.add('in')); }
    $$('[data-total]').forEach((el) => { el.dataset.v = state.m[el.dataset.total]; });
    paint($('#view'));
  }
  function listAt(path) {
    return path.split('.').reduce((o, k) => o[k], state.model);
  }
  function nextMonthLabel(label) {
    const d = new Date('1 ' + label);
    if (isNaN(d)) return FinData.monthLabel(new Date());
    d.setMonth(d.getMonth() + 1);
    return FinData.monthLabel(d);
  }

  function tierMeta(name) {
    if (/cash/i.test(name)) return { rank: 0, speed: 'Instant', note: 'Sitting in savings accounts, ready to transfer.', icon: I.bolt };
    if (/\bfd\b|deposit/i.test(name)) return { rank: 1, speed: 'About a day', note: 'Break the deposit early; a small penalty may apply.', icon: I.clock };
    if (/debt/i.test(name)) return { rank: 2, speed: '1–3 working days', note: 'Redeem units; money arrives after settlement.', icon: I.clock };
    return { rank: 3, speed: 'Varies', note: '', icon: I.clock };
  }
  const tiers = () => state.model.emergency.rows.map((r) => Object.assign({ name: assetName(r.name), total: sum(r.values), values: r.values }, tierMeta(r.name))).sort((a, b) => a.rank - b.rank);

  views.emergency = function () {
    const { m, model } = state;
    const v = emergencyVerdict(m.runway);
    const T = tiers();
    const E = model.emergency;
    const colTotals = E.cols.map((_, i) => sum(E.rows, (r) => r.values[i]));
    const maxCol = Math.max(1, ...colTotals);
    const step = m.emergencyTotal > 2e5 ? 10000 : 1000;
    const presets = [1, 3, 6].filter((n) => n * m.essentials <= m.emergencyTotal);

    const ladder = T.length ? `<ol class="ladder">${T.map((t, i) => `<li class="tier" style="--i:${i}"><span class="tier-n">${i + 1}</span><div class="tier-main">
        <div class="tier-top"><b>${esc(t.name)}</b><span class="tier-speed">${t.icon}${t.speed}</span><span class="grow"></span>${amt(t.total)}</div>
        <div class="bar sim-bar" data-tier="${i}"><i style="--w:100%"></i><s style="width:0%"></s></div>
        <div class="tier-foot"><span>${esc(t.note)}</span><span class="grow"></span><span class="tier-used" data-used="${i}"></span></div></div></li>`).join('')}</ol>` : empty('No emergency fund table found in the workbook.');

    const sim = T.length ? `<div class="sim"><label for="sim-range">If you suddenly needed</label>
        <div class="sim-need">${amt(0, false, 'sim-amt')}<span class="sim-pct" id="sim-pct">0% of reserve</span></div>
        <input type="range" id="sim-range" min="0" max="${m.emergencyTotal}" step="${step}" value="0" aria-label="Amount needed">
        <div class="sim-presets">${presets.map((n) => `<button class="pill" data-action="sim-preset" data-id="${n * m.essentials}">${n} month${n > 1 ? 's' : ''} of essentials</button>`).join('')}<button class="pill" data-action="sim-preset" data-id="0">Reset</button></div>
        <div class="sim-out"><div><span>Reserve left</span>${amt(m.emergencyTotal, false, 'sim-left')}</div><div><span>Runway left</span><b id="sim-runway">${trim(m.runway, 1)} months</b></div></div></div>` : '';

    return head('Emergency Deployment', 'What you can reach in a crisis, how fast, and in what order.') +
      `<section class="card em-hero" data-reveal>
        ${ring(m.runway / 12, `<b>${trim(m.runway, 1)}</b><span>months of runway</span>`, v.kind === 'good' ? 'ring-good ring-lg' : 'ring-lg')}
        <div class="em-text">${chip(v.kind, `Emergency fund is ${v.word.toLowerCase()}`)}
          <h2>${amt(m.emergencyTotal)}</h2>
          <p>Covers ${trim(m.runway, 1)} months of essential spending at ${amt(m.essentials, true)} a month (needs plus insurance). Six months is the usual goal${m.runway >= 6 ? ' — you are past it.' : '.'}</p></div>
      </section>
      <div class="grid2">
        ${card('Deployment order', ladder, { sub: T.length ? 'Use the fastest money first. Access times are typical; confirm with your bank or fund house.' : '' })}
        <div class="col">${sim ? card('Stress test', sim, { i: 1, sub: 'Drag to see which layers would be used.' }) : ''}
          ${E.cols.length ? card('Who holds the reserve', `<div class="rows">${E.cols.map((c, i) => `<div class="row" style="--i:${i}"><span class="row-name">${esc(c)}</span>${bar(colTotals[i] / maxCol, 'var(--s1)')}${amt(colTotals[i])}</div>`).join('')}</div>`, { i: 2 }) : ''}</div>
      </div>
      ${model.shield.length ? card('Emergency shield', `<ul class="shield">${model.shield.map((s, i) => `<li style="--i:${i}">${I.ok}<span><b>${esc(s.name)}</b><small>Sum assured</small></span><span class="grow"></span><strong>${esc(String(s.cover).replace(/cr/i, ' Cr').replace(/(\d)l$/i, '$1 L'))}</strong></li>`).join('')}</ul>`, { sub: 'Insurance that takes the first hit, so the reserve does not have to.' }) : ''}`;
  };

  function updateSim(value) {
    const { m } = state, range = $('#sim-range');
    if (!range) return;
    const need = Math.max(0, Math.min(m.emergencyTotal, Number(value) || 0));
    range.value = need;
    range.style.setProperty('--p', (m.emergencyTotal ? (need / m.emergencyTotal) * 100 : 0) + '%');
    let left = need;
    tiers().forEach((t, i) => {
      const used = Math.min(left, t.total);
      left -= used;
      $(`[data-tier="${i}"] s`).style.width = (t.total ? (used / t.total) * 100 : 0) + '%';
      $(`[data-used="${i}"]`).innerHTML = used > 0 ? `Uses ${amt(used, true)}` : 'Untouched';
    });
    $('.sim-amt').dataset.v = need;
    $('.sim-left').dataset.v = m.emergencyTotal - need;
    $('#sim-pct').textContent = pct(m.emergencyTotal ? need / m.emergencyTotal : 0) + ' of reserve';
    $('#sim-runway').textContent = trim(m.essentials ? (m.emergencyTotal - need) / m.essentials : 0, 1) + ' months';
    paint($('#view'));
  }

  /* ---------- Navigation + rendering ---------- */
  const NAV = [
    { route: 'dashboard', label: 'Dashboard', icon: I.home },
    { route: 'investments', label: 'Investment Portfolio', icon: I.chart },
    { route: 'budget', label: 'Budget Plan', icon: I.wallet },
    { route: 'monthly', label: 'Monthly Track', icon: I.calendar },
    { route: 'banks', label: 'Bank Accounts', icon: I.bank },
    { route: 'cards', label: 'Credit Cards', icon: I.card },
    { route: 'emergency', label: 'Emergency Deployment', icon: I.shield },
  ];
  const currentRoute = () => { const r = location.hash.replace(/^#\/?/, ''); return views[r] ? r : 'dashboard'; };

  const io = 'IntersectionObserver' in window ? new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  }, { rootMargin: '0px 0px -6% 0px' }) : null;
  function observe(root) {
    const els = $$('[data-reveal]', root);
    const now = els.filter((el) => !io || el.getBoundingClientRect().top < innerHeight * 0.94);
    /* What is already on screen animates in right away; the rest waits for scroll. */
    setTimeout(() => now.forEach((el) => el.classList.add('in')), 30);
    if (io) els.filter((el) => !now.includes(el)).forEach((el) => io.observe(el));
  }

  function render(keepScroll, still) {
    const route = currentRoute(), view = $('#view');
    view.innerHTML = `<div class="page page-${route} ${still ? 'still' : ''}">${views[route]()}</div>`;
    if (still) $$('[data-reveal]', view).forEach((el) => el.classList.add('in'));
    paint(document);
    observe(view);
    if (route === 'dashboard') tick();
    if (route === 'emergency') updateSim(0);
    $$('#nav a').forEach((a) => a.classList.toggle('on', a.dataset.route === route));
    document.title = route === 'dashboard' ? 'FinStack' : `${NAV.find((n) => n.route === route).label} · FinStack`;
    if (!keepScroll) scrollTo({ top: 0, behavior: 'instant' });
    state.justAdded = -1;
    state.addedPath = '';
  }

  function renderDrawer() {
    $('#nav').innerHTML = NAV.map((n, i) => `<a href="#/${n.route}" data-route="${n.route}" style="--i:${i}">${n.icon}<span>${n.label}</span></a>`).join('');
    const meta = state.model.meta;
    const when = meta.importedAt ? new Date(meta.importedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
    const light = document.documentElement.dataset.theme === 'light';
    $('#drawer-foot').innerHTML = `<p class="source">${meta.sample ? 'Showing sample data' : `${esc(meta.source)} · imported ${when}`}</p>
      <button class="drawer-btn" data-action="import">${I.upload}<span>Import Excel</span></button>
      <a class="drawer-btn" href="assets/FinStack-template.xlsx" download="FinStack-template.xlsx">${I.download}<span>Download Excel template</span></a>
      <button class="drawer-btn" data-action="name">${I.user}<span>Display name</span></button>
      <button class="drawer-btn" data-action="font">${I.type}<span>Change font</span></button>
      <button class="drawer-btn" data-action="theme">${light ? I.moon : I.sun}<span>${light ? 'Dark theme' : 'Light theme'}</span></button>
      ${meta.sample ? '' : `<button class="drawer-btn" data-action="reset">${I.reset}<span>Remove my data</span></button>`}
      <p class="fine">Your numbers are stored only in this browser.</p>`;
    $('#menu-close').innerHTML = I.close;
  }
  function setDrawer(open) {
    const d = $('#drawer');
    document.body.classList.toggle('drawer-open', open);
    d.inert = !open;
    $('#scrim').hidden = !open;
    $('#menu-btn').setAttribute('aria-expanded', String(open));
    if (open) $('#nav a.on, #nav a').focus({ preventScroll: true });
  }

  /* ---------- Toasts + modals ---------- */
  function toast(text, kind) {
    const el = document.createElement('div');
    el.className = 'toast';
    el.innerHTML = `${KIND_ICON[kind || 'good']}<span>${esc(text)}</span>`;
    $('#toast-root').appendChild(el);
    setTimeout(() => el.classList.add('out'), 2600);
    setTimeout(() => el.remove(), 3100);
  }
  function openModal(html, cls) {
    $('#modal-root').innerHTML = `<div class="modal-back ${cls || ''}" data-action="modal-back"><div class="modal" role="dialog" aria-modal="true">${html}</div></div>`;
    const first = $('#modal-root input, #modal-root button');
    if (first) first.focus();
  }
  const closeModal = () => { $('#modal-root').innerHTML = ''; };

  function importModal() {
    openModal(`<button class="icon-btn modal-x" data-action="modal-close" aria-label="Close">${I.close}</button>
      <h2>Import your workbook</h2>
      <p class="modal-sub">Choose the Excel file with your Budget, Bank Accounts, Investment, Credit Cards and Monthly track sheets.${state.model.meta.sample ? '' : ' Importing replaces everything here, including edits made in Monthly Track.'}</p>
      <div id="import-body"><button class="drop" id="drop" data-action="pick">${I.upload}<b>Choose an .xlsx file</b><span>or drop it here</span></button>
      <p class="fine">${I.shield} The file is read in your browser. Nothing is uploaded anywhere.</p>
      <p class="fine">${I.info}<span>New here? <a class="tpl" href="assets/FinStack-template.xlsx" download="FinStack-template.xlsx">Download the Excel template</a>, fill in the yellow cells, then import it.</span></p></div>`);
  }
  async function handleFile(file) {
    const body = $('#import-body');
    if (!file) return;
    if (!body) importModal();
    $('#import-body').innerHTML = '<div class="loading"><span class="spinner"></span><p>Reading your workbook…</p></div>';
    try {
      const model = await FinData.importFile(file);
      const firstImport = state.model.meta.sample;
      state.model = model;
      recalc();
      const saved = FinData.save(model);
      if (firstImport && store.get('finstack.name') == null && model.income[0]) store.set('finstack.name', model.income[0].name);
      state.budgetTab = null;
      state.editMonthly = false;
      const found = [[model.banks.length, 'bank accounts'], [model.funds.length, 'funds and deposits'], [model.cards.length, 'credit cards'], [sum(model.budget.groups, (g) => g.items.length), 'budget categories'], [model.monthly.expenses.length, 'monthly expenses'], [model.emis.length, 'EMIs']].filter((x) => x[0]);
      $('#import-body').innerHTML = `<div class="success"><span class="big-tick">${I.ok}</span><h3>Your data is in</h3>
        <ul>${found.map(([n, l], i) => `<li style="--i:${i}">${I.ok}<span><b>${n}</b> ${l}</span></li>`).join('')}</ul>
        ${saved ? '' : '<p class="fine">Could not save to this browser, so it will need importing again next time.</p>'}
        <button class="btn btn-primary" data-action="modal-close">Open dashboard</button></div>`;
      renderDrawer();
      if (currentRoute() === 'dashboard') render(); else location.hash = '#/dashboard';
    } catch (err) {
      $('#import-body').innerHTML = `<div class="error">${I.bad}<p>${esc(err && err.message ? err.message : 'That file could not be read.')}</p><button class="btn" data-action="pick">Try another file</button></div>`;
    }
  }
  function nameModal() {
    openModal(`<button class="icon-btn modal-x" data-action="modal-close" aria-label="Close">${I.close}</button><h2>Display name</h2><p class="modal-sub">Used in the greeting on your dashboard.</p>
      <form data-form="name"><label>Name<input name="name" maxlength="30" value="${esc(displayName())}" autocomplete="off"></label><button class="btn btn-primary">Save</button></form>`);
  }
  function accountModal() {
    const holders = Array.from(new Set(state.model.banks.map((b) => b.holder).filter(Boolean)));
    openModal(`<button class="icon-btn modal-x" data-action="modal-close" aria-label="Close">${I.close}</button><h2>Add account</h2><p class="modal-sub">Saved on this device. Re-importing your workbook replaces all accounts.</p>
      <form data-form="account">
        <label>Account holder<input name="holder" list="holders" required maxlength="40" value="${esc(holders[0] || '')}" autocomplete="off"><datalist id="holders">${holders.map((h) => `<option value="${esc(h)}">`).join('')}</datalist></label>
        <label>Bank name<input name="bank" required maxlength="40" autocomplete="off"></label>
        <div class="form-row"><label>Balance (₹)<input name="balance" type="number" inputmode="numeric" min="0" step="1" required></label><label>Minimum balance (₹)<input name="min" type="number" inputmode="numeric" min="0" step="1" value="0"></label></div>
        <label>Purpose<input name="purpose" maxlength="40" placeholder="e.g. Travel fund" autocomplete="off"></label>
        <button class="btn btn-primary">${I.plus}Add account</button></form>`);
  }

  /* ---------- Events ---------- */
  const actions = {
    'tile-eye'(el) { const id = el.dataset.id; if (state.tiles.has(id)) state.tiles.delete(id); else state.tiles.add(id); paint(document, true); },
    import() { setDrawer(false); importModal(); },
    pick() { $('#file-input').click(); },
    name() { setDrawer(false); nameModal(); },
    font() {
      setDrawer(false);
      const cur = FinFonts.current();
      openModal(`<button class="icon-btn modal-x" data-action="modal-close" aria-label="Close">${I.close}</button><h2>Change font</h2><p class="modal-sub">Tap a font to try it. The app updates straight away.</p>
        <div class="fonts" role="radiogroup" aria-label="Font">${FinFonts.names.map((n) => `<button class="font-opt ${n === cur ? 'on' : ''}" role="radio" aria-checked="${n === cur}" data-action="font-pick" data-id="${esc(n)}" style="font-family:${esc(FinFonts.stack(n))}"><span><b>${esc(n)}</b><small>Good Evening · ₹12,34,567 · 10:45 PM</small></span>${I.ok}</button>`).join('')}</div>
        <button class="btn btn-primary" data-action="modal-close">Done</button>`, 'peek');
    },
    'font-pick'(el) {
      FinFonts.set(el.dataset.id);
      $$('.font-opt').forEach((b) => { const on = b === el; b.classList.toggle('on', on); b.setAttribute('aria-checked', String(on)); });
    },
    theme() {
      const next = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
      document.documentElement.dataset.theme = next;
      store.set('finstack.theme', next);
      $('meta[name="theme-color"]').content = next === 'light' ? '#f9f9f7' : '#0d0d0d';
      renderDrawer();
      $$('#nav a').forEach((a) => a.classList.toggle('on', a.dataset.route === currentRoute()));
    },
    reset() {
      setDrawer(false);
      openModal(`<h2>Remove your data?</h2><p class="modal-sub">This clears the imported numbers from this browser and goes back to sample data. Your Excel file is not touched.</p><div class="modal-actions"><button class="btn" data-action="modal-close">Cancel</button><button class="btn btn-danger" data-action="reset-yes">Remove</button></div>`);
    },
    'reset-yes'() { FinData.clear(); store.del('finstack.name'); state.model = FinData.sample(); recalc(); state.budgetTab = null; closeModal(); renderDrawer(); render(); toast('Your data was removed from this browser'); },
    'modal-close'() { closeModal(); },
    'modal-back'(el, e) { if (e.target === el) closeModal(); },
    tab(el) { state.budgetTab = el.dataset.id; $('#cat-panel').innerHTML = catPanel(); paint($('#cat-panel')); },
    period(el) { state.yearly = el.dataset.id === 'y'; $('#cat-panel').innerHTML = catPanel(); paint($('#cat-panel')); },
    'add-account'() { accountModal(); },
    'del-account'(el) { state.model.banks.splice(Number(el.dataset.id), 1); FinData.save(state.model); recalc(); render(true); toast('Account removed'); },
    'sim-preset'(el) { updateSim(el.dataset.id); },
    'mt-edit'() { state.editMonthly = true; render(true); },
    'mt-done'() { state.editMonthly = false; FinData.save(state.model); recalc(); render(true); toast('Monthly track saved'); },
    'mt-add'(el) {
      const key = el.dataset.list, list = listAt(key);
      list.push(key === 'emis' ? { name: '', monthly: 0, paid: 0, total: 6, end: '', bank: '' } : key === 'monthly.notes' ? { name: '', amount: 0, note: '' } : { name: '', amount: 0 });
      const path = key + '.' + (list.length - 1);
      state.addedPath = path;
      monthlyChanged(); render(true, true);
      const input = $(`[data-bind="${path}.name"]`);
      if (input) input.focus();
    },
    'mt-del'(el) { listAt(el.dataset.list).splice(Number(el.dataset.id), 1); monthlyChanged(); render(true, true); },
    'emi-step'(el) {
      const e = state.model.emis[Number(el.dataset.id)];
      e.paid = Math.max(0, Math.min(e.total || 999, (Number(e.paid) || 0) + Number(el.dataset.d)));
      el.parentElement.querySelector('b').textContent = e.paid;
      monthlyChanged();
    },
    'mt-new'() {
      const M = state.model.monthly;
      openModal(`<button class="icon-btn modal-x" data-action="modal-close" aria-label="Close">${I.close}</button><h2>Start a new month</h2>
        <p class="modal-sub">${esc(M.label || 'This month')}'s card bills become the last statement, then card bills and misc credit reset to zero. Household expenses stay as they are.</p>
        <form data-form="newmonth"><label>New month<input name="label" maxlength="30" value="${esc(nextMonthLabel(M.label))}" autocomplete="off"></label>
          <label class="check-lbl"><input type="checkbox" name="emi" checked> Count one more instalment as paid on every running EMI</label>
          <button class="btn btn-primary">${I.calendar}Start month</button></form>`);
    },
  };

  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-action]');
    if (el && actions[el.dataset.action]) { actions[el.dataset.action](el, e); return; }
    const seg = e.target.closest('.donut-wrap [data-seg]');
    if (seg) { const w = seg.closest('.donut-wrap'); focusSeg(w, seg.classList.contains('active') && e.type === 'click' && matchMedia('(hover: none)').matches ? null : Number(seg.dataset.seg)); }
    if (e.target.closest('#nav a')) setDrawer(false);
  });
  document.addEventListener('mouseover', (e) => {
    const seg = e.target.closest('.donut-wrap [data-seg]');
    if (seg) focusSeg(seg.closest('.donut-wrap'), Number(seg.dataset.seg));
  });
  document.addEventListener('mouseout', (e) => {
    const w = e.target.closest('.donut-wrap');
    if (w && !w.contains(e.relatedTarget)) focusSeg(w, null);
  });
  document.addEventListener('focusin', (e) => {
    const seg = e.target.closest('.donut-wrap [data-seg]');
    if (seg) focusSeg(seg.closest('.donut-wrap'), Number(seg.dataset.seg));
  });
  document.addEventListener('input', (e) => {
    if (e.target.id === 'sim-range') { updateSim(e.target.value); return; }
    const el = e.target.closest('[data-bind]');
    if (!el) return;
    const parts = el.dataset.bind.split('.'), key = parts.pop();
    listAt(parts.join('.'))[key] = el.type === 'number' ? Math.max(0, Number(el.value) || 0) : el.value;
    monthlyChanged();
  });
  document.addEventListener('submit', (e) => {
    const form = e.target.closest('[data-form]');
    if (!form) return;
    e.preventDefault();
    const f = new FormData(form);
    if (form.dataset.form === 'name') {
      store.set('finstack.name', String(f.get('name')).trim());
      closeModal(); render(true); toast('Name updated');
    } else if (form.dataset.form === 'newmonth') {
      const M = state.model.monthly;
      if (sum(M.bills, (b) => b.amount) > 0) M.prev = { label: 'Credit card bill ' + (M.label || '').split(' ')[0].slice(0, 3), items: M.bills.map((b) => ({ name: b.name, amount: b.amount })) };
      M.bills.forEach((b) => { b.amount = 0; });
      M.misc = 0;
      M.label = String(f.get('label')).trim() || FinData.monthLabel(new Date());
      if (f.get('emi')) state.model.emis.forEach((x) => { if (x.total && x.paid < x.total) x.paid += 1; });
      FinData.save(state.model); recalc();
      state.editMonthly = false;
      closeModal(); render(true); toast(`${M.label} started`);
    } else if (form.dataset.form === 'account') {
      const holder = String(f.get('holder')).trim(), list = state.model.banks;
      const account = { holder, bank: String(f.get('bank')).trim(), balance: Number(f.get('balance')) || 0, min: Number(f.get('min')) || 0, purpose: String(f.get('purpose')).trim(), manual: true };
      let at = -1;
      list.forEach((b, i) => { if (b.holder === holder) at = i; });
      at = at < 0 ? list.length : at + 1;
      list.splice(at, 0, account);
      if (state.model.meta.sample) state.model.meta.source = 'Sample data + your additions';
      FinData.save(state.model);
      recalc();
      state.justAdded = at;
      closeModal(); render(true);
      const row = $('.just-added');
      if (row) row.scrollIntoView({ block: 'center', behavior: reduceMotion ? 'auto' : 'smooth' });
      toast('Account added');
    }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if ($('#modal-root').firstChild) closeModal(); else setDrawer(false);
  });
  $('#eye-all').addEventListener('click', () => {
    state.reveal = !state.reveal;
    state.tiles = new Set(state.reveal ? ['net', 'bank', 'port', 'emer'] : []);
    if (currentRoute() === 'budget') { render(true); paint(document, true); } else paint(document, true);
  });
  $('#menu-btn').addEventListener('click', () => setDrawer(!document.body.classList.contains('drawer-open')));
  $('#menu-close').addEventListener('click', () => setDrawer(false));
  $('#scrim').addEventListener('click', () => setDrawer(false));
  $('#file-input').addEventListener('change', (e) => { const f = e.target.files[0]; e.target.value = ''; handleFile(f); });
  window.addEventListener('dragover', (e) => { e.preventDefault(); const d = $('#drop'); if (d) d.classList.add('over'); });
  window.addEventListener('dragleave', () => { const d = $('#drop'); if (d) d.classList.remove('over'); });
  window.addEventListener('drop', (e) => { e.preventDefault(); const f = e.dataTransfer && e.dataTransfer.files[0]; if (f) handleFile(f); });
  window.addEventListener('hashchange', () => render());
  setInterval(tick, 1000);

  /* ---------- Boot: opening animation, then the dashboard ---------- */
  renderDrawer();
  let started = false;
  function start() {
    if (started) return;
    started = true;
    $('#splash').classList.add('done');
    document.body.classList.remove('booting');
    render();
    setTimeout(() => { const s = $('#splash'); if (s) s.remove(); }, 900);
  }
  $('#splash').addEventListener('click', start);
  setTimeout(start, reduceMotion ? 500 : 2500);

  window.FinStack = { state, render, handleFile };
})();
