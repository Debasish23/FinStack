/* FinStack data layer: Excel workbook -> model, sample data, storage, metrics. */
(function (global) {
  'use strict';

  const KEY = 'finstack.data.v1';
  const ACRONYMS = new Set(['LPG', 'PPF', 'NPS', 'SIP', 'EMI', 'FD', 'MF', 'ETF', 'REIT', 'AC']);

  /* "CAR CLEAN" -> "Car Clean"; mixed-case input is left alone. */
  function nice(s) {
    s = String(s || '').replace(/\s+/g, ' ').trim();
    if (!s || s !== s.toUpperCase()) return s;
    return s.split(' ').map((w) => (ACRONYMS.has(w) ? w : w.charAt(0) + w.slice(1).toLowerCase())).join(' ');
  }
  const sum = (arr, f) => arr.reduce((a, x) => a + (Number(f ? f(x) : x) || 0), 0);
  const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z]/g, '');
  const sheetBy = (wb, re) => wb.sheets.find((s) => re.test(s.name));

  /* ---------- Budget ---------- */
  function parseBudget(sh, model) {
    const heads = sh.find((t) => /^(needs|wants|savings|insurance)$/i.test(t))
      .filter(([r, c]) => /^categor/i.test(sh.text(r + 1, c)));
    if (!heads.length) return;
    model.budget.groups = heads.map(([r, c]) => {
      let mCol = null, yCol = null;
      for (let k = 1; k <= 3; k++) {
        const h = sh.text(r + 1, c + k);
        if (/month/i.test(h)) mCol = c + k; else if (/year/i.test(h)) yCol = c + k;
      }
      const items = [];
      for (let rr = r + 2, blank = 0; rr <= sh.maxRow && blank < 3; rr++) {
        const name = sh.text(rr, c);
        if (!name) { blank++; continue; }
        if (/^total$/i.test(name)) break;
        blank = 0;
        let m = mCol ? sh.num(rr, mCol) : null;
        let y = yCol ? sh.num(rr, yCol) : null;
        if (m == null && y == null) continue;
        if (m == null) m = y / 12;
        if (y == null) y = m * 12;
        items.push({ name: nice(name), monthly: m, yearly: y });
      }
      const label = sh.text(r, c);
      return { key: label.toLowerCase(), name: nice(label), items };
    });
    const headRow = heads[0][0];
    const pairsAbove = (col) => {
      const out = [];
      for (let r = 1; r < headRow; r++) {
        const name = sh.text(r, col), amount = sh.num(r, col + 1);
        if (name && amount != null && !/^total$/i.test(name)) out.push({ name: nice(name), amount });
      }
      return out;
    };
    model.income = pairsAbove(heads[0][1]);
    if (heads[2]) model.budget.targets = pairsAbove(heads[2][1]);
  }

  /* ---------- Bank accounts ---------- */
  function parseBanks(sh, model) {
    const hit = sh.find((t) => /^bank name$/i.test(t))[0];
    if (!hit) return;
    const hr = hit[0];
    const col = {};
    for (let c = 1; c <= sh.maxCol; c++) {
      const h = sh.text(hr, c);
      if (/holder/i.test(h)) col.holder = c;
      else if (/bank name/i.test(h)) col.bank = c;
      else if (/^balance/i.test(h)) col.balance = c;
      else if (/min/i.test(h)) col.min = c;
      else if (/purpose/i.test(h)) col.purpose = c;
    }
    let holder = '';
    for (let r = hr + 1; r <= sh.maxRow; r++) {
      if (col.holder && sh.text(r, col.holder)) holder = nice(sh.text(r, col.holder));
      const bank = sh.text(r, col.bank);
      const balance = col.balance ? sh.num(r, col.balance) : null;
      if (!bank || /^total/i.test(bank) || balance == null) continue;
      model.banks.push({
        holder, bank, balance,
        min: (col.min && sh.num(r, col.min)) || 0,
        purpose: col.purpose ? sh.text(r, col.purpose) : '',
      });
    }
  }

  /* ---------- Investments ---------- */
  function parseInvestments(sh, model) {
    const fh = sh.find((t) => /^fund name$/i.test(t))[0];
    if (fh) {
      const [hr, c0] = fh;
      const amountCols = {}, statusCols = {};
      let typeCol = null, targetCol = null;
      for (let c = c0 + 1; c <= sh.maxCol; c++) {
        const h = sh.text(hr, c);
        let m;
        if ((m = /^amount\s*-\s*(\w+)/i.exec(h))) amountCols[m[1].toUpperCase()] = c;
        else if (/fund type/i.test(h)) typeCol = c;
        else if (/allocation/i.test(h)) targetCol = c;
        else if ((m = /^(\w+)\s+status/i.exec(h))) statusCols[m[1].toUpperCase()] = c;
      }
      const ownerName = (k) => {
        const p = model.income.find((i) => i.name.toUpperCase().startsWith(k));
        return p ? p.name : 'Account ' + k;
      };
      model.fundOwners = Object.keys(amountCols).map((k) => ({ key: k, name: ownerName(k) }));
      let type = 'Other';
      for (let r = hr + 1; r <= sh.maxRow; r++) {
        const name = sh.text(r, c0);
        if (!name) break;
        if (typeCol && sh.text(r, typeCol)) type = sh.text(r, typeCol);
        const amounts = {}, status = {};
        for (const k in amountCols) amounts[k] = sh.num(r, amountCols[k]) || 0;
        for (const k in statusCols) status[k] = sh.text(r, statusCols[k]);
        const target = targetCol ? sh.num(r, targetCol) : null;
        if (target != null) model.fundTargets[type] = target;
        model.funds.push({ name, type, amounts, status });
      }
    }

    const tables = sh.find((t) => /^description$/i.test(t)).map(([r, c]) => {
      const cols = [];
      for (let cc = c + 1; sh.text(r, cc); cc++) cols.push(nice(sh.text(r, cc)));
      const rows = [];
      for (let rr = r + 1; rr <= sh.maxRow; rr++) {
        const name = sh.text(rr, c);
        if (!name || /total$/i.test(name)) break;
        rows.push({ name, values: cols.map((_, i) => sh.num(rr, c + 1 + i) || 0) });
      }
      return { title: sh.text(r - 1, c), cols, rows };
    });
    const emergency = tables.find((t) => /emergency/i.test(t.title));
    const holdings = tables.filter((t) => t !== emergency).sort((a, b) => b.rows.length - a.rows.length)[0];
    if (emergency) model.emergency = { cols: emergency.cols, rows: emergency.rows };
    if (holdings) model.holdings = { cols: holdings.cols, rows: holdings.rows };

    const sh0 = sh.find((t) => /emergency shield/i.test(t))[0];
    if (sh0) {
      for (let r = sh0[0] + 2; r <= sh.maxRow; r++) {
        const name = sh.text(r, sh0[1]);
        if (!name) break;
        model.shield.push({ name, cover: sh.text(r, sh0[1] + 1) });
      }
    }
  }

  /* ---------- Credit cards ---------- */
  function parseCards(sh, model) {
    for (const [r, c] of sh.find((t) => /^card name$/i.test(t))) {
      let owner = '';
      for (let rr = r - 1; rr >= Math.max(1, r - 4) && !owner; rr--) {
        const t = sh.text(rr, c);
        if (/credit card/i.test(t)) owner = nice(t.replace(/credit cards?/i, '').trim());
      }
      const col = {};
      for (let cc = c + 1; cc <= c + 7; cc++) {
        const h = sh.text(r, cc);
        if (!h || /^card name$/i.test(h)) break;
        if (/condition/i.test(h)) col.condition = cc;
        else if (/limit/i.test(h) && !/fee/i.test(h)) col.limit = cc;
        else if (/domestic/i.test(h)) col.domestic = cc;
        else if (/intl|international/i.test(h)) col.intl = cc;
        else if (/fee/i.test(h)) col.fee = cc;
      }
      for (let rr = r + 1; rr <= sh.maxRow; rr++) {
        const name = sh.text(rr, c);
        if (!name) break;
        const t = (k) => (col[k] ? sh.text(rr, col[k]) : '');
        model.cards.push({
          owner, name,
          limit: (col.limit && sh.num(rr, col.limit)) || 0,
          domestic: t('domestic'), intl: t('intl'), fee: t('fee'), condition: t('condition'),
        });
      }
    }
  }

  /* ---------- Monthly track: EMIs + card statements ---------- */
  function parseMonthly(sh, model) {
    const eh = sh.find((t) => /^emi schedule$/i.test(t))[0];
    if (eh) {
      const [r0, c0] = eh;
      const col = { name: c0 };
      for (let c = c0; c <= c0 + 6; c++) {
        const h = sh.text(r0 + 1, c);
        if (/monthly/i.test(h)) col.monthly = c;
        else if (/paid|tenure/i.test(h)) col.tenure = c;
        else if (/end/i.test(h)) col.end = c;
        else if (/bank/i.test(h)) col.bank = c;
      }
      for (let r = r0 + 2; r <= sh.maxRow; r++) {
        const name = sh.text(r, col.name);
        if (!name || /^total$/i.test(name)) break;
        const m = /(\d+)\s*\/\s*(\d+)/.exec(col.tenure ? sh.text(r, col.tenure) : '');
        model.emis.push({
          name,
          monthly: (col.monthly && sh.num(r, col.monthly)) || 0,
          paid: m ? Number(m[1]) : 0,
          total: m ? Number(m[2]) : 0,
          end: col.end ? sh.text(r, col.end) : '',
          bank: col.bank ? sh.text(r, col.bank) : '',
        });
      }
    }
    const lists = sh.find((t) => /^credit card bill/i.test(t)).map(([r, c]) => {
      const items = [];
      for (let rr = r + 1; rr <= sh.maxRow; rr++) {
        const name = sh.text(rr, c);
        if (!name || /^total$/i.test(name)) break;
        items.push({ name, amount: sh.num(rr, c + 1) || 0 });
      }
      return { label: sh.text(r, c), items };
    });
    /* The plain "Credit card bill" list is the month in progress; a dated one is the last statement. */
    const M = model.monthly;
    const current = lists.find((l) => /^credit card bills?$/i.test(l.label)) || lists[0];
    const prev = lists.find((l) => l !== current);
    if (current) M.bills = current.items;
    if (prev) M.prev = prev;

    const dh = sh.find((t) => /^description$/i.test(t)).find(([r, c]) => /^amount$/i.test(sh.text(r, c + 1)));
    if (dh) {
      const [r0, c0] = dh;
      for (let r = r0 + 1; r <= sh.maxRow; r++) {
        const name = sh.text(r, c0), amount = sh.num(r, c0 + 1);
        if (!name) continue;
        if (/^(cc bill|household expenses?|total|remain.*)$/i.test(name)) continue;
        if (/^salary/i.test(name)) M.salary = amount || 0;
        else if (/^misc/i.test(name)) M.misc = amount || 0;
        else if (amount != null) M.expenses.push({ name: nice(name), amount });
      }
    }
    if (eh) {
      for (let r = 1; r < eh[0]; r++) {
        const name = sh.text(r, eh[1]), amount = sh.num(r, eh[1] + 1);
        if (name && amount != null) M.notes.push({ name, amount, note: sh.text(r, eh[1] + 2) });
      }
    }
  }

  const monthLabel = (d) => d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  const emptyMonthly = () => ({ label: monthLabel(new Date()), expenses: [], salary: 0, misc: 0, bills: [], prev: null, notes: [] });

  function emptyModel() {
    return {
      meta: { sample: false, source: '', importedAt: null },
      income: [], budget: { groups: [], targets: [] },
      banks: [], funds: [], fundOwners: [], fundTargets: {},
      emergency: { cols: [], rows: [] }, holdings: { cols: [], rows: [] },
      shield: [], cards: [], emis: [], monthly: emptyMonthly(),
    };
  }

  function fromWorkbook(wb, fileName) {
    const model = emptyModel();
    const steps = [
      [/budget/i, parseBudget], [/bank/i, parseBanks], [/invest/i, parseInvestments],
      [/credit|card/i, parseCards], [/month/i, parseMonthly],
    ];
    for (const [re, fn] of steps) {
      const sh = sheetBy(wb, re);
      if (sh) { try { fn(sh, model); } catch (e) { console.warn('FinStack: skipped sheet', sh.name, e); } }
    }
    if (!model.banks.length && !model.budget.groups.length && !model.holdings.rows.length && !model.cards.length) {
      throw new Error('No recognisable sheets found. Expected sheets named like "Budget", "Bank Accounts", "Investment" and "Credit Cards".');
    }
    model.meta = { sample: false, source: fileName || 'workbook.xlsx', importedAt: new Date().toISOString() };
    return model;
  }

  /* ---------- Derived numbers used across the app ---------- */
  function metrics(m) {
    const group = (k) => m.budget.groups.find((g) => g.key === k);
    const gm = (k) => (group(k) ? sum(group(k).items, (i) => i.monthly) : 0);
    const income = sum(m.income, (i) => i.amount);
    const allocated = sum(m.budget.groups, (g) => sum(g.items, (i) => i.monthly));
    const needs = gm('needs'), wants = gm('wants'), savings = gm('savings'), insurance = gm('insurance');
    const essentials = needs + insurance || allocated;

    const bankTotal = sum(m.banks, (b) => b.balance);
    const bankMin = sum(m.banks, (b) => b.min);
    const lowAccounts = m.banks.filter((b) => b.min > 0 && b.balance < b.min);

    const rowTotal = (r) => sum(r.values);
    const emergencyTotal = sum(m.emergency.rows, rowTotal);
    const emergencyNames = new Set(m.emergency.rows.map((r) => norm(r.name)));
    const emergencyCash = sum(m.emergency.rows.filter((r) => /cash/i.test(r.name)), rowTotal);
    const fundsTotal = sum(m.funds, (f) => sum(Object.values(f.amounts)));

    let portfolio, netWorth, investedTotal, cashOverlap;
    if (m.holdings.rows.length) {
      investedTotal = sum(m.holdings.rows, rowTotal);
      const reserveInHoldings = sum(m.holdings.rows.filter((r) => emergencyNames.has(norm(r.name))), rowTotal);
      cashOverlap = sum(m.holdings.rows.filter((r) => /cash/i.test(r.name)), rowTotal);
      portfolio = investedTotal - reserveInHoldings;
    } else {
      portfolio = fundsTotal;
      investedTotal = fundsTotal + emergencyTotal;
      cashOverlap = emergencyCash;
    }
    /* Reserve cash already sits inside the bank balances, so count it once. */
    netWorth = bankTotal + investedTotal - cashOverlap;

    const activeEmis = m.emis.filter((e) => !e.total || e.paid < e.total);
    const M = m.monthly;
    const billsNow = sum(M.bills, (i) => i.amount);
    const billsPrev = M.prev ? sum(M.prev.items, (i) => i.amount) : 0;
    /* The fuller of the two card-bill lists stands in as the latest statement. */
    const statement = billsNow >= billsPrev && billsNow > 0 ? { label: 'Card bills · ' + M.label, items: M.bills } : (billsPrev > 0 ? M.prev : null);
    const billsTotal = Math.max(billsNow, billsPrev);
    const household = sum(M.expenses, (i) => i.amount);
    const monthIn = (Number(M.salary) || 0) + (Number(M.misc) || 0);
    const monthOut = household + billsNow;
    const cardLimit = sum(m.cards, (c) => c.limit);

    return {
      income, allocated, unallocated: income - allocated, needs, wants, savings, insurance, essentials,
      savingsRate: income ? savings / income : 0,
      bankTotal, bankMin, lowAccounts,
      emergencyTotal, emergencyCash, runway: essentials ? emergencyTotal / essentials : 0,
      portfolio, netWorth, fundsTotal, investedTotal, cashOverlap,
      emiMonthly: sum(activeEmis, (e) => e.monthly), activeEmis: activeEmis.length,
      billsTotal, statement, cardLimit, utilisation: cardLimit ? billsTotal / cardLimit : 0,
      household, billsNow, monthIn, monthOut, monthLeft: monthIn - monthOut,
    };
  }

  /* ---------- Sample data (fictional) shown until a workbook is imported ---------- */
  function sample() {
    const m = emptyModel();
    m.meta = { sample: true, source: 'Sample data', importedAt: null };
    m.income = [{ name: 'Alex', amount: 120000 }, { name: 'Sam', amount: 95000 }];
    const g = (key, name, rows) => ({ key, name, items: rows.map(([n, v]) => ({ name: n, monthly: v, yearly: v * 12 })) });
    m.budget.groups = [
      g('needs', 'Needs', [['Rent', 38000], ['Groceries', 18000], ['Utilities', 6500], ['Fuel', 6000], ['Internet', 1200], ['Pharmacy', 2500]]),
      g('wants', 'Wants', [['Travel', 12000], ['Dining Out', 8000], ['Shopping', 9000], ['Subscriptions', 1800]]),
      g('savings', 'Savings', [['PPF', 12500], ['NPS', 10000], ['Investments', 40000]]),
      g('insurance', 'Insurance', [['Term Cover', 2200], ['Medical', 2800], ['Car', 1100]]),
    ];
    m.budget.targets = [{ name: 'Needs', amount: 80000 }, { name: 'Wants', amount: 35000 }, { name: 'Savings', amount: 62500 }, { name: 'Cash', amount: 37500 }];
    m.banks = [
      { holder: 'Alex', bank: 'Northwind Bank', balance: 182000, min: 50000, purpose: 'Emergency Savings' },
      { holder: 'Alex', bank: 'Harbor Bank', balance: 46000, min: 10000, purpose: 'Salary Account' },
      { holder: 'Alex', bank: 'Summit Bank', balance: 8200, min: 10000, purpose: 'Investment Account' },
      { holder: 'Sam', bank: 'Northwind Bank', balance: 164000, min: 50000, purpose: 'Emergency Savings' },
      { holder: 'Sam', bank: 'Cedar Bank', balance: 71500, min: 10000, purpose: 'Salary Account' },
    ];
    m.fundOwners = [{ key: 'A', name: 'Alex' }, { key: 'S', name: 'Sam' }];
    const f = (name, type, a, s) => ({ name, type, amounts: { A: a, S: s }, status: { A: 'Done', S: s ? 'Done' : '' } });
    m.funds = [
      f('Bluechip Large Cap Fund', 'Large', 120000, 90000), f('Next 50 Index Fund', 'Large', 80000, 60000),
      f('Emerging Mid Cap Fund', 'Midcap', 90000, 70000), f('Discovery Small Cap Fund', 'Small Cap', 60000, 40000),
      f('Flexi Opportunities Fund', 'Flexi', 50000, 50000), f('Gold ETF', 'Gold', 50000, 30000),
    ];
    m.fundTargets = { Large: 45, Midcap: 20, 'Small Cap': 15, Flexi: 10, Gold: 10 };
    m.emergency = { cols: ['Alex', 'Sam'], rows: [{ name: 'Cash', values: [150000, 150000] }, { name: 'FD', values: [100000, 50000] }, { name: 'Debt Fund', values: [50000, 50000] }] };
    m.holdings = { cols: ['Alex', 'Sam'], rows: [
      { name: 'Cash', values: [150000, 150000] }, { name: 'FD', values: [100000, 50000] }, { name: 'Debt Fund', values: [50000, 50000] },
      { name: 'MF', values: [400000, 310000] }, { name: 'ETF', values: [50000, 30000] }, { name: 'Stocks/Equity', values: [140000, 45000] },
      { name: 'PPF', values: [180000, 120000] }, { name: 'NPS', values: [110000, 90000] },
    ] };
    m.shield = [{ name: 'Health Insurance', cover: '50L' }, { name: 'Term Insurance Alex', cover: '1cr' }, { name: 'Term Insurance Sam', cover: '1cr' }];
    m.cards = [
      { owner: 'Alex', name: 'Voyager Platinum', limit: 400000, domestic: '2', intl: '2', fee: '₹2,500 + GST, waived on ₹3 lakh spend', condition: 'Quarterly spends of ₹50,000' },
      { owner: 'Alex', name: 'Everyday Cashback', limit: 250000, domestic: '0', intl: '0', fee: '0', condition: 'N/A' },
      { owner: 'Sam', name: 'Skyline Rewards', limit: 300000, domestic: 'Unlimited', intl: '0', fee: '0', condition: 'Monthly spend 20k' },
    ];
    m.emis = [
      { name: 'Laptop', monthly: 6200, paid: 4, total: 6, end: 'Jan', bank: 'Voyager' },
      { name: 'Air Conditioner', monthly: 3900, paid: 6, total: 6, end: 'Nov', bank: 'Everyday' },
    ];
    m.monthly = {
      label: monthLabel(new Date()), salary: 215000, misc: 0,
      expenses: [{ name: 'Rent', amount: 38000 }, { name: 'Maintenance', amount: 2500 }, { name: 'Groceries', amount: 18000 }, { name: 'Electricity', amount: 2400 }, { name: 'PPF', amount: 12500 }, { name: 'NPS', amount: 10000 }],
      bills: [{ name: 'Voyager', amount: 36400 }, { name: 'Everyday', amount: 0 }, { name: 'Skyline', amount: 0 }],
      prev: { label: 'Credit card bill last month', items: [{ name: 'Voyager', amount: 41200 }, { name: 'Everyday', amount: 18650 }, { name: 'Skyline', amount: 22300 }] },
      notes: [],
    };
    return m;
  }

  /* ---------- Storage ---------- */
  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const saved = JSON.parse(raw), model = Object.assign(emptyModel(), saved);
        model.monthly = Object.assign(emptyMonthly(), saved.monthly || {});
        if (!saved.monthly && saved.bills) model.monthly.prev = saved.bills;   /* data saved by an older version */
        delete model.bills;
        return model;
      }
    } catch (e) { /* fall through to sample */ }
    return sample();
  }
  function save(model) {
    try { localStorage.setItem(KEY, JSON.stringify(model)); return true; } catch (e) { return false; }
  }
  function clear() { try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ } }

  async function importFile(file) {
    const wb = await global.XlsxLite.read(await file.arrayBuffer());
    return fromWorkbook(wb, file.name);
  }

  global.FinData = { load, save, clear, sample, metrics, importFile, fromWorkbook, nice, sum, monthLabel };
})(window);
