/* FinCloud — optional Supabase sign-in and sync.
   Every change is written to this browser first, queued, and pushed to Supabase when online,
   so the app keeps working without a connection and nothing is lost on reload. */
(function (global) {
  'use strict';
  const cfg = global.FINSTACK_CONFIG || {};
  const enabled = !!(cfg.supabaseUrl && cfg.supabaseAnonKey);
  const LIB = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js';
  const QUEUE_KEY = 'finstack.queue.v1';

  let sb = null, user = null, status = 'idle', flushing = null, retry = 0;
  const listeners = [];
  const emit = (s) => { status = s; listeners.forEach((f) => f(s)); };

  const store = {
    get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* private mode */ } },
  };
  /* Pending work: latest data row, spends to upsert (by id), spend ids to delete. */
  let queue = Object.assign({ data: null, up: {}, del: [] }, store.get(QUEUE_KEY) || {});
  const saveQueue = () => store.set(QUEUE_KEY, queue);
  const hasWork = () => !!queue.data || Object.keys(queue.up).length > 0 || queue.del.length > 0;

  function loadLib() {
    if (global.supabase) return Promise.resolve();
    return new Promise((ok, fail) => {
      const s = document.createElement('script');
      s.src = LIB; s.onload = ok; s.onerror = () => fail(new Error('Could not load the sign-in library. Check your connection.'));
      document.head.appendChild(s);
    });
  }

  async function init(onAuth) {
    if (!enabled) return null;
    await loadLib();
    sb = global.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: 'finstack.auth' },
    });
    const { data } = await sb.auth.getSession();
    user = data.session ? data.session.user : null;
    sb.auth.onAuthStateChange((event, session) => {
      user = session ? session.user : null;
      /* Supabase holds a lock while this callback runs; do the work after it returns. */
      setTimeout(() => onAuth(event, user), 0);
    });
    addEventListener('online', () => flush());
    return user;
  }

  const check = (res) => { if (res.error) throw res.error; return res.data; };

  async function signIn(email, password) { check(await sb.auth.signInWithPassword({ email, password })); }
  async function signUp(email, password) {
    const d = check(await sb.auth.signUp({ email, password, options: { emailRedirectTo: location.origin + location.pathname } }));
    return { needsConfirm: !d.session };
  }
  async function resetPassword(email) { check(await sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname })); }
  async function updatePassword(password) { check(await sb.auth.updateUser({ password })); }
  async function signOut() {
    clearQueue();
    await sb.auth.signOut();
  }

  const toRow = (s) => ({ user_id: user.id, id: s.id, date: s.date, amount: s.amount, cat: s.cat, type: s.type, note: s.note || '', at: s.at || 0, updated_at: new Date().toISOString() });

  /* Everything for the signed-in user. Pushes pending changes first so the result includes them. */
  async function pull() {
    await flush();
    const row = check(await sb.from('finstack_data').select('model, prefs').maybeSingle());
    const spends = [];
    for (let from = 0; ; from += 1000) {
      const page = check(await sb.from('finstack_spends').select('id, date, amount, cat, type, note, at').order('date').order('at').range(from, from + 999));
      page.forEach((r) => spends.push({ id: r.id, date: r.date, amount: Number(r.amount), cat: r.cat, type: r.type, note: r.note || '', at: Number(r.at) || 0 }));
      if (page.length < 1000) break;
    }
    /* Keep changes made on this device that have not reached the server yet. */
    const ids = new Set(spends.map((s) => s.id));
    Object.values(queue.up).forEach((s) => { if (!ids.has(s.id)) spends.push(s); else spends[spends.findIndex((x) => x.id === s.id)] = s; });
    return { exists: !!row, model: row ? row.model : null, prefs: (row && row.prefs) || {}, spends: spends.filter((s) => !queue.del.includes(s.id)) };
  }

  /* Changes are queued even while signed out-but-cached (offline at launch) and sent once a session exists. */
  function saveData(model, prefs) { if (!enabled) return; queue.data = { model, prefs }; saveQueue(); flushSoon(); }
  function saveSpend(s) { if (!enabled) return; queue.up[s.id] = s; queue.del = queue.del.filter((id) => id !== s.id); saveQueue(); flushSoon(); }
  function deleteSpend(id) { if (!enabled) return; delete queue.up[id]; if (!queue.del.includes(id)) queue.del.push(id); saveQueue(); flushSoon(); }
  function clearQueue() { queue = { data: null, up: {}, del: [] }; saveQueue(); }

  let timer = 0;
  function flushSoon() { clearTimeout(timer); if (user) emit('saving'); timer = setTimeout(flush, 600); }

  function flush() {
    if (!sb || !user) return Promise.resolve();
    if (!hasWork()) { emit('synced'); return Promise.resolve(); }
    if (flushing) return flushing;
    emit('saving');
    flushing = (async () => {
      try {
        if (queue.data) {
          const d = queue.data;
          check(await sb.from('finstack_data').upsert({ user_id: user.id, model: d.model, prefs: d.prefs, updated_at: new Date().toISOString() }));
          if (queue.data === d) queue.data = null;
        }
        const up = Object.values(queue.up);
        if (up.length) {
          check(await sb.from('finstack_spends').upsert(up.map(toRow)));
          up.forEach((s) => { if (queue.up[s.id] === s) delete queue.up[s.id]; });
        }
        const del = queue.del.slice();
        if (del.length) {
          check(await sb.from('finstack_spends').delete().in('id', del));
          queue.del = queue.del.filter((id) => !del.includes(id));
        }
        saveQueue();
        retry = 0;
        emit(hasWork() ? 'saving' : 'synced');
        if (hasWork()) setTimeout(flush, 100);
      } catch (e) {
        saveQueue();
        emit('offline');
        retry = Math.min(retry + 1, 6);
        setTimeout(flush, 5000 * retry);
      } finally {
        flushing = null;
      }
    })();
    return flushing;
  }

  /* Delete everything this user has stored in the cloud. */
  async function wipe() {
    clearQueue();
    check(await sb.from('finstack_spends').delete().eq('user_id', user.id));
    check(await sb.from('finstack_data').delete().eq('user_id', user.id));
  }

  global.FinCloud = {
    enabled, init, signIn, signUp, resetPassword, updatePassword, signOut, pull, saveData, saveSpend, deleteSpend, clearQueue, flush, wipe,
    user: () => user,
    status: () => status,
    pending: hasWork,
    onStatus: (f) => listeners.push(f),
  };
})(window);
