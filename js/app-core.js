/* Shared state/helpers + Login, Survey and Forms-import views. */
(function () {
  const { reactive } = Vue;
  const M = window.HRDD_MATRIX;
  const C = window.HRDD_C = {};
  const S = window.HRDD_S = reactive({ store: null, cfg: null, session: null, lang: 'tc', cycle: null, route: '/survey', toast: '', mode: 'demo', after: null });
  const clone = o => JSON.parse(JSON.stringify(o));
  const LANGS = [{ id: 'tc', label: '繁' }, { id: 'sc', label: '简' }, { id: 'en', label: 'EN' }];

  function t(k) {
    const o = S.cfg && S.cfg.i18n && S.cfg.i18n[k];
    if (o && o[S.lang]) return o[S.lang];
    const d = window.HRDD_I18N[k];
    return d ? (d[S.lang] || d.tc) : k;
  }
  function tx(o) { if (!o) return ''; if (typeof o === 'string') return o; return o[S.lang] || o.tc || o.en || ''; }
  let toastTimer;
  function toast(msg) { S.toast = msg; clearTimeout(toastTimer); toastTimer = setTimeout(() => { S.toast = ''; }, 2400); }
  function go(path) { location.hash = '#' + path; }
  function questions() { return S.cfg.topic.questions.filter(q => q.enabled !== false); }
  function regions() { return S.cfg.org.units.filter(u => u.type === 'region'); }
  function unitName(id) {
    if (id === 'RBU_OTHER') return t('dash.otherRbu');
    const u = S.cfg.org.units.find(x => x.id === id); return u ? tx(u.name) : id;
  }
  function isAdmin() { return !!(S.session && S.session.role === 'admin'); }
  function allowedScopes() {
    const r = regions().map(u => u.id);
    if (isAdmin()) return ['MHQ', 'RBU', ...r];
    if (S.session) return ['MHQ', 'RBU', ...r.filter(id => id === S.session.unit)];
    return [];
  }
  function zoneOf(p, s) { return M.zoneOf(p, s, S.cfg.topic.zones); }
  function zoneLabel(z) { return tx(S.cfg.topic.zoneLabels[z]); }
  function fmt(v, d) { return v == null || isNaN(v) ? '–' : (+v).toFixed(d == null ? 2 : d); }
  function stamp() { return new Date().toISOString().replace(/[-:T]/g, '').slice(0, 12); }

  /* ---------- risk-management calculations ---------- */
  function zoneLevels(z) { return z === 'H' ? ['G', 'M', 'H'] : z === 'M' ? ['G', 'M'] : ['G', 'L']; }
  function recsFor(q, dim, zone) {
    return S.cfg.recs.filter(r => r.q === q.no && r.dim === dim && zoneLevels(zone).includes(r.level))
      .sort((a, b) => 'GLMH'.indexOf(a.level) - 'GLMH'.indexOf(b.level));
  }
  function recStatus(inv, rec) {
    const it = inv && inv.items && inv.items[rec.id];
    if (it && it.status) return it.status;
    return rec.level === 'G' ? 'group' : 'none';
  }
  function issueUrgency(q, zone, inv) {
    if (!zone || zone === 'L') return { urg: 0, cov: 1, gaps: 0, planned: 0, total: 0 };
    const W = S.cfg.urgency.itemWeight || {};
    let tot = 0, got = 0, gaps = 0, planned = 0, total = 0;
    const add = (st, w) => {
      total++;
      if (st === 'na') return;
      tot += w;
      if (st === 'done' || st === 'group') got += w;
      else if (st === 'partial') { got += w * 0.5; gaps++; }
      else { gaps++; if (st === 'plan') planned++; }
    };
    S.cfg.recs.filter(r => r.q === q.no && zoneLevels(zone).includes(r.level)).forEach(r => add(recStatus(inv, r), W[r.level] || 1));
    ((inv && inv.custom) || []).filter(c => c.q === q.id).forEach(c => add(c.status || 'none', W.C || 1));
    const cov = tot ? got / tot : 1;
    return { urg: (S.cfg.urgency.riskWeight[zone] || 0) * (1 - cov) * 100, cov, gaps, planned, total };
  }
  function tierOf(v) { const th = S.cfg.urgency.tiers; return v >= th[0] ? 0 : v >= th[1] ? 1 : v >= th[2] ? 2 : 3; }
  function unitSummary(agg, inv) {
    const issues = questions().filter(q => agg[q.id]).map(q => {
      const a = agg[q.id], zone = zoneOf(a.p, a.s);
      return Object.assign({ q, a, zone }, issueUrgency(q, zone, inv));
    }).sort((x, y) => y.a.score - x.a.score);
    const att = issues.filter(i => i.zone !== 'L');
    const index = att.length ? att.reduce((t, i) => t + i.urg, 0) / att.length : 0;
    const cov = att.length ? att.reduce((t, i) => t + i.cov, 0) / att.length : 1;
    return { issues, att, index, cov, tier: tierOf(index), gaps: att.reduce((t, i) => t + i.gaps, 0), planned: att.reduce((t, i) => t + i.planned, 0) };
  }

  Object.assign(window, { HRDD_H: { S, t, tx, toast, go, clone, questions, regions, unitName, isAdmin, allowedScopes, zoneOf, zoneLabel, fmt, stamp, LANGS, recsFor, recStatus, issueUrgency, tierOf, unitSummary, zoneLevels } });

  /* ---------- multi-language input ---------- */
  C.MlInput = {
    props: ['modelValue', 'area', 'rows'], emits: ['update:modelValue'],
    template: `<div class="ml"><template v-for="l in ['tc','sc','en']" :key="l"><span>{{ {tc:'繁',sc:'简',en:'EN'}[l] }}</span>
      <textarea v-if="area" class="input" :rows="rows||2" :value="modelValue && modelValue[l]" @input="upd(l,$event.target.value)"></textarea>
      <input v-else class="input" :value="modelValue && modelValue[l]" @input="upd(l,$event.target.value)"></template></div>`,
    methods: { upd(l, v) { const o = Object.assign({}, this.modelValue || {}); o[l] = v; this.$emit('update:modelValue', o); } }
  };

  /* ---------- scale definition tables ---------- */
  C.DefTables = {
    props: ['which'],
    template: `<div :class="which==='both' ? 'grid2' : ''">
      <table class="deftab" v-if="which!=='s'"><thead><tr><th colspan="4">{{ t('dash.prob') }} Probability</th></tr>
        <tr><th>{{t('dd.level')}}</th><th>{{t('dd.rating')}}</th><th></th><th>{{t('dd.description')}}</th></tr></thead>
        <tbody><tr v-for="l in S.cfg.topic.scale.p" :key="l.level"><td>{{l.level}}</td><td>{{tx(l.label)}}</td><td>{{l.range}}</td><td>{{tx(l.desc)}}<div class="muted small">{{tx(l.detail)}}</div></td></tr></tbody></table>
      <table class="deftab" v-if="which!=='p'"><thead><tr><th colspan="3">{{ t('dash.sev') }} Severity</th></tr>
        <tr><th>{{t('dd.level')}}</th><th>{{t('dd.rating')}}</th><th>{{t('dd.description')}}</th></tr></thead>
        <tbody><tr v-for="l in S.cfg.topic.scale.s" :key="l.level"><td>{{l.level}}</td><td>{{tx(l.label)}}</td><td>{{tx(l.desc)}}</td></tr>
        <tr><td colspan="3" class="muted small">{{tx(S.cfg.topic.scale.sDesc)}}</td></tr></tbody></table></div>`
  };

  /* ---------- login ---------- */
  // Each region (and the administrator) has its own sign-in page: #/login/MAT, #/login/ADMIN ...
  C.LoginView = {
    props: ['unit'],
    data() { return { pw: '', err: '', busy: false }; },
    computed: {
      units() { return [...HRDD_H.regions().map(u => ({ id: u.id, name: HRDD_H.tx(u.name) })), { id: 'ADMIN', name: HRDD_H.t('common.admin') }]; },
      current() { return this.units.find(u => u.id === this.unit); }
    },
    template: `<div class="card login">
      <template v-if="!current"><h2>{{t('common.loginTitle')}}</h2><p class="muted">{{t('common.loginPick')}}</p>
        <a v-for="u in units" :key="u.id" class="btn" :href="'#/login/'+u.id" style="display:block;margin-top:8px;text-decoration:none;color:inherit;padding:12px 16px"><b>{{u.name}}</b><span style="float:right">→</span></a></template>
      <template v-else><a href="#/login" class="small">← {{t('common.loginOther')}}</a>
        <h2 style="margin-top:10px">{{current.name}}</h2><p class="muted">{{t('common.loginHint')}}</p>
        <label class="f">{{t('common.password')}}</label>
        <input class="input" type="password" v-model="pw" @keyup.enter="login" autocomplete="current-password">
        <p v-if="err" style="color:var(--danger)">{{err}}</p>
        <div class="row" style="margin-top:14px"><button class="btn primary" :disabled="!pw||busy" @click="login">{{t('common.login')}}</button></div></template></div>`,
    methods: {
      async login() {
        this.busy = true; this.err = '';
        try {
          S.session = await S.store.login(this.unit, this.pw);
          const to = (S.after && !S.after.startsWith('/login')) ? S.after : '/dashboard'; S.after = null; HRDD_H.go(to);
        } catch (e) { this.err = HRDD_H.t('common.loginFail'); }
        this.busy = false;
      }
    }
  };

  /* ---------- survey ---------- */
  C.SurveyView = {
    data() { return { step: 0, done: false, busy: false, tried: false, f: this.blank() }; },
    created() {
      try {
        const d = JSON.parse(localStorage.getItem(this.draftKey()));
        if (d && d.answers) { Object.keys(d.answers).forEach(k => { if (this.f.answers[k]) this.f.answers[k] = d.answers[k]; }); delete d.answers; Object.assign(this.f, d); }
      } catch (e) {}
    },
    computed: {
      qs() { return HRDD_H.questions(); },
      sv() { return S.cfg.topic.survey; },
      cyc() { return S.cfg.cycles.find(c => c.id === S.cycle); },
      countP() { return this.qs.filter(q => this.f.answers[q.id].p).length; },
      countS() { return this.qs.filter(q => this.f.answers[q.id].s).length; },
      highP() { return this.qs.filter(q => this.f.answers[q.id].p >= 3); },
      canNext() {
        if (this.step === 0) return !!(this.f.name.trim() && this.f.unit && this.f.agree);
        if (this.step === 1) return this.countP === this.qs.length;
        if (this.step === 2) return this.countS === this.qs.length;
        return true;
      },
      steps() { return ['dd.step.info', 'dd.step.p', 'dd.step.s', 'dd.step.comment', 'dd.step.review']; },
      svg() {
        const pts = this.qs.map(q => ({ no: q.no, id: q.id, p: this.f.answers[q.id].p || 0, s: this.f.answers[q.id].s || 0, tip: HRDD_H.tx(q.short) }));
        return HRDD_MATRIX.renderSVG({ points: pts, zones: S.cfg.topic.zones, colors: S.cfg.topic.zoneColors, zoneLabels: { H: HRDD_H.zoneLabel('H'), M: HRDD_H.zoneLabel('M'), L: HRDD_H.zoneLabel('L') }, xLabel: HRDD_H.t('dash.sev'), yLabel: HRDD_H.t('dash.prob'), width: 520, clusterLabels: true });
      }
    },
    watch: { f: { deep: true, handler() { try { localStorage.setItem(this.draftKey(), JSON.stringify(this.f)); } catch (e) {} } } },
    methods: {
      draftKey() { return 'hrdd_draft_' + S.cycle; },
      blank() { const a = {}; HRDD_H.questions().forEach(q => { a[q.id] = { p: null, s: null }; }); return { name: '', email: '', unit: '', agree: false, answers: a, item_comments: {}, comment: '' }; },
      next() { this.tried = true; if (!this.canNext) return; this.tried = false; this.step++; window.scrollTo(0, 0); },
      back() { this.step--; window.scrollTo(0, 0); },
      async submit() {
        this.busy = true;
        try {
          const ic = {}; this.highP.forEach(q => { const v = (this.f.item_comments[q.id] || '').trim(); if (v) ic[q.id] = v; });
          await S.store.submitResponse({ cycle: S.cycle, unit: this.f.unit, name: this.f.name.trim(), email: this.f.email.trim(), lang: S.lang, submitted_at: new Date().toISOString(), answers: HRDD_H.clone(this.f.answers), item_comments: ic, comment: this.f.comment.trim() });
          this.done = true; try { localStorage.removeItem(this.draftKey()); } catch (e) {}
        } catch (e) { HRDD_H.toast(e.message === 'closed' ? HRDD_H.t('dd.surveyClosed') : (e.message || 'Error')); }
        this.busy = false;
      },
      again() { this.f = this.blank(); this.step = 0; this.done = false; },
      lvlLabel(which, v) { const l = S.cfg.topic.scale[which].find(x => x.level === v); return l ? v + ' ' + HRDD_H.tx(l.label) : ''; }
    },
    template: `<div>
    <div v-if="!cyc || !cyc.open" class="card empty">{{t('dd.surveyClosed')}}</div>
    <div v-else-if="done" class="card empty"><h2>{{t('dd.thanks')}}</h2><button class="btn" @click="again">{{t('dd.again')}}</button></div>
    <template v-else>
      <div class="steps"><span v-for="(s,i) in steps" :key="s" :class="{on:step===i, done:step>i}">{{i+1}}. {{t(s)}}</span></div>

      <div v-if="step===0">
        <div class="card"><h2 style="font-size:22px">{{tx(sv.title)}}</h2><p class="pre">{{tx(sv.intro)}}</p><p class="pre">{{tx(sv.contact)}}</p></div>
        <div class="card"><h2 style="color:var(--brand)">{{tx(sv.instrTitle)}}</h2>
          <p v-for="(x,i) in sv.instr" :key="i" class="pre" style="font-weight:500">{{tx(x)}}</p>
          <def-tables which="both"></def-tables></div>
        <div class="card"><p class="req small">{{tx(sv.required)}}</p>
          <label class="f">{{tx(sv.nameNote)}}</label><input class="input" v-model="f.name" :style="tried&&!f.name.trim()?'border-color:var(--danger)':''">
          <label class="f">{{t('common.email')}} <span class="muted small">{{tx(sv.optional)}}</span></label><input class="input" type="email" v-model="f.email">
          <label class="f">{{tx(sv.regionQ)}} <span class="req">*</span></label>
          <div class="chips"><button v-for="u in sv.regionOptions" :key="u" class="chip" :class="{on:f.unit===u}" @click="f.unit=u">{{u}}</button></div>
          <div class="hint" style="margin-top:16px">{{t('dd.privacy')}}<label style="display:flex;gap:8px;margin-top:8px;cursor:pointer"><input type="checkbox" v-model="f.agree"> <b>{{t('dd.privacyAgree')}}</b></label></div>
        </div>
      </div>

      <div v-if="step===1 || step===2" class="card">
        <h2>{{ step===1 ? t('dd.step.p') : t('dd.step.s') }}</h2>
        <p class="muted">{{ step===1 ? t('dd.pStepHint') : t('dd.sStepHint') }}</p>
        <def-tables :which="step===1?'p':'s'"></def-tables>
        <table class="mtx" style="margin-top:14px"><thead><tr><th style="text-align:left">{{t('dash.item')}}</th><th v-for="(o,i) in S.cfg.topic.scale.options" :key="i">{{tx(o)}}</th></tr></thead>
          <tbody><tr v-for="q in qs" :key="q.id" :class="{miss: tried && !f.answers[q.id][step===1?'p':'s']}">
            <td class="q"><div class="cat">【{{tx(q.cat)}}】</div><div style="display:flex"><span class="qno">{{q.no}}</span><span>{{tx(q.text)}} <span class="req">*</span></span></div></td>
            <td v-for="v in 5" :key="v" class="opt"><button class="radio" :class="{on: f.answers[q.id][step===1?'p':'s']===v}" :title="lvlLabel(step===1?'p':'s', v)" @click="f.answers[q.id][step===1?'p':'s']=v">{{v}}</button></td>
          </tr></tbody></table>
      </div>

      <div v-if="step===3" class="card">
        <h2>{{t('dd.step.comment')}}</h2>
        <div v-for="q in highP" :key="q.id" style="margin-bottom:12px"><label class="f"><span class="qno">{{q.no}}</span>{{tx(q.short)}} <span class="muted small">（P={{f.answers[q.id].p}}）{{t('dd.itemComment')}}</span></label>
          <textarea class="input" v-model="f.item_comments[q.id]"></textarea></div>
        <label class="f">{{tx(sv.commentTitle)}}</label><p class="muted small" style="margin:0 0 6px">{{tx(sv.commentDesc)}} {{tx(sv.optional)}}</p>
        <textarea class="input" rows="4" v-model="f.comment"></textarea>
      </div>

      <div v-if="step===4" class="grid2">
        <div class="card"><h2>{{t('dd.step.review')}}</h2><p class="muted">{{t('dd.reviewHint')}}</p>
          <p><b>{{f.name}}</b> · {{f.unit}} <span v-if="f.email" class="muted">· {{f.email}}</span></p>
          <table class="t"><thead><tr><th>{{t('dash.item')}}</th><th class="num">P</th><th class="num">S</th><th>{{t('dash.zone')}}</th></tr></thead>
          <tbody><tr v-for="q in qs" :key="q.id"><td><span class="qno">{{q.no}}</span>{{tx(q.short)}}</td><td class="num">{{f.answers[q.id].p}}</td><td class="num">{{f.answers[q.id].s}}</td>
          <td><span class="badge" :class="'z-'+H.zoneOf(f.answers[q.id].p,f.answers[q.id].s)">{{H.zoneLabel(H.zoneOf(f.answers[q.id].p,f.answers[q.id].s))}}</span></td></tr></tbody></table></div>
        <div class="card matrixbox" v-html="svg"></div>
      </div>

      <div class="stickybar">
        <button class="btn" v-if="step>0" @click="back">{{t('common.back')}}</button>
        <template v-if="step===1||step===2"><span class="small muted">{{t('dd.answered')}} {{step===1?countP:countS}}/{{qs.length}}</span><div class="progress"><i :style="{width: ((step===1?countP:countS)/qs.length*100)+'%'}"></i></div></template>
        <span class="grow"></span>
        <span v-if="tried && !canNext" class="small" style="color:var(--danger)">{{t('dd.missing')}}</span>
        <button v-if="step<4" class="btn primary" @click="next">{{t('common.next')}}</button>
        <button v-else class="btn primary" :disabled="busy" @click="submit">{{t('common.submit')}}</button>
      </div>
    </template></div>`
  };

  /* ---------- import Microsoft Forms results ---------- */
  C.ImportView = {
    data() { return { res: null, busy: false, fileName: '', done: false }; },
    computed: {
      counts() { const c = { new: 0, dup: 0, invalid: 0, forbidden: 0 }; (this.res ? this.res.rows : []).forEach(r => c[r.status]++); return c; },
      writable() { return this.res ? this.res.rows.filter(r => r.status === 'new' || r.status === 'dup') : []; },
      qs() { return HRDD_H.questions(); }
    },
    methods: {
      async pick(ev) {
        const file = ev.target.files[0]; if (!file) return;
        this.fileName = file.name; this.done = false; this.busy = true;
        try {
          const buf = await file.arrayBuffer();
          const existing = await S.store.getResponses(S.cycle);
          this.res = HRDD_FORMS.parse(buf, { cycle: S.cycle, questions: this.qs, units: S.cfg.org.units.filter(u => u.type !== 'group').map(u => u.id), session: S.session, existingIds: new Set(existing.map(r => r.id)) });
        } catch (e) { HRDD_H.toast(e.message || 'Error'); }
        this.busy = false; ev.target.value = '';
      },
      async commit() {
        this.busy = true;
        try { await S.store.upsertResponses(this.writable.map(r => r.resp)); this.done = true; HRDD_H.toast(HRDD_H.t('imp.done') + ' (' + this.writable.length + ')'); }
        catch (e) { HRDD_H.toast(e.message || 'Error'); }
        this.busy = false;
      },
      stLabel(s) { return { new: 'imp.new', dup: 'imp.dup', invalid: 'imp.invalid', forbidden: 'imp.notAllowed' }[s]; }
    },
    template: `<div class="card"><h2>{{t('imp.title')}}</h2><p class="muted">{{t('imp.hint')}}</p>
      <div v-if="!S.session" class="hint">{{t('imp.loginNeeded')}} <a href="#/login" @click="S.after='/import'">{{t('common.login')}}</a></div>
      <template v-else>
        <label class="btn primary" style="display:inline-block">{{t('imp.choose')}}<input type="file" accept=".xlsx,.xls,.csv" @change="pick" style="display:none"></label>
        <span class="muted" style="margin-left:10px">{{fileName}} · {{t('common.cycle')}} {{S.cycle}}</span>
        <div v-if="res">
          <p v-if="!res.mapping || !res.mapping.pairs.length" style="color:var(--danger)">{{t('imp.noCols')}}</p>
          <template v-else>
            <h3>{{t('imp.mapping')}}</h3>
            <div class="scroll"><table class="t small"><tbody><tr v-for="p in res.mapping.pairs" :key="p.q.id"><td><span class="qno">{{p.q.no}}</span>{{tx(p.q.short)}}</td><td class="muted">{{p.p}}</td><td class="muted">{{p.s}}</td></tr></tbody></table></div>
            <h3>{{t('imp.preview')}} · {{res.rows.length}} {{t('imp.rows')}}</h3>
            <div class="row small"><span class="badge t-3">{{t('imp.new')}} {{counts.new}}</span><span class="badge t-2">{{t('imp.dup')}} {{counts.dup}}</span><span class="badge t-0">{{t('imp.invalid')}} {{counts.invalid}}</span><span class="badge z-L">{{t('imp.notAllowed')}} {{counts.forbidden}}</span></div>
            <div class="scroll" style="margin-top:8px"><table class="t small"><thead><tr><th></th><th>{{t('common.region')}}</th><th>{{t('common.name')}}</th><th>{{t('common.email')}}</th><th v-for="q in qs" :key="q.id" class="num">{{q.no}} P/S</th></tr></thead>
              <tbody><tr v-for="r in res.rows" :key="r.resp.id"><td><span class="badge" :class="{new:'t-3',dup:'t-2',invalid:'t-0',forbidden:'z-L'}[r.status]">{{t(stLabel(r.status))}}</span></td>
              <td>{{r.resp.unit||'?'}}</td><td>{{r.resp.name}}</td><td class="muted">{{r.resp.email}}</td>
              <td v-for="q in qs" :key="q.id" class="num">{{r.resp.answers[q.id] ? (r.resp.answers[q.id].p||'?')+'/'+(r.resp.answers[q.id].s||'?') : ''}}</td></tr></tbody></table></div>
            <div class="row" style="margin-top:12px"><button class="btn primary" :disabled="busy||!writable.length||done" @click="commit">{{t('imp.commit')}} ({{writable.length}})</button>
              <span v-if="done" class="badge t-3">{{t('imp.done')}}</span></div>
          </template>
        </div>
      </template></div>`
  };
})();
