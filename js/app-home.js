/* Landing page: two large entry banners (due diligence / risk management) over a risk-themed hero. */
(function () {
  const C = window.HRDD_C, H = window.HRDD_H, S = H.S;

  // Decorative 5x5 heat matrix: issues drift from high-risk cells toward low-risk cells (mitigation).
  function heroMatrix() {
    const n = 5, c = 46, gap = 4, o = 30, size = n * (c + gap);
    const heat = (r, k) => { const v = (n - 1 - r) + k; return v >= 6 ? '#E4572E' : v >= 5 ? '#F08A4B' : v >= 3 ? '#F4C542' : v >= 2 ? '#8FD0C3' : '#5FB8A9'; };
    let g = `<svg viewBox="0 0 ${size + o + 20} ${size + o + 10}" xmlns="http://www.w3.org/2000/svg" class="hero-svg" aria-hidden="true">`;
    g += '<defs><marker id="arw" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="#ffffff"/></marker></defs>';
    for (let r = 0; r < n; r++) for (let k = 0; k < n; k++) {
      g += `<rect x="${o + k * (c + gap)}" y="${r * (c + gap)}" width="${c}" height="${c}" rx="6" fill="${heat(r, k)}" opacity="${0.55 + 0.09 * ((n - 1 - r) + k) / 2}"/>`;
    }
    g += `<text x="10" y="${size / 2}" transform="rotate(-90 10 ${size / 2})" text-anchor="middle" fill="#cfe9e5" font-size="12" letter-spacing="2">PROBABILITY</text>`;
    g += `<text x="${o + size / 2}" y="${size + 22}" text-anchor="middle" fill="#cfe9e5" font-size="12" letter-spacing="2">SEVERITY</text>`;
    const pos = (k, r) => [o + k * (c + gap) + c / 2, r * (c + gap) + c / 2];
    [[[4, 0], [2, 2]], [[3, 1], [1, 3]], [[4, 2], [3, 3]]].forEach(([a, b], i) => {
      const [x1, y1] = pos(a[0], a[1]), [x2, y2] = pos(b[0], b[1]);
      g += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#ffffff" stroke-width="2" stroke-dasharray="5 4" marker-end="url(#arw)" class="hero-flow" style="animation-delay:${i * 0.4}s"/>`;
    });
    [[4, 0, 2], [3, 1, 7], [4, 2, 6], [1, 3, 1], [0, 4, 3], [2, 4, 4]].forEach(([k, r, no], i) => {
      const [x, y] = pos(k, r);
      g += `<g class="hero-dot" style="animation-delay:${i * 0.25}s"><circle cx="${x}" cy="${y}" r="13" fill="#E8762D" stroke="#ffffff" stroke-width="2"/><text x="${x}" y="${y + 4.5}" text-anchor="middle" font-size="13" font-weight="700" fill="#ffffff">${no}</text></g>`;
    });
    return g + '</svg>';
  }

  C.HomeView = {
    computed: {
      svg() { return heroMatrix(); },
      cyc() { return S.cfg.cycles.find(c => c.id === S.cycle); },
      steps() { return [1, 2, 3, 4].map(i => ({ i, title: H.t('home.step' + i), desc: H.t('home.step' + i + 'd') })); }
    },
    methods: {
      enterRm() { if (!S.session) S.after = '/dashboard'; H.go(S.session ? '/dashboard' : '/login'); }
    },
    template: `<div class="home">
      <section class="hero">
        <div class="hero-text">
          <div class="eyebrow">{{t('home.eyebrow')}}</div>
          <h1>{{t('home.title')}}</h1>
          <p class="lead">{{t('home.lead')}}</p>
          <span v-if="cyc" class="cycle-chip" :class="{off: !cyc.open}"><i></i>{{cyc.name}} · {{ cyc.open ? t('home.cycleOpen') : t('home.cycleClosed') }}</span>
        </div>
        <div class="hero-art" v-html="svg"></div>
      </section>

      <section class="banners">
        <a class="banner dd" href="#/survey">
          <div class="banner-icon"><svg viewBox="0 0 48 48" aria-hidden="true"><rect x="10" y="6" width="28" height="36" rx="4" fill="none" stroke="currentColor" stroke-width="3"/><rect x="18" y="3" width="12" height="7" rx="2" fill="currentColor"/><path d="M16 22l4 4 8-8" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><path d="M16 33h16" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg></div>
          <div class="banner-body"><div class="banner-kicker">STEP 1 · {{t('home.ddKicker')}}</div><h2>{{t('nav.dd')}}</h2><p>{{t('home.ddDesc')}}</p>
            <div class="banner-tags"><span v-for="x in t('home.ddTags').split('|')" :key="x">{{x}}</span></div></div>
          <div class="banner-cta">{{t('home.ddCta')}} <span>→</span></div>
        </a>
        <a class="banner rm" href="#" @click.prevent="enterRm">
          <div class="banner-icon"><svg viewBox="0 0 48 48" aria-hidden="true"><path d="M24 4l16 6v12c0 10-7 18-16 22C15 40 8 32 8 22V10z" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round"/><rect x="16" y="16" width="6" height="6" rx="1" fill="currentColor" opacity=".45"/><rect x="26" y="16" width="6" height="6" rx="1" fill="currentColor"/><rect x="16" y="26" width="6" height="6" rx="1" fill="currentColor" opacity=".25"/><rect x="26" y="26" width="6" height="6" rx="1" fill="currentColor" opacity=".7"/></svg></div>
          <div class="banner-body"><div class="banner-kicker">STEP 2 · {{t('home.rmKicker')}}</div><h2>{{t('nav.rm')}} <span class="lock">🔒 {{t('home.rmLock')}}</span></h2><p>{{t('home.rmDesc')}}</p>
            <div class="banner-tags"><span v-for="x in t('home.rmTags').split('|')" :key="x">{{x}}</span></div></div>
          <div class="banner-cta">{{t('home.rmCta')}} <span>→</span></div>
        </a>
      </section>

      <section class="loop">
        <h3>{{t('home.loop')}}</h3>
        <ol class="loop-steps"><li v-for="s in steps" :key="s.i"><b><em>{{s.i}}</em>{{s.title}}</b><span>{{s.desc}}</span></li></ol>
        <p class="muted small">{{t('home.ref')}}</p>
      </section>
    </div>`
  };
})();
