/* Risk-management views: Dashboard, Inventory, Action plan, Cross-region overview. */
(function () {
  const C = window.HRDD_C, H = window.HRDD_H, S = H.S, M = window.HRDD_MATRIX;
  const eff = window.HRDD_effective;
  const ZL = () => ({ H: H.zoneLabel('H'), M: H.zoneLabel('M'), L: H.zoneLabel('L') });

  async function loadData(cycle) {
    const [scores, full] = await Promise.all([S.store.getScores(cycle), S.store.getResponses(cycle)]);
    return { scores, full };
  }
  function rowsForUnit(data, unit) {
    // Identified rows when visible to this user, otherwise anonymised scores
    const full = data.full.filter(r => r.unit === unit);
    if (full.length) return full.map(r => ({ _id: r.id, name: r.group_label || r.name || r.email || r.id, email: r.email, answers: eff(r), weight: r.weight || 1, src: r }));
    return data.scores.filter(r => r.unit === unit).map((r, i) => ({ _id: unit + i, name: r.group_label || ('#' + (i + 1)), answers: r.answers, weight: r.weight || 1, src: r }));
  }
  function rbuRows(data) {
    const ids = H.regions().map(u => u.id);
    return data.scores.filter(r => ids.includes(r.unit) || r.unit === 'RBU_OTHER').map((r, i) => ({ _id: 'rbu' + i, answers: r.answers, weight: r.weight || 1, src: r }));
  }
  function scopeRows(data, scope) { return scope === 'RBU' ? rbuRows(data) : rowsForUnit(data, scope); }

  /* ---------------- Dashboard ---------------- */
  C.DashboardView = {
    data() {
      return { scope: H.isAdmin() ? 'RBU' : (S.session && S.session.unit) || 'RBU', stat: 'mean', compare: '', off: {}, focus: null, pick: null, data: null, loading: true };
    },
    created() { this.load(); },
    watch: { 'S.cycle'() { this.load(); }, scope() { this.off = {}; this.focus = null; this.pick = null; }, stat() { this.pick = null; } },
    computed: {
      qs() { return H.questions(); },
      scopes() { return H.allowedScopes(); },
      all() { return this.data ? scopeRows(this.data, this.scope) : []; },
      showList() { return this.scope !== 'RBU' && this.all.length > 0; },
      active() { return this.all.filter(r => !this.off[r._id]); },
      agg() { return M.aggregate(this.active, this.qs, this.stat); },
      items() {
        return this.qs.filter(q => this.agg[q.id]).map(q => {
          const a = this.agg[q.id], zone = H.zoneOf(a.p, a.s);
          return { q, no: q.no, id: q.id, p: a.p, s: a.s, score: a.score, n: a.n, zone, a, tip: `${q.no}. ${H.tx(q.short)}  P ${a.p.toFixed(2)} / S ${a.s.toFixed(2)}` };
        });
      },
      ranking() { return this.items.slice().sort((x, y) => y.score - x.score); },
      zoneCount() { const c = { H: 0, M: 0, L: 0 }; this.items.forEach(i => c[i.zone]++); return c; },
      cmpItems() {
        if (!this.compare || !this.data) return [];
        const agg = M.aggregate(scopeRows(this.data, this.compare), this.qs, this.stat);
        return this.qs.filter(q => agg[q.id]).map(q => ({ no: q.no, p: agg[q.id].p, s: agg[q.id].s }));
      },
      svg() {
        return M.renderSVG({ points: this.items, compare: this.cmpItems, zones: S.cfg.topic.zones, colors: S.cfg.topic.zoneColors, zoneLabels: ZL(), xLabel: H.t('dash.sev'), yLabel: H.t('dash.prob'), width: 640, highlight: this.focus });
      },
      invited() {
        const inv = (S.cfg.invitees || {})[S.cycle] || {};
        if (this.scope === 'RBU') return H.regions().reduce((t, u) => t + (+inv[u.id] || 0), 0);
        return +inv[this.scope] || 0;
      },
      isAggregate() { return this.all.some(r => r.src && r.src.source === 'aggregate'); },
      hasAdjusted() { return this.all.some(r => r.src && r.src.adjusted && Object.keys(r.src.adjusted).length); },
      focusItem() { return this.items.find(i => i.id === this.focus); },
      comments() {
        const out = [];
        this.active.forEach(r => {
          const s = r.src || {};
          if (s.item_comments) Object.keys(s.item_comments).forEach(k => { if (s.item_comments[k]) out.push({ q: k, who: r.name, text: s.item_comments[k] }); });
          if (s.comment) out.push({ q: null, who: r.name, text: s.comment });
        });
        return out;
      },
      focusComments() { return this.comments.filter(c => c.q === this.focus); }
    },
    methods: {
      async load() { this.loading = true; try { this.data = await loadData(S.cycle); } catch (e) { H.toast(e.message || 'Error'); } this.loading = false; },
      clickSvg(e) {
        const g = e.target.closest('.pt');
        if (!g) { this.pick = null; return; }
        if (g.dataset.qs) {
          const box = e.currentTarget.getBoundingClientRect(), r = g.getBoundingClientRect();
          this.pick = { qs: g.dataset.qs.split(','), left: r.right - box.left + 6, top: r.top - box.top };
          return;
        }
        this.pick = null; this.focus = this.focus === g.dataset.q ? null : g.dataset.q;
      },
      pickItems() { return this.pick ? this.items.filter(i => this.pick.qs.includes(i.id)) : []; },
      choose(id) { this.focus = id; this.pick = null; },
      only(id) { const o = {}; this.all.forEach(r => { if (r._id !== id) o[r._id] = true; }); this.off = o; },
      toggle(id) { this.off = Object.assign({}, this.off, { [id]: !this.off[id] }); },
      title() { return `${H.t('dash.matrix')} – ${H.unitName(this.scope)} ${S.cycle}`; },
      legend() { return this.items.map(i => ({ no: i.no, name: H.tx(i.q.short) })); },
      exportSvgString() {
        return M.renderSVG({ points: this.items, compare: this.cmpItems, zones: S.cfg.topic.zones, colors: S.cfg.topic.zoneColors, zoneLabels: ZL(), xLabel: H.t('dash.sev'), yLabel: H.t('dash.prob'), width: 760, title: this.title(), legend: this.legend(), clusterLabels: true });
      },
      fname(ext) { return `risk-matrix_${this.scope}_${S.cycle}_${H.stamp()}.${ext}`; },
      async png() { M.download(await M.svgToPng(this.exportSvgString(), 2), this.fname('png')); },
      svgFile() { M.download(new Blob([this.exportSvgString()], { type: 'image/svg+xml' }), this.fname('svg')); },
      async xlsx() {
        const blob = await M.matrixXlsx({
          title: this.title(), zones: S.cfg.topic.zones, colors: S.cfg.topic.zoneColors, zoneLabels: ZL(), xLabel: H.t('dash.sev'), yLabel: H.t('dash.prob'),
          headers: ['#', H.t('dash.item'), H.t('adm.category'), H.t('dash.prob'), H.t('dash.sev'), H.t('dash.score'), H.t('dash.zone'), 'n'],
          items: this.items.map(i => ({ no: i.no, name: H.tx(i.q.short), cat: H.tx(i.q.cat), p: i.p, s: i.s, score: i.score, zone: i.zone, zoneLabel: H.zoneLabel(i.zone), n: i.n }))
        });
        M.download(blob, this.fname('xlsx'));
      },
      qShort(id) { const q = this.qs.find(x => x.id === id); return q ? q.no + '. ' + H.tx(q.short) : ''; }
    },
    template: `<div>
      <div class="card"><div class="row">
        <span class="muted">{{t('dash.scope')}}</span>
        <div class="chips"><button v-for="s in scopes" :key="s" class="chip" :class="{on:scope===s}" @click="scope=s">{{H.unitName(s)}}</button></div>
        <span class="grow"></span>
        <label class="small muted">{{t('dash.stat')}}</label>
        <select class="input" style="width:auto" v-model="stat"><option value="mean">{{t('dash.mean')}}</option><option value="median">{{t('dash.median')}}</option><option value="max">{{t('dash.max')}}</option></select>
        <label class="small muted">{{t('dash.compare')}}</label>
        <select class="input" style="width:auto" v-model="compare"><option value="">{{t('common.none')}}</option><option v-for="s in scopes.filter(x=>x!==scope)" :key="s" :value="s">{{H.unitName(s)}}</option></select>
      </div></div>

      <div v-if="loading" class="card empty">{{t('common.loading')}}</div>
      <div v-else-if="!all.length" class="card empty">{{t('dash.noData')}}</div>
      <template v-else>
        <div class="kpis">
          <div class="kpi"><div class="l">{{t('dash.responses')}}</div><div class="v">{{active.length}}<span v-if="active.length!==all.length" class="muted small"> / {{all.length}}</span></div>
            <div class="l" v-if="invited && !isAggregate">{{t('dash.rate')}} {{Math.round(all.length/invited*100)}}% ({{all.length}}/{{invited}})</div>
            <div class="l" v-if="isAggregate">{{t('dash.reused')}}</div></div>
          <div class="kpi"><div class="l">{{t('dash.zone')}}</div><div class="zonecount"><span class="badge z-H">{{zoneLabel('H')}} {{zoneCount.H}}</span></div><div class="zonecount"><span class="badge z-M">{{zoneLabel('M')}} {{zoneCount.M}}</span><span class="badge z-L">{{zoneLabel('L')}} {{zoneCount.L}}</span></div></div>
          <div class="kpi" style="grid-column: span 2"><div class="l">{{t('dash.top3')}}</div>
            <div v-for="(r,i) in ranking.slice(0,3)" :key="r.id" class="row" style="gap:6px;margin-top:4px;cursor:pointer" @click="focus=r.id"><span class="qno">{{r.no}}</span><span class="grow">{{tx(r.q.short)}}</span><span class="badge" :class="'z-'+r.zone">{{H.fmt(r.score)}}</span></div></div>
        </div>

        <div class="grid2">
          <div class="card">
            <div class="row"><h2 class="grow" style="margin:0">{{t('dash.matrix')}} · {{H.unitName(scope)}}</h2>
              <span v-if="hasAdjusted" class="badge t-2">{{t('dash.adjusted')}}</span></div>
            <div style="position:relative;margin-top:8px"><div class="matrixbox" v-html="svg" @click="clickSvg"></div>
              <div v-if="pick" class="pickpop" :style="{left: Math.min(pick.left, 420)+'px', top: pick.top+'px'}"><div class="small muted" style="margin-bottom:4px">{{t('dash.sameCoord')}} (P {{H.fmt(pickItems()[0] && pickItems()[0].p)}} / S {{H.fmt(pickItems()[0] && pickItems()[0].s)}})</div>
                <div v-for="i in pickItems()" :key="i.id" class="pickrow" @click="choose(i.id)"><span class="qno">{{i.no}}</span>{{tx(i.q.short)}}</div></div></div>
            <div class="legend"><div v-for="i in items" :key="i.id" @click="focus=i.id"><span class="qno">{{i.no}}</span>{{tx(i.q.short)}}</div></div>
            <div class="row" style="margin-top:12px"><button class="btn sm" @click="xlsx">⬇ {{t('dash.exportXlsx')}}</button><button class="btn sm" @click="png">⬇ {{t('dash.exportPng')}}</button><button class="btn sm" @click="svgFile">⬇ {{t('dash.exportSvg')}}</button></div>
          </div>

          <div class="side">
            <div v-if="showList" class="card"><div class="row"><h2 class="grow" style="margin:0">{{ scope==='MHQ' ? t('dash.groups') : t('dash.respondents') }} ({{all.length}})</h2><button class="btn sm" @click="off={}">{{t('dash.selectAll')}}</button></div>
              <div class="resp-list" style="margin-top:8px"><label v-for="r in all" :key="r._id"><input type="checkbox" :checked="!off[r._id]" @change="toggle(r._id)"><span class="grow">{{r.name}}<span v-if="r.src && r.src.adjusted" class="tag h" style="margin-left:4px">adj</span></span><button class="btn sm" @click.prevent="only(r._id)">{{t('dash.only')}}</button></label></div></div>

            <div v-if="focusItem" class="card"><div class="row"><h2 class="grow" style="margin:0"><span class="qno">{{focusItem.no}}</span>{{tx(focusItem.q.short)}}</h2><button class="btn sm" @click="focus=null">✕</button></div>
              <p class="small">{{tx(focusItem.q.text)}}</p>
              <div class="row"><span>P <b>{{H.fmt(focusItem.p)}}</b></span><span>S <b>{{H.fmt(focusItem.s)}}</b></span><span>P×S <b>{{H.fmt(focusItem.score)}}</b></span><span class="badge" :class="'z-'+focusItem.zone">{{zoneLabel(focusItem.zone)}}</span>
                <span v-if="focusItem.a.sdP>=1||focusItem.a.sdS>=1" class="badge t-1">{{t('dash.spread')}}</span></div>
              <div class="grid2" style="margin-top:12px" v-if="!isAggregate">
                <div v-for="w in ['p','s']" :key="w"><div class="small muted">{{w==='p'?t('dash.prob'):t('dash.sev')}} · {{t('dash.distribution')}}</div>
                  <div class="bars" style="margin-top:18px"><div v-for="(c,i) in focusItem.a.dist[w]" :key="i" :style="{height: (c/Math.max(1,...focusItem.a.dist[w])*100)+'%'}"><span>{{c}}</span></div></div>
                  <div class="bars-x"><span v-for="i in 5" :key="i">{{i}}</span></div></div></div>
              <div v-for="(c,i) in focusComments" :key="i" class="comment small"><b>{{c.who}}</b>：{{c.text}}</div>
            </div>

            <div class="card"><h2>{{t('dash.ranking')}}</h2>
              <table class="t"><thead><tr><th>#</th><th>{{t('dash.item')}}</th><th class="num">P</th><th class="num">S</th><th class="num">P×S</th></tr></thead>
                <tbody><tr v-for="r in ranking" :key="r.id" class="click" @click="focus=r.id"><td><span class="qno">{{r.no}}</span></td><td>{{tx(r.q.short)}}</td><td class="num">{{H.fmt(r.p)}}</td><td class="num">{{H.fmt(r.s)}}</td><td class="num"><span class="badge" :class="'z-'+r.zone">{{H.fmt(r.score)}}</span></td></tr></tbody></table></div>
          </div>
        </div>

        <div class="card" v-if="comments.length"><h2>{{t('dash.comments')}}</h2>
          <div v-for="(c,i) in comments" :key="i" class="comment"><span class="muted small">{{ c.q ? qShort(c.q) : t('dd.step.comment') }} · {{c.who}}</span><div>{{c.text}}</div></div></div>
      </template></div>`
  };

  /* ---------------- shared inventory logic ---------------- */
  const InvMixin = {
    data() { return { unit: '', inv: null, data: null, loading: true, savedAt: '', saveTimer: null }; },
    created() {
      const opts = this.unitOptions;
      this.unit = (S.session && S.session.unit && opts.includes(S.session.unit)) ? S.session.unit : opts[0];
      this.load();
    },
    watch: { unit() { this.load(); }, 'S.cycle'() { this.load(); } },
    computed: {
      unitOptions() { return H.isAdmin() ? H.regions().map(u => u.id).concat(['MHQ']) : (S.session && S.session.unit ? [S.session.unit] : []); },
      qs() { return H.questions(); },
      agg() { return this.data ? M.aggregate(rowsForUnit(this.data, this.unit), this.qs, 'mean') : {}; },
      sum() { return H.unitSummary(this.agg, this.inv); },
      dims() { return S.cfg.topic.dims; }
    },
    methods: {
      async load() {
        if (!this.unit) { this.loading = false; return; }
        this.loading = true;
        try { const [d, inv] = await Promise.all([loadData(S.cycle), S.store.getInventory(this.unit, S.cycle)]); this.data = d; this.inv = Object.assign({ items: {}, custom: [] }, inv); }
        catch (e) { H.toast(e.message || 'Error'); }
        this.loading = false;
      },
      item(rec) { if (!this.inv.items[rec.id]) this.inv.items[rec.id] = {}; return this.inv.items[rec.id]; },
      itm(rec) { return (this.inv && this.inv.items[rec.id]) || {}; },
      status(rec) { return H.recStatus(this.inv, rec); },
      setField(rec, k, v) { this.item(rec)[k] = v; this.queue(); },
      queue() {
        clearTimeout(this.saveTimer);
        this.saveTimer = setTimeout(async () => {
          try { await S.store.saveInventory(this.unit, S.cycle, H.clone(this.inv)); this.savedAt = new Date().toLocaleTimeString(); }
          catch (e) { H.toast(e.message || 'Error'); }
        }, 700);
      },
      statusOptions(rec) {
        const base = ['none', 'done', 'partial', 'plan', 'na'];
        return rec.level === 'G' ? ['group'].concat(base) : base;
      },
      planned() {
        const out = [];
        this.sum.issues.forEach(is => {
          this.dims.forEach(d => {
            H.recsFor(is.q, d.id, is.zone).forEach(r => { if (this.status(r) === 'plan') out.push({ is, d, rec: r, text: H.tx(r.text), ref: this.itm(r) }); });
            (this.inv.custom || []).filter(c => c.q === is.q.id && c.dim === d.id && c.status === 'plan').forEach(c => out.push({ is, d, custom: c, text: c.text, ref: c }));
          });
        });
        return out;
      },
      async exportRows(kind) {
        const st = s => H.t('rm.st.' + s);
        const head = ['#', H.t('dash.item'), H.t('dash.zone'), H.t('adm.dim'), H.t('adm.level'), H.t('adm.text'), H.t('rm.urgency'), H.t('rm.owner'), H.t('rm.due'), H.t('rm.progress'), H.t('rm.note')];
        const rows = [head.map(h => ({ v: h, bold: true, fill: '#1F6F69', color: '#FFFFFF' }))];
        const lvl = l => ({ G: H.t('rm.groupTag'), M: H.zoneLabel('M'), H: H.t('rm.urgentTag'), L: H.zoneLabel('L'), C: H.t('rm.customTag') })[l];
        if (kind === 'actions') {
          this.planned().forEach(p => rows.push([p.is.q.no, H.tx(p.is.q.short), H.zoneLabel(p.is.zone), H.tx(p.d.name), lvl(p.custom ? 'C' : p.rec.level), p.text, st('plan'), p.ref.owner || '', p.ref.due || '', H.t('rm.pr.' + (p.ref.progress || 'todo')), p.ref.note || '']));
        } else {
          this.sum.issues.forEach(is => this.dims.forEach(d => {
            H.recsFor(is.q, d.id, is.zone).forEach(r => { const it = this.inv.items[r.id] || {}; rows.push([is.q.no, H.tx(is.q.short), { v: H.zoneLabel(is.zone), fill: S.cfg.topic.zoneColors[is.zone] }, H.tx(d.name), lvl(r.level), { v: H.tx(r.text), wrap: true }, st(this.status(r)), it.owner || '', it.due || '', it.progress ? H.t('rm.pr.' + it.progress) : '', it.note || '']); });
            (this.inv.custom || []).filter(c => c.q === is.q.id && c.dim === d.id).forEach(c => rows.push([is.q.no, H.tx(is.q.short), H.zoneLabel(is.zone), H.tx(d.name), lvl('C'), { v: c.text, wrap: true }, st(c.status || 'none'), c.owner || '', c.due || '', c.progress ? H.t('rm.pr.' + c.progress) : '', c.note || '']));
          }));
        }
        const blob = await XLSXW.build({ sheets: [{ name: kind === 'actions' ? 'Action plan' : 'Inventory', cols: [5, 22, 12, 18, 14, 60, 12, 14, 12, 10, 30], rows }] });
        M.download(blob, `${kind}_${this.unit}_${S.cycle}_${H.stamp()}.xlsx`);
      }
    }
  };

  /* ---------------- Inventory & recommendations ---------------- */
  C.InventoryView = {
    mixins: [InvMixin],
    data() { return { openLow: {} }; },
    methods: {
      addCustom(q, dim) { this.inv.custom.push({ id: 'c' + Date.now(), q: q.id, dim, text: '', status: 'plan' }); this.queue(); },
      delCustom(c) { this.inv.custom = this.inv.custom.filter(x => x !== c); this.queue(); },
      customs(q, dim) { return (this.inv.custom || []).filter(c => c.q === q.id && c.dim === dim); },
      meterColor(u) { return ['var(--danger)', 'var(--warn)', '#F4D03F', 'var(--ok)'][H.tierOf(u)]; }
    },
    template: `<div>
      <div class="card"><div class="row"><span class="muted">{{t('rm.chooseRegion')}}</span>
        <div class="chips"><button v-for="u in unitOptions" :key="u" class="chip" :class="{on:unit===u}" @click="unit=u">{{H.unitName(u)}}</button></div>
        <span class="grow"></span><span v-if="savedAt" class="small muted">{{t('common.saved')}} {{savedAt}}</span>
        <button class="btn sm" v-if="inv" @click="exportRows('inventory')">⬇ {{t('rm.exportInv')}}</button></div></div>
      <div v-if="!unitOptions.length" class="card empty">{{t('common.noAccess')}}</div>
      <div v-else-if="loading" class="card empty">{{t('common.loading')}}</div>
      <div v-else-if="!sum.issues.length" class="card empty">{{t('rm.noSurvey')}}</div>
      <template v-else>
        <div class="kpis">
          <div class="kpi"><div class="l">{{t('rm.urgency')}}</div><div class="v">{{Math.round(sum.index)}}</div><span class="badge" :class="'t-'+sum.tier">{{t('rm.tier.'+sum.tier)}}</span></div>
          <div class="kpi"><div class="l">{{t('rm.coverage')}}</div><div class="v">{{Math.round(sum.cov*100)}}%</div></div>
          <div class="kpi"><div class="l">{{t('rm.issuesAttention')}}</div><div class="v">{{sum.att.length}}<span class="muted small"> / {{sum.issues.length}}</span></div></div>
          <div class="kpi"><div class="l">{{t('rm.gaps')}} / {{t('rm.planned')}}</div><div class="v">{{sum.gaps}} / {{sum.planned}}</div></div>
        </div>
        <p class="small muted" style="margin-top:-6px">{{t('rm.formula')}}</p>
        <div v-if="!sum.att.length" class="ok-banner" style="margin-bottom:16px">🎉 {{t('rm.allLow')}}</div>

        <div v-for="is in sum.issues" :key="is.q.id" class="issue">
          <div class="issue-h"><span class="qno">{{is.q.no}}</span><h3>{{tx(is.q.short)}} <span class="muted small" style="font-weight:400">{{tx(is.q.cat)}}</span></h3>
            <span class="small">P {{H.fmt(is.a.p)}} · S {{H.fmt(is.a.s)}}</span><span class="badge" :class="'z-'+is.zone">{{zoneLabel(is.zone)}}</span>
            <template v-if="is.zone!=='L'"><span class="meter"><i :style="{width:Math.min(100,is.urg)+'%', background: meterColor(is.urg)}"></i></span><span class="badge" :class="'t-'+H.tierOf(is.urg)">{{t('rm.tier.'+H.tierOf(is.urg))}} {{Math.round(is.urg)}}</span></template>
            <button v-else class="btn sm" @click="openLow[is.q.id]=!openLow[is.q.id]">{{ openLow[is.q.id] ? '▲' : '▼' }}</button>
          </div>
          <div v-if="is.zone==='L'" class="lowcard"><b>👍 {{t('rm.lowTitle')}}</b> <span class="small">{{t('rm.lowMsg')}}</span>
            <ul v-if="openLow[is.q.id]" class="small"><template v-for="d in dims" :key="d.id"><li v-for="r in H.recsFor(is.q,d.id,'L')" :key="r.id"><span v-if="r.level==='G'" class="tag g">{{t('rm.groupTag')}}</span>{{tx(r.text)}}</li></template></ul></div>
          <div v-else class="dims">
            <div v-for="d in dims" :key="d.id" class="dim"><h4>{{tx(d.name)}}</h4>
              <div v-for="r in H.recsFor(is.q,d.id,is.zone)" :key="r.id" class="rec" :class="'st-'+status(r)">
                <div class="txt"><span v-if="r.level==='G'" class="tag g">{{t('rm.groupTag')}}</span><span v-if="r.level==='H'" class="tag h">{{t('rm.urgentTag')}}</span>{{tx(r.text)}} <span v-if="r.ref" class="muted small">({{r.ref}})</span></div>
                <select :value="status(r)" @change="setField(r,'status',$event.target.value)"><option v-for="o in statusOptions(r)" :key="o" :value="o">{{t('rm.st.'+o)}}</option></select>
                <div v-if="status(r)==='plan'" class="more"><input class="input" :placeholder="t('rm.owner')" :value="itm(r).owner" @input="setField(r,'owner',$event.target.value)"><input class="input" type="date" :value="itm(r).due" @input="setField(r,'due',$event.target.value)"></div>
                <div v-if="status(r)!=='none' && status(r)!=='group'" class="more" style="grid-template-columns:1fr"><input class="input" :placeholder="t('rm.note')" :value="itm(r).note" @input="setField(r,'note',$event.target.value)"></div>
              </div>
              <div v-for="c in customs(is.q,d.id)" :key="c.id" class="rec" :class="'st-'+c.status">
                <span class="tag c">{{t('rm.customTag')}}</span>
                <textarea class="input" rows="2" v-model="c.text" @input="queue" :placeholder="t('rm.customPlaceholder')"></textarea>
                <div class="row"><select v-model="c.status" @change="queue"><option v-for="o in ['none','done','partial','plan']" :key="o" :value="o">{{t('rm.st.'+o)}}</option></select><span class="grow"></span><button class="btn sm danger" @click="delCustom(c)">{{t('common.delete')}}</button></div>
                <div v-if="c.status==='plan'" class="more"><input class="input" :placeholder="t('rm.owner')" v-model="c.owner" @input="queue"><input class="input" type="date" v-model="c.due" @input="queue"></div>
              </div>
              <button class="btn sm" style="margin-top:8px" @click="addCustom(is.q,d.id)">＋ {{t('rm.addCustom')}}</button>
            </div>
          </div>
        </div>
      </template></div>`
  };

  /* ---------------- Action plan ---------------- */
  C.ActionsView = {
    mixins: [InvMixin],
    methods: {
      upd(p, k, v) { if (p.custom) { p.custom[k] = v; this.queue(); } else this.setField(p.rec, k, v); }
    },
    template: `<div>
      <div class="card"><div class="row"><span class="muted">{{t('rm.chooseRegion')}}</span>
        <div class="chips"><button v-for="u in unitOptions" :key="u" class="chip" :class="{on:unit===u}" @click="unit=u">{{H.unitName(u)}}</button></div>
        <span class="grow"></span><span v-if="savedAt" class="small muted">{{t('common.saved')}} {{savedAt}}</span>
        <button class="btn sm" v-if="inv" @click="exportRows('actions')">⬇ {{t('rm.exportActions')}}</button></div></div>
      <div v-if="loading" class="card empty">{{t('common.loading')}}</div>
      <div v-else class="card"><h2>{{t('nav.actions')}} · {{H.unitName(unit)}}</h2>
        <div v-if="!planned().length" class="empty">{{t('rm.noActions')}}</div>
        <div v-else class="scroll"><table class="t"><thead><tr><th>{{t('dash.item')}}</th><th>{{t('adm.dim')}}</th><th style="width:38%">{{t('adm.text')}}</th><th>{{t('rm.owner')}}</th><th>{{t('rm.due')}}</th><th>{{t('rm.progress')}}</th></tr></thead>
          <tbody><tr v-for="(p,i) in planned()" :key="i">
            <td><span class="qno">{{p.is.q.no}}</span>{{tx(p.is.q.short)}} <span class="badge" :class="'z-'+p.is.zone">{{zoneLabel(p.is.zone)}}</span></td>
            <td class="small">{{tx(p.d.name)}}</td>
            <td class="small"><span v-if="p.custom" class="tag c">{{t('rm.customTag')}}</span><span v-else-if="p.rec.level==='H'" class="tag h">{{t('rm.urgentTag')}}</span>{{p.text}}</td>
            <td><input class="input" :value="p.ref.owner" @input="upd(p,'owner',$event.target.value)"></td>
            <td><input class="input" type="date" :value="p.ref.due" @input="upd(p,'due',$event.target.value)"></td>
            <td><select class="input" :value="p.ref.progress||'todo'" @change="upd(p,'progress',$event.target.value)"><option v-for="o in ['todo','doing','done']" :key="o" :value="o">{{t('rm.pr.'+o)}}</option></select></td>
          </tr></tbody></table></div></div></div>`
  };

  /* ---------------- Cross-region overview (admin) ---------------- */
  C.OverviewView = {
    data() { return { data: null, invs: {}, loading: true }; },
    created() { this.load(); },
    watch: { 'S.cycle'() { this.load(); } },
    computed: {
      qs() { return H.questions(); },
      rows() {
        if (!this.data) return [];
        return H.regions().map(u => {
          const agg = M.aggregate(rowsForUnit(this.data, u.id), this.qs, 'mean');
          const inv = this.invs[u.id] || { items: {}, custom: [] };
          const sum = H.unitSummary(agg, inv);
          const by = {}; sum.issues.forEach(i => { by[i.q.id] = i; });
          return { u, sum, by, n: rowsForUnit(this.data, u.id).length, updated: inv.updated_at };
        });
      }
    },
    methods: {
      async load() {
        this.loading = true;
        try { const [d, invs] = await Promise.all([loadData(S.cycle), S.store.listInventories(S.cycle)]); this.data = d; this.invs = invs; } catch (e) { H.toast(e.message || 'Error'); }
        this.loading = false;
      },
      open(u) { H.go('/inventory'); }
    },
    template: `<div class="card"><h2>{{t('nav.overview')}} · {{S.cycle}}</h2>
      <div v-if="loading" class="empty">{{t('common.loading')}}</div>
      <div v-else class="scroll"><table class="t heat"><thead><tr><th style="text-align:left">{{t('common.region')}}</th><th>n</th>
        <th v-for="q in qs" :key="q.id" :title="tx(q.short)"><span class="qno">{{q.no}}</span></th>
        <th>{{t('rm.coverage')}}</th><th>{{t('rm.planned')}}</th><th>{{t('rm.urgency')}}</th><th>{{t('common.updated')}}</th></tr></thead>
        <tbody><tr v-for="r in rows" :key="r.u.id"><td style="text-align:left"><b>{{H.unitName(r.u.id)}}</b></td><td>{{r.n}}</td>
          <td v-for="q in qs" :key="q.id" class="cell"><template v-if="r.by[q.id]"><span class="badge" :class="'z-'+r.by[q.id].zone" :title="tx(q.short)">{{ r.by[q.id].zone==='L' ? '–' : Math.round(r.by[q.id].urg) }}</span></template></td>
          <td>{{r.sum.att.length ? Math.round(r.sum.cov*100)+'%' : '–'}}</td><td>{{r.sum.planned}}</td>
          <td><span class="badge" :class="'t-'+r.sum.tier">{{t('rm.tier.'+r.sum.tier)}} {{Math.round(r.sum.index)}}</span></td>
          <td class="small muted">{{r.updated ? r.updated.slice(0,10) : '–'}}</td></tr></tbody></table>
        <p class="small muted">{{t('rm.formula')}}</p></div></div>`
  };
})();
