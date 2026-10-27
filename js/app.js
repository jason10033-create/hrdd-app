/* Root component, hash routing and boot. */
(function () {
  const { createApp, markRaw } = Vue;
  const H = window.HRDD_H, S = H.S, C = window.HRDD_C;

  const Root = {
    data() { return { LANGS: H.LANGS }; },
    computed: {
      parts() { return S.route.split('/').filter(Boolean); },
      sec() { const p = this.parts[0] || 'home'; return p === 'home' ? 'home' : p === 'admin' ? 'admin' : ['dashboard', 'inventory', 'actions', 'overview'].includes(p) ? 'rm' : p === 'login' ? 'login' : 'dd'; },
      page() { return this.parts[0] || 'home'; },
      needLogin() { return ['rm', 'admin'].includes(this.sec) && !S.session; },
      forbidden() { return (this.sec === 'admin' || this.page === 'overview') && !H.isAdmin(); },
      sub() {
        if (this.sec === 'dd') return [['survey', 'nav.survey'], ['import', 'nav.import']];
        if (this.sec === 'rm') return [['dashboard', 'nav.dashboard'], ['inventory', 'nav.inventory'], ['actions', 'nav.actions']].concat(H.isAdmin() ? [['overview', 'nav.overview']] : []);
        return [];
      },
      view() {
        return { home: 'home-view', survey: 'survey-view', import: 'import-view', dashboard: 'dashboard-view', inventory: 'inventory-view', actions: 'actions-view', overview: 'overview-view', login: 'login-view' }[this.page] || 'survey-view';
      }
    },
    methods: {
      setLang(l) { S.lang = l; try { localStorage.setItem('hrdd_lang', l); } catch (e) {} document.documentElement.lang = { tc: 'zh-Hant', sc: 'zh-Hans', en: 'en' }[l]; },
      toggleTheme() { S.theme = S.theme === 'dark' ? 'light' : 'dark'; document.documentElement.dataset.theme = S.theme; try { localStorage.setItem('hrdd_theme', S.theme); } catch (e) {} },
      async logout() { await S.store.logout(); S.session = null; H.go('/home'); }
    },
    watch: { needLogin: { immediate: true, handler(v) { if (v) S.after = S.route; } } },
    template: `
    <header class="top"><div class="top-in">
      <a class="brand" href="#/home">{{t('app.title')}}<small>{{t('app.subtitle')}}</small></a>
      <nav class="mainnav">
        <a :class="{on:sec==='dd'}" href="#/survey">{{t('nav.dd')}}</a>
        <a :class="{on:sec==='rm'}" href="#/dashboard">{{t('nav.rm')}}</a>
        <a v-if="H.isAdmin()" :class="{on:sec==='admin'}" href="#/admin/survey">{{t('nav.admin')}}</a>
      </nav>
      <div class="tools">
        <select v-if="S.cfg.cycles.length>1" v-model="S.cycle" :title="t('common.cycle')"><option v-for="c in S.cfg.cycles" :key="c.id" :value="c.id">{{c.name}}</option></select>
        <button class="theme-btn" @click="toggleTheme" :title="S.theme==='dark' ? t('common.themeLight') : t('common.themeDark')" :aria-label="S.theme==='dark' ? t('common.themeLight') : t('common.themeDark')">{{ S.theme==='dark' ? '☀️' : '🌙' }}</button>
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
    catch (e) {
      // Usually the free Supabase project has been paused after a week without traffic.
      document.getElementById('app').innerHTML = '<div class="card login" style="margin-top:60px"><h2>無法連線到資料庫 / Cannot reach the database</h2>' +
        '<p>資料庫暫時無法連線，可能是 Supabase 專案已自動暫停。請通知系統管理者到 Supabase 後台恢復專案（Restore project）。</p>' +
        '<p>The database is unreachable – the Supabase project may have been paused. Please ask the administrator to restore it.</p>' +
        '<p class="muted small">' + String(e.message || e).replace(/</g, '&lt;') + '</p></div>';
      return;
    }
    S.session = store.getSession();
    let lang = null; try { lang = localStorage.getItem('hrdd_lang'); } catch (e) {}
    if (!lang) { const n = (navigator.language || '').toLowerCase(); lang = n.startsWith('zh') ? (/cn|sg|hans/.test(n) ? 'sc' : 'tc') : 'en'; }
    S.lang = lang;
    let theme = null; try { theme = localStorage.getItem('hrdd_theme'); } catch (e) {}
    if (!theme) theme = window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    S.theme = theme; document.documentElement.dataset.theme = theme;
    const act = S.cfg.cycles.find(c => c.active) || S.cfg.cycles[S.cfg.cycles.length - 1];
    S.cycle = act ? act.id : null;
    const sync = () => { S.route = (location.hash || '#/home').slice(1); };
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
