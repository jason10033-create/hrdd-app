/* Landing page. Section order / visibility / size and all texts come from config "home"
 * (edited in 後台 › 首頁設計); texts fall back to the home.* keys in i18n.js. */
(function () {
  const C = window.HRDD_C, H = window.HRDD_H, S = H.S;

  const HOME_DEFAULT = {
    sections: [
      { id: 'hero', show: true, size: 100 },
      { id: 'loop', show: true, size: 100 },
      { id: 'banners', show: true, size: 100 }
    ],
    texts: {}
  };
  // text keys editable per section (order = order shown in the designer)
  const HOME_TEXT_KEYS = {
    hero: ['home.eyebrow', 'home.title', 'home.lead', 'home.cycleOpen', 'home.cycleClosed'],
    loop: ['home.loop', 'home.step1', 'home.step1d', 'home.step2', 'home.step2d', 'home.step3', 'home.step3d', 'home.step4', 'home.step4d', 'home.ref'],
    banners: ['home.ddTitle', 'home.rmTitle', 'home.rmLock']
  };

  // Static 5x5 heat matrix; unnumbered dots drift (dashed arrows) from high-risk toward low-risk cells.
  function heroMatrix() {
    const n = 5, c = 46, gap = 4, o = 30, size = n * (c + gap);
    const heat = v => v >= 6 ? '#E4572E' : v >= 5 ? '#F08A4B' : v >= 3 ? '#F4C542' : v >= 2 ? '#8FD0C3' : '#5FB8A9';
    let g = `<svg viewBox="0 0 ${size + o + 20} ${size + o + 10}" xmlns="http://www.w3.org/2000/svg" class="hero-svg" aria-hidden="true">`;
    g += '<defs><marker id="arw" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="#ffffff"/></marker></defs>';
    for (let r = 0; r < n; r++) for (let k = 0; k < n; k++) {
      const v = (n - 1 - r) + k;
      g += `<rect x="${o + k * (c + gap)}" y="${r * (c + gap)}" width="${c}" height="${c}" rx="6" fill="${heat(v)}" opacity="${(0.55 + 0.045 * v).toFixed(2)}"/>`;
    }
    g += `<text x="10" y="${size / 2}" transform="rotate(-90 10 ${size / 2})" text-anchor="middle" fill="#cfe9e5" font-size="12" letter-spacing="2">PROBABILITY</text>`;
    g += `<text x="${o + size / 2}" y="${size + 22}" text-anchor="middle" fill="#cfe9e5" font-size="12" letter-spacing="2">SEVERITY</text>`;
    const pos = (k, r) => [o + k * (c + gap) + c / 2, r * (c + gap) + c / 2];
    [[[4, 0], [2, 2]], [[3, 1], [1, 3]], [[4, 2], [3, 3]]].forEach(([a, b]) => {
      const [x1, y1] = pos(a[0], a[1]), [x2, y2] = pos(b[0], b[1]);
      g += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#ffffff" stroke-width="2" stroke-dasharray="5 4" marker-end="url(#arw)"/>`;
    });
    [[4, 0], [3, 1], [4, 2], [1, 3], [0, 4], [2, 4]].forEach(([k, r]) => {
      const [x, y] = pos(k, r);
      g += `<circle cx="${x}" cy="${y}" r="11" fill="#E8762D" stroke="#ffffff" stroke-width="2"/>`;
    });
    return g + '</svg>';
  }
  const SVG = heroMatrix();

  C.HomeView = {
    props: { draft: Object, mobile: Boolean },
    computed: {
      home() { return this.draft || S.cfg.home || HOME_DEFAULT; },
      sections() { return (this.home.sections || HOME_DEFAULT.sections).filter(s => s.show !== false); },
      cyc() { return S.cfg.cycles.find(c => c.id === S.cycle); },
      svg() { return SVG; }
    },
    methods: {
      tt(k) { const o = (this.home.texts || {})[k]; return (o && o[S.lang]) || H.t(k); },
      enterRm() { if (this.draft) return; if (!S.session) S.after = '/dashboard'; H.go(S.session ? '/dashboard' : '/login'); },
      st(s) { return { '--s': (s.size || 100) / 100 }; }
    },
    template: `<div class="home" :class="{'is-mobile': mobile}">
      <template v-for="s in sections" :key="s.id">
        <section v-if="s.id==='hero'" class="hero" :style="st(s)">
          <div class="hero-text">
            <div class="eyebrow">{{tt('home.eyebrow')}}</div>
            <h1>{{tt('home.title')}}</h1>
            <p class="lead">{{tt('home.lead')}}</p>
            <span v-if="cyc" class="cycle-chip" :class="{off: !cyc.open}"><i></i>{{cyc.name}} · {{ cyc.open ? tt('home.cycleOpen') : tt('home.cycleClosed') }}</span>
          </div>
          <div class="hero-art" v-html="svg"></div>
        </section>

        <section v-else-if="s.id==='loop'" class="loop" :style="st(s)">
          <h3>{{tt('home.loop')}}</h3>
          <ol class="loop-steps"><li v-for="i in 4" :key="i"><b><em>{{i}}</em>{{tt('home.step'+i)}}</b><span>{{tt('home.step'+i+'d')}}</span></li></ol>
          <p class="loop-ref">{{tt('home.ref')}}</p>
        </section>

        <section v-else-if="s.id==='banners'" class="banners" :style="st(s)">
          <a class="banner dd" href="#/survey" @click="draft && $event.preventDefault()">
            <div class="banner-icon"><svg viewBox="0 0 48 48" aria-hidden="true"><rect x="10" y="6" width="28" height="36" rx="4" fill="none" stroke="currentColor" stroke-width="3"/><rect x="18" y="3" width="12" height="7" rx="2" fill="currentColor"/><path d="M16 22l4 4 8-8" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><path d="M16 33h16" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg></div>
            <h2>{{tt('home.ddTitle')}}</h2>
            <span class="banner-go">→</span>
          </a>
          <a class="banner rm" href="#" @click.prevent="enterRm">
            <div class="banner-icon"><svg viewBox="0 0 48 48" aria-hidden="true"><path d="M24 4l16 6v12c0 10-7 18-16 22C15 40 8 32 8 22V10z" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round"/><rect x="16" y="16" width="6" height="6" rx="1" fill="currentColor" opacity=".45"/><rect x="26" y="16" width="6" height="6" rx="1" fill="currentColor"/><rect x="16" y="26" width="6" height="6" rx="1" fill="currentColor" opacity=".25"/><rect x="26" y="26" width="6" height="6" rx="1" fill="currentColor" opacity=".7"/></svg></div>
            <h2>{{tt('home.rmTitle')}} <span class="lock">🔒 {{tt('home.rmLock')}}</span></h2>
            <span class="banner-go">→</span>
          </a>
        </section>
      </template>
    </div>`
  };

  window.HRDD_HOME = { HOME_DEFAULT, HOME_TEXT_KEYS };
})();
