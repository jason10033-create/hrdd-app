/* Data layer. Two interchangeable stores with the same async API:
 *  - DemoStore: localStorage, for trying the tool without a backend
 *  - SupabaseStore: production; access control enforced by Postgres RLS (supabase/schema.sql)
 * Config keys kept in app_config: org, topic, cycles, urgency, i18n, recs, invitees */
(function () {
  const CFG = window.HRDD_CONFIG || {};
  const SEED = window.HRDD_SEED;
  const CONFIG_KEYS = ['org', 'topic', 'cycles', 'urgency', 'i18n', 'recs', 'invitees'];
  const clone = o => JSON.parse(JSON.stringify(o));

  function defaults() {
    return {
      org: clone(SEED.org), topic: clone(SEED.topic), cycles: clone(SEED.cycles), urgency: clone(SEED.urgency),
      i18n: {}, recs: clone(window.HRDD_RECS || []), invitees: {}
    };
  }

  // Answers with admin adjustments applied.
  function effective(r) {
    const a = Object.assign({}, r.answers || {});
    if (r.adjusted) Object.keys(r.adjusted).forEach(k => { a[k] = Object.assign({}, a[k], r.adjusted[k]); });
    return a;
  }

  async function sha(text) {
    if (window.crypto && crypto.subtle) {
      const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('hrdd:' + text));
      return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
    }
    let h = 0; for (const c of 'hrdd:' + text) h = (h * 31 + c.charCodeAt(0)) | 0; return 'x' + h;
  }

  /* ---------------- Demo store ---------------- */
  class DemoStore {
    constructor() { this.mode = 'demo'; this.KEY = 'hrdd_demo_v1'; }
    _load() { try { return JSON.parse(localStorage.getItem(this.KEY)); } catch (e) { return null; } }
    _save() { try { localStorage.setItem(this.KEY, JSON.stringify(this.db)); } catch (e) { console.warn(e); } }
    async _fresh() {
      const pw = {};
      // Demo-only passwords (documented in README). Change them in 後台 > 組織與密碼.
      for (const u of ['ADMIN', 'MHQ', 'MAT', 'MCN', 'MUS', 'MEU']) pw[u] = await sha(u + '#2026');
      return { config: defaults(), responses: clone(SEED.responses), inventories: {}, audit: [], pw };
    }
    async init() {
      this.db = this._load();
      if (!this.db) { this.db = await this._fresh(); this._save(); }
      // fill config keys added in newer versions
      const d = defaults();
      CONFIG_KEYS.forEach(k => { if (this.db.config[k] === undefined) this.db.config[k] = d[k]; });
      if (!this.db.config.recs.length && d.recs.length) this.db.config.recs = d.recs;
      try { this.session = JSON.parse(sessionStorage.getItem('hrdd_session')); } catch (e) { this.session = null; }
      return clone(this.db.config);
    }
    getSession() { return this.session; }
    async login(unit, password) {
      const h = await sha(password);
      if (this.db.pw[unit] !== h) throw new Error('login');
      this.session = { unit: unit === 'ADMIN' ? null : unit, role: unit === 'ADMIN' ? 'admin' : 'region', label: unit };
      try { sessionStorage.setItem('hrdd_session', JSON.stringify(this.session)); } catch (e) {}
      this.log('login', { unit });
      return this.session;
    }
    async logout() { this.session = null; try { sessionStorage.removeItem('hrdd_session'); } catch (e) {} }
    _isAdmin() { return this.session && this.session.role === 'admin'; }
    _canUnit(u) { return this._isAdmin() || (this.session && this.session.unit === u); }
    async saveConfig(key, value) {
      if (!this._isAdmin()) throw new Error('forbidden');
      this.db.config[key] = clone(value); this._save(); this.log('config', { key });
    }
    async submitResponse(r) {
      const cyc = (this.db.config.cycles || []).find(c => c.id === r.cycle);
      if (!cyc || !cyc.open) throw new Error('closed');
      this.db.responses.push(Object.assign({ id: 'm-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7), source: 'manual', weight: 1 }, clone(r)));
      this._save();
    }
    async upsertResponses(list) {
      list.forEach(r => {
        if (!this._canUnit(r.unit)) throw new Error('forbidden');
        const i = this.db.responses.findIndex(x => x.id === r.id);
        if (i >= 0) this.db.responses[i] = Object.assign({}, this.db.responses[i], clone(r)); else this.db.responses.push(clone(r));
      });
      this._save(); this.log('import', { count: list.length });
    }
    async getScores(cycle) {
      if (!this.session) return [];
      return this.db.responses.filter(r => r.cycle === cycle).map(r => ({
        unit: (this._isAdmin() || r.unit === 'MHQ' || r.unit === this.session.unit) ? r.unit : 'RBU_OTHER',
        group_label: r.group_label || null, answers: effective(r), weight: r.weight || 1, source: r.source
      }));
    }
    async getResponses(cycle) {
      return clone(this.db.responses.filter(r => (!cycle || r.cycle === cycle) && this._canUnit(r.unit)));
    }
    async updateResponse(id, patch) {
      if (!this._isAdmin()) throw new Error('forbidden');
      const r = this.db.responses.find(x => x.id === id); Object.assign(r, clone(patch)); this._save();
      this.log('adjust', { id, patch });
    }
    async deleteResponse(id) {
      if (!this._isAdmin()) throw new Error('forbidden');
      this.db.responses = this.db.responses.filter(x => x.id !== id); this._save(); this.log('delete-response', { id });
    }
    async getInventory(unit, cycle) {
      if (!this._canUnit(unit)) throw new Error('forbidden');
      return clone(this.db.inventories[unit + '|' + cycle] || { items: {}, custom: [] });
    }
    async saveInventory(unit, cycle, data) {
      if (!this._canUnit(unit)) throw new Error('forbidden');
      data.updated_at = new Date().toISOString(); data.updated_by = this.session.label;
      this.db.inventories[unit + '|' + cycle] = clone(data); this._save();
    }
    async listInventories(cycle) {
      const out = {};
      Object.keys(this.db.inventories).forEach(k => { const [u, c] = k.split('|'); if (c === cycle && this._canUnit(u)) out[u] = clone(this.db.inventories[k]); });
      return out;
    }
    async log(action, detail) {
      this.db.audit.unshift({ at: new Date().toISOString(), actor: this.session ? this.session.label : 'anonymous', action, detail });
      this.db.audit = this.db.audit.slice(0, 1000); this._save();
    }
    async getAudit() { return this._isAdmin() ? clone(this.db.audit) : []; }
    async setPassword(unit, pw) {
      if (!this._isAdmin()) throw new Error('forbidden');
      this.db.pw[unit] = await sha(pw); this._save(); this.log('password', { unit });
    }
    async exportAll() { return { exported_at: new Date().toISOString(), config: clone(this.db.config), responses: clone(this.db.responses), inventories: clone(this.db.inventories) }; }
    async importAll(obj) {
      if (!this._isAdmin()) throw new Error('forbidden');
      if (obj.config) this.db.config = Object.assign(defaults(), obj.config);
      if (obj.responses) this.db.responses = obj.responses;
      if (obj.inventories) this.db.inventories = obj.inventories;
      this._save(); this.log('restore', {});
    }
    async resetDemo() { const s = this.session; this.db = await this._fresh(); this._save(); this.session = s; }
  }

  /* ---------------- Supabase store ----------------
   * No Supabase Auth accounts: each of the 5 pages (4 regions + admin) has a password whose SHA-256 hash
   * is kept in app_config "passwords" and checked in the browser. Region visibility is applied here,
   * in the client (front-end protection only, as decided by the owner). */
  class SupabaseStore {
    constructor() {
      this.mode = 'supabase';
      this.sb = window.supabase.createClient(CFG.supabaseUrl, CFG.supabaseAnonKey, { auth: { persistSession: false } });
    }
    _chk(res) { if (res.error) throw res.error; return res.data; }
    _isAdmin() { return this.session && this.session.role === 'admin'; }
    _canUnit(u) { return this._isAdmin() || (this.session && this.session.unit === u); }
    async init() {
      const rows = this._chk(await this.sb.from('app_config').select('key,value'));
      const cfg = defaults();
      this.pw = {};
      rows.forEach(r => { if (r.key === 'passwords') this.pw = r.value || {}; else cfg[r.key] = r.value; });
      if (!cfg.recs || !cfg.recs.length) cfg.recs = clone(window.HRDD_RECS || []);
      this.cycles = cfg.cycles;
      try { this.session = JSON.parse(sessionStorage.getItem('hrdd_session')); } catch (e) { this.session = null; }
      return cfg;
    }
    getSession() { return this.session; }
    async login(unit, password) {
      // Until a password is set in 後台, the initial password is <UNIT>#2026 (change it right away).
      const expected = this.pw[unit] || await sha(unit + '#2026');
      if (await sha(password) !== expected) throw new Error('login');
      this.session = { unit: unit === 'ADMIN' ? null : unit, role: unit === 'ADMIN' ? 'admin' : 'region', label: unit };
      try { sessionStorage.setItem('hrdd_session', JSON.stringify(this.session)); } catch (e) {}
      this.log('login', { unit });
      return this.session;
    }
    async logout() { this.session = null; try { sessionStorage.removeItem('hrdd_session'); } catch (e) {} }
    async saveConfig(key, value) {
      if (!this._isAdmin()) throw new Error('forbidden');
      this._chk(await this.sb.from('app_config').upsert({ key, value, updated_at: new Date().toISOString() }));
      if (key === 'cycles') this.cycles = value;
      this.log('config', { key });
    }
    async submitResponse(r) {
      const cyc = (this.cycles || []).find(c => c.id === r.cycle);
      if (!cyc || !cyc.open) throw new Error('closed');
      this._chk(await this.sb.from('responses').insert(Object.assign({ source: 'manual', weight: 1 }, r)));
    }
    async upsertResponses(list) {
      list.forEach(r => { if (!this._canUnit(r.unit)) throw new Error('forbidden'); });
      for (let i = 0; i < list.length; i += 200) this._chk(await this.sb.from('responses').upsert(list.slice(i, i + 200), { onConflict: 'id' }));
      this.log('import', { count: list.length });
    }
    async _all(cycle) {
      let q = this.sb.from('responses').select('*').order('submitted_at');
      if (cycle) q = q.eq('cycle', cycle);
      return this._chk(await q);
    }
    async getScores(cycle) {
      if (!this.session) return [];
      return (await this._all(cycle)).map(r => ({
        unit: (this._isAdmin() || r.unit === 'MHQ' || r.unit === this.session.unit) ? r.unit : 'RBU_OTHER',
        group_label: r.group_label || null, answers: effective(r), weight: r.weight || 1, source: r.source
      }));
    }
    async getResponses(cycle) {
      if (!this.session) return [];
      return (await this._all(cycle)).filter(r => this._canUnit(r.unit));
    }
    async updateResponse(id, patch) {
      if (!this._isAdmin()) throw new Error('forbidden');
      this._chk(await this.sb.from('responses').update(patch).eq('id', id));
      this.log('adjust', { id, patch });
    }
    async deleteResponse(id) {
      if (!this._isAdmin()) throw new Error('forbidden');
      this._chk(await this.sb.from('responses').delete().eq('id', id));
      this.log('delete-response', { id });
    }
    async getInventory(unit, cycle) {
      if (!this._canUnit(unit)) throw new Error('forbidden');
      const r = this._chk(await this.sb.from('inventories').select('data').eq('unit', unit).eq('cycle', cycle).maybeSingle());
      return r ? r.data : { items: {}, custom: [] };
    }
    async saveInventory(unit, cycle, data) {
      if (!this._canUnit(unit)) throw new Error('forbidden');
      data.updated_at = new Date().toISOString(); data.updated_by = this.session.label;
      this._chk(await this.sb.from('inventories').upsert({ unit, cycle, data, updated_at: data.updated_at }));
    }
    async listInventories(cycle) {
      const rows = this._chk(await this.sb.from('inventories').select('unit,data').eq('cycle', cycle));
      const out = {}; rows.forEach(r => { if (this._canUnit(r.unit)) out[r.unit] = r.data; }); return out;
    }
    async log(action, detail) {
      try { await this.sb.from('audit_log').insert({ actor: this.session ? this.session.label : 'anonymous', action, detail }); } catch (e) {}
    }
    async getAudit() {
      if (!this._isAdmin()) return [];
      return this._chk(await this.sb.from('audit_log').select('*').order('at', { ascending: false }).limit(1000));
    }
    async setPassword(unit, pw) {
      if (!this._isAdmin()) throw new Error('forbidden');
      const next = Object.assign({}, this.pw, { [unit]: await sha(pw) });
      this._chk(await this.sb.from('app_config').upsert({ key: 'passwords', value: next, updated_at: new Date().toISOString() }));
      this.pw = next; this.log('password', { unit });
    }
    async exportAll() {
      if (!this._isAdmin()) throw new Error('forbidden');
      const cfg = this._chk(await this.sb.from('app_config').select('key,value'));
      const config = {}; cfg.forEach(r => { if (r.key !== 'passwords') config[r.key] = r.value; });
      const inv = this._chk(await this.sb.from('inventories').select('*'));
      const inventories = {}; inv.forEach(r => { inventories[r.unit + '|' + r.cycle] = r.data; });
      return { exported_at: new Date().toISOString(), config, responses: await this._all(null), inventories };
    }
    async importAll(obj) {
      if (!this._isAdmin()) throw new Error('forbidden');
      if (obj.config) for (const k of Object.keys(obj.config)) if (k !== 'passwords') await this.saveConfig(k, obj.config[k]);
      if (obj.responses && obj.responses.length) await this.upsertResponses(obj.responses);
      if (obj.inventories) for (const k of Object.keys(obj.inventories)) {
        const [u, c] = k.split('|');
        this._chk(await this.sb.from('inventories').upsert({ unit: u, cycle: c, data: obj.inventories[k] }));
      }
      this.log('restore', {});
    }
    async resetDemo() { throw new Error('not available'); }
  }

  window.HRDD_createStore = function () {
    if (CFG.supabaseUrl && CFG.supabaseAnonKey && window.supabase) return new SupabaseStore();
    return new DemoStore();
  };
  window.HRDD_effective = effective;
})();
