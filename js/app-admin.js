/* Admin backend views. All edits work on a copy and are written with saveConfig(key). */
(function () {
  const C = window.HRDD_C, H = window.HRDD_H, S = H.S;
  const eff = window.HRDD_effective;

  async function saveCfg(key, value) {
    try { await S.store.saveConfig(key, value); S.cfg[key] = H.clone(value); H.toast(H.t('common.saved')); return true; }
    catch (e) { H.toast(e.message || 'Error'); return false; }
  }

  const TABS = [
    { sec: 'adm.sec.dd', items: ['survey', 'cycles', 'responses', 'texts-dd'] },
    { sec: 'adm.sec.rm', items: ['org', 'recs', 'zones', 'texts-rm'] },
    { sec: 'adm.sec.sys', items: ['audit', 'backup'] }
  ];
  const TAB_LABEL = { survey: 'adm.survey', cycles: 'adm.cycles', responses: 'adm.responses', 'texts-dd': 'adm.textsDd', org: 'adm.org', recs: 'adm.recs', zones: 'adm.zones', 'texts-rm': 'adm.textsRm', audit: 'adm.audit', backup: 'adm.backup' };

  C.AdminView = {
    props: ['tab'],
    data() { return { TABS, TAB_LABEL }; },
    computed: { comp() { return { survey: 'adm-survey', cycles: 'adm-cycles', responses: 'adm-responses', 'texts-dd': 'adm-texts', 'texts-rm': 'adm-texts', org: 'adm-org', recs: 'adm-recs', zones: 'adm-zones', audit: 'adm-audit', backup: 'adm-backup' }[this.tab] || 'adm-survey'; } },
    template: `<div class="admin"><nav class="anav"><template v-for="g in TABS" :key="g.sec"><h5>{{t(g.sec)}}</h5>
      <a v-for="i in g.items" :key="i" :href="'#/admin/'+i" :class="{on:tab===i}">{{t(TAB_LABEL[i])}}</a></template></nav>
      <div><component :is="comp" :key="tab" :kind="tab"></component></div></div>`
  };

  /* ---- survey content & questions ---- */
  C.AdmSurvey = {
    data() { return { tp: H.clone(S.cfg.topic) }; },
    methods: {
      move(i, d) { const a = this.tp.questions; const j = i + d; if (j < 0 || j >= a.length) return; [a[i], a[j]] = [a[j], a[i]]; },
      add() {
        const no = Math.max(0, ...this.tp.questions.map(q => q.no)) + 1;
        this.tp.questions.push({ id: 'q' + no, no, enabled: true, cat: { tc: '', sc: '', en: '' }, text: { tc: '', sc: '', en: '' }, short: { tc: '', sc: '', en: '' } });
      },
      save() { saveCfg('topic', this.tp); }
    },
    template: `<div>
      <div class="card"><div class="row"><h2 class="grow" style="margin:0">{{t('adm.surveyTexts')}}</h2><button class="btn primary" @click="save">{{t('common.save')}}</button></div>
        <label class="f">{{t('adm.topicName')}}</label><ml-input v-model="tp.name"></ml-input>
        <template v-for="k in ['title','intro','contact','required','nameNote','instrTitle','regionQ','commentTitle','commentDesc','optional']" :key="k">
          <label class="f">{{k}}</label><ml-input v-model="tp.survey[k]" :area="['intro','commentDesc'].includes(k)" :rows="3"></ml-input></template>
        <label class="f">instr</label><div v-for="(x,i) in tp.survey.instr" :key="i" style="margin-bottom:6px"><ml-input v-model="tp.survey.instr[i]" area="1"></ml-input></div>
        <label class="f">regionOptions</label><input class="input" :value="tp.survey.regionOptions.join(', ')" @change="tp.survey.regionOptions=$event.target.value.split(',').map(s=>s.trim()).filter(Boolean)">
      </div>
      <div class="card"><div class="row"><h2 class="grow" style="margin:0">{{t('adm.question')}}</h2><button class="btn" @click="add">＋ {{t('adm.addQuestion')}}</button><button class="btn primary" @click="save">{{t('common.save')}}</button></div>
        <div v-for="(q,i) in tp.questions" :key="q.id" class="qedit" style="margin-top:10px">
          <div class="row"><span class="qno">{{q.no}}</span><b class="grow">{{q.id}}</b><label><input type="checkbox" v-model="q.enabled"> {{t('adm.enabled')}}</label>
            <button class="btn sm" @click="move(i,-1)">↑</button><button class="btn sm" @click="move(i,1)">↓</button></div>
          <label class="f">{{t('adm.category')}}</label><ml-input v-model="q.cat"></ml-input>
          <label class="f">{{t('adm.question')}}</label><ml-input v-model="q.text" area="1"></ml-input>
          <label class="f">{{t('adm.short')}}</label><ml-input v-model="q.short"></ml-input>
        </div></div>
      <div class="card"><div class="row"><h2 class="grow" style="margin:0">{{t('adm.scale')}}</h2><button class="btn primary" @click="save">{{t('common.save')}}</button></div>
        <h3>{{t('dash.prob')}}</h3><div v-for="l in tp.scale.p" :key="'p'+l.level" class="qedit"><b>{{l.level}}</b> <input class="input" style="width:120px;display:inline-block" v-model="l.range">
          <ml-input v-model="l.label"></ml-input><ml-input v-model="l.desc"></ml-input><ml-input v-model="l.detail"></ml-input></div>
        <h3>{{t('dash.sev')}}</h3><div v-for="l in tp.scale.s" :key="'s'+l.level" class="qedit"><b>{{l.level}}</b><ml-input v-model="l.label"></ml-input><ml-input v-model="l.desc"></ml-input></div>
        <label class="f">sDesc</label><ml-input v-model="tp.scale.sDesc"></ml-input>
      </div></div>`
  };

  /* ---- cycles & invitees ---- */
  C.AdmCycles = {
    data() { const inv = H.clone(S.cfg.invitees || {}); S.cfg.cycles.forEach(c => { if (!inv[c.id]) inv[c.id] = {}; }); return { cycles: H.clone(S.cfg.cycles), inv, newId: '' }; },
    computed: { units() { return S.cfg.org.units.filter(u => u.type !== 'group'); } },
    methods: {
      add() { const id = this.newId.trim(); if (!id || this.cycles.some(c => c.id === id)) return; this.cycles.push({ id, name: id, open: false, active: false }); this.inv[id] = {}; this.newId = ''; },
      setActive(c) { this.cycles.forEach(x => { x.active = x === c; }); },
      invFor(c) { return this.inv[c.id]; },
      async save() { if (await saveCfg('cycles', this.cycles)) { await saveCfg('invitees', this.inv); const a = this.cycles.find(c => c.active); if (a) S.cycle = a.id; } }
    },
    template: `<div class="card"><div class="row"><h2 class="grow" style="margin:0">{{t('adm.cycles')}}</h2><button class="btn primary" @click="save">{{t('common.save')}}</button></div>
      <table class="t" style="margin-top:10px"><thead><tr><th>{{t('common.cycle')}}</th><th>{{t('common.name')}}</th><th>{{t('adm.open')}}</th><th>{{t('adm.active')}}</th><th>{{t('adm.invitees')}}</th></tr></thead>
      <tbody><tr v-for="c in cycles" :key="c.id"><td><b>{{c.id}}</b></td><td><input class="input" v-model="c.name"></td><td><input type="checkbox" v-model="c.open"></td><td><input type="radio" :checked="c.active" @change="setActive(c)"></td>
        <td><div class="row small"><label v-for="u in units" :key="u.id">{{u.id}} <input class="input" type="number" min="0" style="width:64px;display:inline-block" v-model.number="invFor(c)[u.id]"></label></div></td></tr></tbody></table>
      <div class="row" style="margin-top:10px"><input class="input" style="width:160px" v-model="newId" placeholder="2027"><button class="btn" @click="add">＋ {{t('adm.newCycle')}}</button></div></div>`
  };

  /* ---- responses & value adjustment ---- */
  C.AdmResponses = {
    data() { return { rows: [], unit: '', edit: null, reason: '', vals: {}, loading: true }; },
    created() { this.load(); },
    watch: { 'S.cycle'() { this.load(); } },
    computed: {
      qs() { return H.questions(); },
      list() { return this.rows.filter(r => !this.unit || r.unit === this.unit); },
      units() { return [...new Set(this.rows.map(r => r.unit))].sort(); }
    },
    methods: {
      async load() { this.loading = true; try { this.rows = await S.store.getResponses(S.cycle); } catch (e) { H.toast(e.message); } this.loading = false; },
      val(r, q) { const a = eff(r)[q.id]; return a ? H.fmt(a.p, Number.isInteger(+a.p) ? 0 : 2) + '/' + H.fmt(a.s, Number.isInteger(+a.s) ? 0 : 2) : ''; },
      isAdj(r, q) { return !!(r.adjusted && r.adjusted[q.id]); },
      open(r) { this.edit = r; this.reason = ''; const e = eff(r); this.vals = {}; this.qs.forEach(q => { this.vals[q.id] = { p: e[q.id] ? e[q.id].p : null, s: e[q.id] ? e[q.id].s : null }; }); },
      async saveAdj() {
        const r = this.edit, adj = {};
        this.qs.forEach(q => {
          const o = r.answers[q.id] || {}, v = this.vals[q.id];
          const d = {}; if (+v.p !== +o.p) d.p = +v.p; if (+v.s !== +o.s) d.s = +v.s;
          if (Object.keys(d).length) adj[q.id] = d;
        });
        const log = (r.adjust_log || []).concat([{ at: new Date().toISOString(), by: S.session.label, reason: this.reason, adjusted: adj }]);
        try { await S.store.updateResponse(r.id, { adjusted: Object.keys(adj).length ? adj : null, adjust_log: log }); this.edit = null; H.toast(H.t('common.saved')); this.load(); }
        catch (e) { H.toast(e.message); }
      },
      async del(r) { if (!confirm(H.t('adm.deleteConfirm'))) return; try { await S.store.deleteResponse(r.id); this.load(); } catch (e) { H.toast(e.message); } },
      async exportX() {
        const head = ['ID', H.t('common.region'), H.t('common.name'), H.t('common.email'), 'source', 'submitted'].concat(...this.qs.map(q => [q.no + ' P', q.no + ' S'])).concat([H.t('dd.step.comment'), H.t('adm.adjust')]);
        const rows = [head.map(h => ({ v: h, bold: true, fill: '#1F6F69', color: '#FFFFFF' }))];
        this.list.forEach(r => { const e = eff(r); rows.push([r.id, r.unit, r.name || r.group_label || '', r.email || '', r.source, (r.submitted_at || '').slice(0, 16)].concat(...this.qs.map(q => e[q.id] ? [{ v: +e[q.id].p, fill: this.isAdj(r, q) ? '#FDEBD0' : null }, { v: +e[q.id].s, fill: this.isAdj(r, q) ? '#FDEBD0' : null }] : ['', ''])).concat([[r.comment || '', ...Object.values(r.item_comments || {})].filter(Boolean).join(' | '), r.adjust_log ? JSON.stringify(r.adjust_log) : ''])); });
        HRDD_MATRIX.download(await XLSXW.build({ sheets: [{ name: 'Responses', rows }] }), `responses_${S.cycle}_${H.stamp()}.xlsx`);
      }
    },
    template: `<div class="card"><div class="row"><h2 class="grow" style="margin:0">{{t('adm.responses')}} · {{S.cycle}}</h2>
        <select class="input" style="width:auto" v-model="unit"><option value="">{{t('common.all')}}</option><option v-for="u in units" :key="u">{{u}}</option></select>
        <button class="btn sm" @click="exportX">⬇ Excel</button></div>
      <div v-if="loading" class="empty">{{t('common.loading')}}</div>
      <div v-else class="scroll" style="margin-top:10px"><table class="t small"><thead><tr><th>{{t('common.region')}}</th><th>{{t('common.name')}}</th><th>source</th><th v-for="q in qs" :key="q.id" class="num">{{q.no}}</th><th></th></tr></thead>
        <tbody><tr v-for="r in list" :key="r.id"><td>{{r.unit}}</td><td>{{r.name || r.group_label}}<div class="muted">{{r.email}}</div></td><td>{{r.source}}<div v-if="r.note" class="muted">{{r.note}}</div></td>
          <td v-for="q in qs" :key="q.id" class="num" :style="isAdj(r,q)?'background:#FDEBD0;font-weight:700':''">{{val(r,q)}}</td>
          <td style="white-space:nowrap"><button class="btn sm" @click="open(r)">{{t('adm.adjust')}}</button> <button class="btn sm danger" @click="del(r)">✕</button></td></tr></tbody></table></div>
      <div v-if="edit" class="modal-bg" @click.self="edit=null"><div class="modal"><h2>{{t('adm.adjust')}} · {{edit.name || edit.group_label}} ({{edit.unit}})</h2>
        <table class="t small"><thead><tr><th>{{t('dash.item')}}</th><th>{{t('adm.original')}} P/S</th><th>P</th><th>S</th></tr></thead>
          <tbody><tr v-for="q in qs" :key="q.id"><td><span class="qno">{{q.no}}</span>{{tx(q.short)}}</td><td class="muted">{{edit.answers[q.id] ? H.fmt(edit.answers[q.id].p)+' / '+H.fmt(edit.answers[q.id].s) : ''}}</td>
            <td><input class="input" type="number" min="0" max="5" step="0.1" v-model.number="vals[q.id].p" style="width:80px"></td><td><input class="input" type="number" min="0" max="5" step="0.1" v-model.number="vals[q.id].s" style="width:80px"></td></tr></tbody></table>
        <label class="f">{{t('common.reason')}} <span class="req">*</span></label><input class="input" v-model="reason">
        <div v-if="edit.adjust_log" class="small muted" style="margin-top:8px"><div v-for="(l,i) in edit.adjust_log" :key="i">{{l.at.slice(0,16)}} · {{l.by}} · {{l.reason}}</div></div>
        <div class="row" style="margin-top:14px"><span class="grow"></span><button class="btn" @click="edit=null">{{t('common.cancel')}}</button><button class="btn primary" :disabled="!reason.trim()" @click="saveAdj">{{t('common.save')}}</button></div></div></div>
    </div>`
  };

  /* ---- front-end texts (i18n overrides) ---- */
  C.AdmTexts = {
    props: ['kind'],
    data() { return { ov: H.clone(S.cfg.i18n || {}), q: '' }; },
    computed: {
      keys() {
        const pre = this.kind === 'texts-rm' ? ['nav.', 'dash.', 'rm.'] : ['app.', 'home.', 'nav.', 'common.', 'dd.', 'imp.'];
        return Object.keys(window.HRDD_I18N).filter(k => pre.some(p => k.startsWith(p)))
          .filter(k => !this.q || (k + JSON.stringify(window.HRDD_I18N[k]) + JSON.stringify(this.ov[k] || '')).toLowerCase().includes(this.q.toLowerCase()));
      }
    },
    methods: {
      def(k, l) { return window.HRDD_I18N[k][l]; },
      get(k, l) { return (this.ov[k] && this.ov[k][l]) || ''; },
      set(k, l, v) { if (!this.ov[k]) this.ov[k] = {}; this.ov[k][l] = v; },
      clean() { const o = {}; Object.keys(this.ov).forEach(k => { const x = {}; ['tc', 'sc', 'en'].forEach(l => { if (this.ov[k][l]) x[l] = this.ov[k][l]; }); if (Object.keys(x).length) o[k] = x; }); return o; },
      save() { saveCfg('i18n', this.clean()); },
      async exportX() {
        const rows = [['key', 'tc', 'sc', 'en'].map(v => ({ v, bold: true }))];
        Object.keys(window.HRDD_I18N).forEach(k => { const d = window.HRDD_I18N[k]; rows.push([k].concat(['tc', 'sc', 'en'].map(l => this.get(k, l) || d[l]))); });
        HRDD_MATRIX.download(await XLSXW.build({ sheets: [{ name: 'Texts', cols: [26, 50, 50, 50], rows }] }), `texts_${H.stamp()}.xlsx`);
      },
      async importX(ev) {
        const f = ev.target.files[0]; if (!f) return;
        const wb = XLSX.read(await f.arrayBuffer(), { type: 'array' });
        const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: '' });
        let n = 0;
        data.slice(1).forEach(r => { const d = window.HRDD_I18N[r[0]]; if (!d) return; ['tc', 'sc', 'en'].forEach((l, i) => { const v = String(r[i + 1] || ''); if (v && v !== d[l]) { this.set(r[0], l, v); n++; } }); });
        H.toast('✓ ' + n); ev.target.value = '';
      }
    },
    template: `<div class="card"><div class="row"><h2 class="grow" style="margin:0">{{ kind==='texts-rm' ? t('adm.textsRm') : t('adm.textsDd') }}</h2>
        <input class="input" style="width:200px" v-model="q" :placeholder="t('common.search')">
        <button class="btn sm" @click="exportX">⬇ {{t('adm.exportTexts')}}</button>
        <label class="btn sm">⬆ {{t('adm.importTexts')}}<input type="file" accept=".xlsx" style="display:none" @change="importX"></label>
        <button class="btn primary" @click="save">{{t('common.save')}}</button></div>
      <p class="small muted">{{t('adm.surveyTexts')}} / {{t('adm.question')}} → {{t('adm.survey')}}; {{t('adm.recs')}} → {{t('adm.recs')}}</p>
      <table class="t small"><thead><tr><th>{{t('adm.key')}}</th><th>繁</th><th>简</th><th>EN</th></tr></thead>
        <tbody><tr v-for="k in keys" :key="k"><td class="muted" style="width:150px">{{k}}</td>
          <td v-for="l in ['tc','sc','en']" :key="l"><textarea class="input" rows="1" :placeholder="def(k,l)" :value="get(k,l)" @input="set(k,l,$event.target.value)" style="min-height:34px"></textarea></td></tr></tbody></table></div>`,
  };

  /* ---- organisation & passwords ---- */
  C.AdmOrg = {
    data() { return { org: H.clone(S.cfg.org), pw: {}, newId: '' }; },
    computed: { pwUnits() { return ['ADMIN'].concat(this.org.units.filter(u => u.type === 'region').map(u => u.id)); } },
    methods: {
      add() { const id = this.newId.trim().toUpperCase(); if (!id || this.org.units.some(u => u.id === id)) return; this.org.units.push({ id, parent: 'RBU', type: 'region', name: { tc: id, sc: id, en: id } }); this.newId = ''; },
      remove(u) { if (confirm(H.t('adm.deleteConfirm'))) this.org.units = this.org.units.filter(x => x !== u); },
      save() { saveCfg('org', this.org); },
      link(u) { return location.href.split('#')[0] + '#/login/' + u; },
      async copy(u) { try { await navigator.clipboard.writeText(this.link(u)); H.toast('✓ ' + this.link(u)); } catch (e) { H.toast(this.link(u)); } },
      async setPw(u) {
        const v = this.pw[u] || ''; if (!v) return;
        try { await S.store.setPassword(u, v); this.pw[u] = ''; H.toast(H.t('adm.pwdChanged')); } catch (e) { H.toast(e.message || 'Error'); }
      }
    },
    template: `<div>
      <div class="card"><div class="row"><h2 class="grow" style="margin:0">{{t('adm.org')}}</h2><button class="btn primary" @click="save">{{t('common.save')}}</button></div>
        <div v-for="u in org.units" :key="u.id" class="qedit" style="margin-top:10px"><div class="row"><b class="grow">{{u.id}}</b><span class="muted small">{{u.type}}{{u.parent ? ' · '+u.parent : ''}}</span>
          <button v-if="u.type==='region'" class="btn sm danger" @click="remove(u)">✕</button></div><ml-input v-model="u.name"></ml-input></div>
        <div class="row"><input class="input" style="width:160px" v-model="newId" placeholder="MJP"><button class="btn" @click="add">＋ {{t('common.add')}} {{t('common.region')}}</button></div>
        </div>
      <div class="card"><h2>{{t('adm.setPassword')}}</h2><p class="hint">{{t('adm.pwInitial')}}</p>
        <table class="t"><thead><tr><th></th><th>{{t('adm.pageLink')}}</th><th>{{t('adm.setPassword')}}</th><th></th></tr></thead>
          <tbody><tr v-for="u in pwUnits" :key="u"><td style="width:140px"><b>{{u==='ADMIN' ? t('common.admin') : H.unitName(u)}}</b></td>
          <td class="small"><a :href="link(u)" target="_blank" style="word-break:break-all">{{link(u)}}</a> <button class="btn sm" @click="copy(u)">{{t('adm.copy')}}</button></td>
          <td><input class="input" type="password" autocomplete="new-password" v-model="pw[u]"></td><td style="width:90px"><button class="btn" @click="setPw(u)">{{t('common.save')}}</button></td></tr></tbody></table></div></div>`
  };

  /* ---- recommendation library ---- */
  C.AdmRecs = {
    data() { return { recs: H.clone(S.cfg.recs), q: 0, dim: '' }; },
    computed: {
      qs() { return S.cfg.topic.questions; },
      list() { return this.recs.filter(r => (!this.q || r.q === this.q) && (!this.dim || r.dim === this.dim)); }
    },
    methods: {
      add() { const q = this.q || 1, dim = this.dim || 'prevent'; this.recs.push({ id: `q${q}-${dim}-X${Date.now().toString(36)}`, q, dim, level: 'M', text: { tc: '', sc: '', en: '' } }); },
      del(r) { this.recs = this.recs.filter(x => x !== r); },
      reset() { if (confirm(H.t('adm.restoreConfirm'))) this.recs = H.clone(window.HRDD_RECS || []); },
      save() { saveCfg('recs', this.recs); }
    },
    template: `<div class="card"><div class="row"><h2 class="grow" style="margin:0">{{t('adm.recs')}} ({{list.length}})</h2>
        <select class="input" style="width:auto" v-model.number="q"><option :value="0">{{t('common.all')}}</option><option v-for="x in qs" :key="x.id" :value="x.no">{{x.no}}. {{tx(x.short)}}</option></select>
        <select class="input" style="width:auto" v-model="dim"><option value="">{{t('common.all')}}</option><option v-for="d in S.cfg.topic.dims" :key="d.id" :value="d.id">{{tx(d.name)}}</option></select>
        <button class="btn" @click="add">＋ {{t('common.add')}}</button><button class="btn sm" @click="reset">↺</button><button class="btn primary" @click="save">{{t('common.save')}}</button></div>
      <p class="small muted">G = {{t('adm.lvl.G')}} · L = {{t('adm.lvl.L')}} · M = {{t('adm.lvl.M')}} · H = {{t('adm.lvl.H')}}</p>
      <div v-for="r in list" :key="r.id" class="qedit"><div class="row small">
        <select class="input" style="width:auto" v-model.number="r.q"><option v-for="x in qs" :key="x.id" :value="x.no">{{x.no}}. {{tx(x.short)}}</option></select>
        <select class="input" style="width:auto" v-model="r.dim"><option v-for="d in S.cfg.topic.dims" :key="d.id" :value="d.id">{{tx(d.name)}}</option></select>
        <select class="input" style="width:auto" v-model="r.level"><option v-for="l in ['G','L','M','H']" :key="l" :value="l">{{l}} – {{t('adm.lvl.'+l)}}</option></select>
        <input class="input" style="width:140px" v-model="r.ref" placeholder="ref"><span class="grow"></span><button class="btn sm danger" @click="del(r)">✕</button></div>
        <ml-input v-model="r.text" area="1" style="margin-top:6px"></ml-input></div></div>`
  };

  /* ---- zones & urgency ---- */
  C.AdmZones = {
    data() { return { tp: H.clone(S.cfg.topic), urg: H.clone(S.cfg.urgency) }; },
    methods: {
      flip(r, c) { const row = this.tp.zones[r].split(''); row[c] = { L: 'M', M: 'H', H: 'L' }[row[c]]; this.tp.zones[r] = row.join(''); },
      async save() { if (await saveCfg('topic', this.tp)) await saveCfg('urgency', this.urg); }
    },
    template: `<div>
      <div class="card"><div class="row"><h2 class="grow" style="margin:0">{{t('adm.zones')}}</h2><button class="btn primary" @click="save">{{t('common.save')}}</button></div>
        <p class="small muted">{{t('adm.paint')}}</p>
        <div class="row" style="align-items:flex-start;gap:24px"><div><div class="small muted">↑ {{t('dash.prob')}} 5.0</div>
          <div class="zgrid"><template v-for="(row,r) in tp.zones" :key="r"><div v-for="(z,c) in row.split('')" :key="c" :style="{background: tp.zoneColors[z]}" @click="flip(r,c)">{{z}}</div></template></div>
          <div class="small muted">0.0 → {{t('dash.sev')}} 5.0</div></div>
          <div class="grow"><h3>{{t('adm.zoneLabels')}}</h3>
            <div v-for="z in ['H','M','L']" :key="z" style="margin-bottom:8px"><div class="row"><input type="color" v-model="tp.zoneColors[z]"><b>{{z}}</b></div><ml-input v-model="tp.zoneLabels[z]"></ml-input></div></div></div></div>
      <div class="card"><h2>{{t('rm.urgency')}}</h2><p class="small muted">{{t('rm.formula')}}</p>
        <div class="grid3"><div><h3>{{t('adm.riskWeight')}}</h3><label v-for="z in ['H','M']" :key="z" class="row small">{{tx(tp.zoneLabels[z])}} <input class="input" type="number" step="0.1" style="width:90px" v-model.number="urg.riskWeight[z]"></label></div>
          <div><h3>{{t('adm.itemWeight')}}</h3><label v-for="l in ['G','M','H','C']" :key="l" class="row small">{{l}} <input class="input" type="number" step="0.1" style="width:90px" v-model.number="urg.itemWeight[l]"></label></div>
          <div><h3>{{t('adm.tiers')}}</h3><label v-for="(v,i) in urg.tiers" :key="i" class="row small"><span class="badge" :class="'t-'+i">{{t('rm.tier.'+i)}}</span> ≥ <input class="input" type="number" style="width:80px" v-model.number="urg.tiers[i]"></label></div></div></div></div>`
  };

  /* ---- audit log ---- */
  C.AdmAudit = {
    data() { return { rows: [] }; },
    async created() { try { this.rows = await S.store.getAudit(); } catch (e) { H.toast(e.message); } },
    template: `<div class="card"><h2>{{t('adm.audit')}}</h2><div class="scroll"><table class="t small"><thead><tr><th>time</th><th>actor</th><th>action</th><th>detail</th></tr></thead>
      <tbody><tr v-for="(r,i) in rows" :key="i"><td style="white-space:nowrap">{{(r.at||'').slice(0,19).replace('T',' ')}}</td><td>{{r.actor}}</td><td>{{r.action}}</td><td class="muted" style="word-break:break-all">{{JSON.stringify(r.detail)}}</td></tr></tbody></table></div></div>`
  };

  /* ---- backup ---- */
  C.AdmBackup = {
    methods: {
      async exp() { const d = await S.store.exportAll(); HRDD_MATRIX.download(new Blob([JSON.stringify(d, null, 1)], { type: 'application/json' }), `hrdd-backup_${H.stamp()}.json`); },
      async imp(ev) {
        const f = ev.target.files[0]; if (!f) return;
        if (!confirm(H.t('adm.restoreConfirm'))) { ev.target.value = ''; return; }
        try { await S.store.importAll(JSON.parse(await f.text())); location.reload(); } catch (e) { H.toast(e.message); }
      },
      async reset() { if (!confirm(H.t('adm.restoreConfirm'))) return; await S.store.resetDemo(); location.reload(); }
    },
    template: `<div class="card"><h2>{{t('adm.backup')}}</h2><div class="row">
      <button class="btn" @click="exp">⬇ {{t('adm.exportAll')}}</button>
      <label class="btn">⬆ {{t('adm.importAll')}}<input type="file" accept=".json" style="display:none" @change="imp"></label>
      <button v-if="S.mode==='demo'" class="btn danger" @click="reset">{{t('adm.resetDemo')}}</button></div></div>`
  };
})();
