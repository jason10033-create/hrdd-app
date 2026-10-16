/* Root component, hash routing and boot. */
(function () {
  const { createApp, markRaw } = Vue;
  const H = window.HRDD_H, S = H.S, C = window.HRDD_C;

  const Root = {
    data() { return { LANGS: H.LANGS }; },
    computed: {
      parts() { return S.route.split('/').filter(Boolean); },
      sec() { const p = this.parts[0]; return p === 'admin' ? 'admin' : ['dashboard', 'inventory', 'actions', 'overview'].includes(p) ? 'rm' : p === 'login' ? 'login' : 'dd'; },
      page() { return this.parts[0] || 'survey'; },
      needLogin() { return ['rm', 'admin'].includes(this.sec) && !S.session; },
      forbidden() { return (this.sec === 'admin' || this.page === 'overview') && !H.isAdmin(); },
      sub() {
        if (this.sec === 'dd') return [['survey', 'nav.survey'], ['import', 'nav.import']];
        if (this.sec === 'rm') return [['dashboard', 'nav.dashboard'], ['inventory', 'nav.inventory'], ['actions', 'nav.actions']].concat(H.isAdmin() ? [['overview', 'nav.overview']] : []);
        return [];
      },
      view() {
        return { survey: 'survey-view', import: 'import-view', dashboard: 'dashboard-view', inventory: 'inventory-view', actions: 'actions-view', overview: 'overview-view', login: 'login-view' }[this.page] || 'survey-view';
      }
    },
    methods: {
      setLang(l) { S.lang = l; try { localStorage.setItem('hrdd_lang', l); } catch (e) {} document.documentElement.lang = { tc: 'zh-Hant', sc: 'zh-Hans', en: 'en' }[l]; },
      async logout() { await S.store.logout(); S.session = null; H.go('/survey'); }
    },
    watch: { needLogin: { immediate: true, handler(v) { if (v) S.after = S.route; } } },
    template: `
    <header class="top"><div class="top-in">
      <div class="brand">{{t('app.title')}}<small>{{t('app.subtitle')}}</small></div>
      <nav class="mainnav">
        <a :class="{on:sec==='dd'}" href="#/survey">{{t('nav.dd')}}</a>
        <a :class="{on:sec==='rm'}" href="#/dashboard">{{t('nav.rm')}}</a>
        <a v-if="H.isAdmin()" :class="{on:sec==='admin'}" href="#/admin/survey">{{t('nav.admin')}}</a>
      </nav>
      <div class="tools">
        <select v-if="S.cfg.cycles.length>1" v-model="S.cycle" :title="t('common.cycle')"><option v-for="c in S.cfg.cycles" :key="c.id" :value="c.id">{{c.name}}</option></select>
        <div class="langs"><button v-for="l in LANGS" :key="l.id" :class="{on:S.lang===l.id}" @click="setLang(l.id)">{{l.label}}</button></div>
        <template v-if="S.session"><span class="small">{{ S.session.role==='admin' ? t('common.admin') : H.unitName(S.session.unit) }}</span><button @click="logout">{{t('common.logout')}}</button></template>
        <button v-else @click="S.after=S.route; H.go('/login')">{{t('common.login')}}</button>
      </div></div></header>
    <div v-if="S.mode==='demo'" class="demo">{{t('common.demoMode')}}</div>
    <div v-if="sub.length" class="subnav"><div class="subnav-in"><a v-for="s in sub" :key="s[0]" :href="'#/'+s[0]" :class="{on:page===s[0]}">{{t(s[1])}}</a></div></div>
    <main :key="S.cycle + '|' + (S.session ? S.session.label : '')">
      <login-view v-if="needLogin || page==='login'" :unit="page==='login' ? parts[1] : null"></login-view>
      <div v-else-if="forbidden" class="card empty">{{t('common.noAccess')}}</div>
      <admin-view v-else-if="sec==='admin'" :tab="parts[1] || 'survey'"></admin-view>
      <component v-else :is="view"></component>
    </main>
    <div v-if="S.toast" class="toast">{{S.toast}}</div>`
  };

  async function boot() {
    const store = H.S.store = markRaw(window.HRDD_createStore());
    S.mode = store.mode;
    try { S.cfg = await store.init(); }
    catch (e) { document.getElementById('app').innerHTML = '<div class="boot">Failed to load: ' + (e.message || e) + '</div>'; return; }
    S.session = store.getSession();
    let lang = null; try { lang = localStorage.getItem('hrdd_lang'); } catch (e) {}
    if (!lang) { const n = (navigator.language || '').toLowerCase(); lang = n.startsWith('zh') ? (/cn|sg|hans/.test(n) ? 'sc' : 'tc') : 'en'; }
    S.lang = lang;
    const act = S.cfg.cycles.find(c => c.active) || S.cfg.cycles[S.cfg.cycles.length - 1];
    S.cycle = act ? act.id : null;
    const sync = () => { S.route = (location.hash || '#/survey').slice(1); };
    window.addEventListener('hashchange', sync); sync();

    const app = createApp(Root);
    Object.assign(app.config.globalProperties, { t: H.t, tx: H.tx, S, H, zoneLabel: H.zoneLabel });
    const kebab = s => s.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
    Object.keys(C).forEach(k => app.component(kebab(k), C[k]));
    app.config.errorHandler = (err) => { console.error(err); H.toast(String(err.message || err)); };
    app.mount('#app');
  }
  boot();
})();
