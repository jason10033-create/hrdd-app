/* Risk statistics, risk-matrix SVG rendering and exports (PNG / SVG / editable Excel). */
(function () {
  const FONT = '"Noto Sans TC","Microsoft JhengHei","PingFang TC","Microsoft YaHei",system-ui,sans-serif';
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  function median(vals) {
    if (!vals.length) return null;
    const v = vals.slice().sort((a, b) => a - b), m = Math.floor(v.length / 2);
    return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
  }

  /* rows: [{answers:{q1:{p,s}}, weight}] -> {q1:{p,s,n,dist:{p:[..5],s:[..5]},sdP,sdS}} */
  function aggregate(rows, questions, method) {
    const out = {};
    questions.forEach(q => {
      const ps = [], ss = [], ws = [];
      rows.forEach(r => {
        const a = r.answers && r.answers[q.id];
        if (a && a.p != null && a.s != null) { ps.push(+a.p); ss.push(+a.s); ws.push(+(r.weight || 1)); }
      });
      if (!ps.length) return;
      const wsum = ws.reduce((x, y) => x + y, 0);
      const wmean = arr => arr.reduce((t, v, i) => t + v * ws[i], 0) / wsum;
      const sd = arr => { const m = wmean(arr); return Math.sqrt(arr.reduce((t, v, i) => t + ws[i] * (v - m) ** 2, 0) / wsum); };
      let p, s;
      if (method === 'median') { p = median(ps); s = median(ss); }
      else if (method === 'max') { p = Math.max(...ps); s = Math.max(...ss); }
      else { p = wmean(ps); s = wmean(ss); }
      const dist = { p: [0, 0, 0, 0, 0], s: [0, 0, 0, 0, 0] };
      ps.forEach(v => { dist.p[Math.min(4, Math.max(0, Math.round(v) - 1))]++; });
      ss.forEach(v => { dist.s[Math.min(4, Math.max(0, Math.round(v) - 1))]++; });
      out[q.id] = { p, s, n: ps.length, dist, sdP: sd(ps), sdS: sd(ss), score: p * s };
    });
    return out;
  }

  function zoneOf(p, s, zones) {
    const col = Math.max(0, Math.min(9, Math.floor(s / 0.5)));
    const row = Math.max(0, Math.min(9, Math.floor(p / 0.5)));
    return zones[9 - row][col];
  }

  // Cell that sits deepest inside each zone - used to place the zone label.
  function zoneLabelCells(zones) {
    const res = {};
    ['H', 'M', 'L'].forEach(z => {
      let best = null, bestD = -1;
      for (let r = 0; r < 10; r++) for (let c = 0; c < 10; c++) {
        if (zones[r][c] !== z) continue;
        let d = Math.min(r + 1, c + 1, 10 - r, 10 - c); // grid edge counts as a boundary
        for (let r2 = 0; r2 < 10; r2++) for (let c2 = 0; c2 < 10; c2++) if (zones[r2][c2] !== z) d = Math.min(d, Math.max(Math.abs(r - r2), Math.abs(c - c2)));
        const centre = -Math.abs(r - 4.5) * 0.01 - Math.abs(c - 4.5) * 0.01;
        if (d + centre > bestD) { bestD = d + centre; best = { r, c }; }
      }
      if (best) res[z] = best;
    });
    return res;
  }

  /* opts: { points:[{no,id,p,s}], compare:[{no,p,s}], zones, colors, zoneLabels:{H,M,L}, xLabel, yLabel,
             width, title, legend:[{no,name}], highlight } */
  function renderSVG(o) {
    const W = o.width || 620, ml = 58, mr = 16, mt = o.title ? 40 : 14, plot = W - ml - mr, mb = 52;
    const legendRows = o.legend ? Math.ceil(o.legend.length / 3) : 0;
    const H = mt + plot + mb + (legendRows ? 18 + legendRows * 24 : 0);
    const cell = plot / 10;
    const X = s => ml + (s / 5) * plot, Y = p => mt + plot - (p / 5) * plot;
    let g = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" font-family='${FONT}'>`;
    g += `<rect width="${W}" height="${H}" fill="#ffffff"/>`;
    if (o.title) g += `<text x="${ml}" y="24" font-size="16" font-weight="700" fill="#1f2a33">${esc(o.title)}</text>`;
    for (let r = 0; r < 10; r++) for (let c = 0; c < 10; c++) {
      g += `<rect x="${(ml + c * cell).toFixed(1)}" y="${(mt + r * cell).toFixed(1)}" width="${cell.toFixed(1)}" height="${cell.toFixed(1)}" fill="${o.colors[o.zones[r][c]]}" stroke="#ffffff" stroke-width="1.5"/>`;
    }
    const lc = zoneLabelCells(o.zones);
    Object.keys(lc).forEach(z => {
      const cx = ml + (lc[z].c + 0.5) * cell, cy = mt + (lc[z].r + 0.5) * cell;
      const label = o.zoneLabels[z] || z, tw = label.length * (/[　-鿿]/.test(label) ? 13 : 7) + 14;
      g += `<rect x="${(cx - tw / 2).toFixed(1)}" y="${(cy - 11).toFixed(1)}" width="${tw}" height="22" rx="3" fill="#ffffff" fill-opacity="0.85"/>`;
      g += `<text x="${cx.toFixed(1)}" y="${(cy + 4.5).toFixed(1)}" text-anchor="middle" font-size="12.5" font-weight="600" fill="${z === 'L' ? '#5b6670' : '#1f6f69'}">${esc(label)}</text>`;
    });
    for (let i = 0; i <= 10; i++) {
      const v = (i * 0.5).toFixed(1);
      g += `<text x="${ml - 8}" y="${(Y(i * 0.5) + 4).toFixed(1)}" text-anchor="end" font-size="11" fill="#5b6670">${v}</text>`;
      g += `<text x="${X(i * 0.5).toFixed(1)}" y="${mt + plot + 17}" text-anchor="middle" font-size="11" fill="#5b6670">${v}</text>`;
    }
    g += `<text x="${ml + plot / 2}" y="${mt + plot + 40}" text-anchor="middle" font-size="13" font-weight="600" fill="#1f2a33">${esc(o.xLabel)} →</text>`;
    g += `<text transform="translate(16 ${mt + plot / 2}) rotate(-90)" text-anchor="middle" font-size="13" font-weight="600" fill="#1f2a33">${esc(o.yLabel)} →</text>`;

    const R = 11;
    (o.compare || []).forEach(c => {
      const x = X(c.s), y = Y(c.p);
      g += `<g><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${R - 1}" fill="#ffffff" fill-opacity="0.6" stroke="#46525c" stroke-width="1.5" stroke-dasharray="3 2"/>`;
      g += `<text x="${x.toFixed(1)}" y="${(y + 4).toFixed(1)}" text-anchor="middle" font-size="10.5" font-weight="700" fill="#46525c">${c.no}</text></g>`;
    });

    // Points sit exactly on their (S, P) coordinates. Items sharing the same coordinate are drawn as one
    // highlighted cluster marker (×n + red badge); clicking it lists the items (data-qs).
    const groups = [];
    (o.points || []).forEach(p => {
      const k = (+p.s).toFixed(2) + '|' + (+p.p).toFixed(2);
      let gr = groups.find(x => x.k === k);
      if (!gr) { gr = { k, x: X(p.s), y: Y(p.p), items: [] }; groups.push(gr); }
      gr.items.push(p);
    });
    groups.forEach(gr => {
      const x = gr.x.toFixed(1), y = gr.y.toFixed(1);
      if (gr.items.length === 1) {
        const p = gr.items[0], hi = o.highlight === p.id;
        g += `<g class="pt" data-q="${p.id}" style="cursor:pointer"><title>${esc(p.tip || '')}</title>`;
        g += `<circle cx="${x}" cy="${y}" r="${hi ? R + 3 : R}" fill="#E8762D" stroke="${hi ? '#1f2a33' : '#ffffff'}" stroke-width="${hi ? 2.5 : 1.5}"/>`;
        g += `<text x="${x}" y="${(gr.y + 4.2).toFixed(1)}" text-anchor="middle" font-size="12" font-weight="700" fill="#ffffff" pointer-events="none">${p.no}</text></g>`;
        return;
      }
      const hi = gr.items.some(p => p.id === o.highlight), n = gr.items.length, nos = gr.items.map(p => p.no).join('·');
      g += `<g class="pt cluster" data-qs="${gr.items.map(p => p.id).join(',')}" style="cursor:pointer"><title>${esc(gr.items.map(p => p.tip || p.no).join('\n'))}</title>`;
      g += `<circle cx="${x}" cy="${y}" r="${R + 5}" fill="none" stroke="#C0392B" stroke-width="2" stroke-dasharray="4 2.5"/>`;
      g += `<circle cx="${x}" cy="${y}" r="${R + 1}" fill="#B9461B" stroke="${hi ? '#1f2a33' : '#ffffff'}" stroke-width="${hi ? 2.5 : 1.5}"/>`;
      g += `<text x="${x}" y="${(gr.y + 4.2).toFixed(1)}" text-anchor="middle" font-size="11.5" font-weight="700" fill="#ffffff" pointer-events="none">×${n}</text>`;
      g += `<circle cx="${(gr.x + R + 2).toFixed(1)}" cy="${(gr.y - R - 2).toFixed(1)}" r="7.5" fill="#C0392B" stroke="#ffffff" stroke-width="1.5"/>`;
      g += `<text x="${(gr.x + R + 2).toFixed(1)}" y="${(gr.y - R + 1.5).toFixed(1)}" text-anchor="middle" font-size="10" font-weight="700" fill="#ffffff" pointer-events="none">${n}</text>`;
      if (o.clusterLabels) {
        // static exports cannot be clicked, so spell out the item numbers next to the cluster
        const tw = nos.length * 7 + 12, lx = Math.min(gr.x + R + 8, ml + plot - tw), ly = gr.y + R + 4;
        g += `<rect x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" width="${tw}" height="18" rx="4" fill="#ffffff" stroke="#C0392B"/>`;
        g += `<text x="${(lx + tw / 2).toFixed(1)}" y="${(ly + 13).toFixed(1)}" text-anchor="middle" font-size="11.5" font-weight="700" fill="#C0392B" pointer-events="none">${nos}</text>`;
      }
      g += '</g>';
    });

    if (o.legend) {
      const colW = (W - ml - mr) / 3;
      o.legend.forEach((l, i) => {
        const cx = ml + (i % 3) * colW + 10, cy = mt + plot + mb + 18 + Math.floor(i / 3) * 24;
        g += `<circle cx="${cx}" cy="${cy}" r="9" fill="#E8762D"/><text x="${cx}" y="${cy + 4}" text-anchor="middle" font-size="10.5" font-weight="700" fill="#fff">${l.no}</text>`;
        g += `<text x="${cx + 16}" y="${cy + 4.5}" font-size="12.5" fill="#1f2a33">${esc(l.name)}</text>`;
      });
    }
    return g + '</svg>';
  }

  function download(blob, name) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }

  function svgToPng(svg, scale) {
    return new Promise((resolve, reject) => {
      const m = svg.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);
      const w = +m[1], h = +m[2], img = new Image();
      img.onload = () => {
        const c = document.createElement('canvas'); c.width = w * scale; c.height = h * scale;
        const ctx = c.getContext('2d'); ctx.scale(scale, scale); ctx.drawImage(img, 0, 0, w, h);
        c.toBlob(b => b ? resolve(b) : reject(new Error('png')), 'image/png');
      };
      img.onerror = reject;
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    });
  }

  /* Editable Excel: Matrix sheet (coloured 0.5-step grid with item numbers) + Data sheet with native scatter chart. */
  async function matrixXlsx(o) {
    // o: { title, items:[{no,name,cat,p,s,score,zoneLabel,n}], zones, colors, xLabel, yLabel, zoneLabels }
    const grid = Array.from({ length: 10 }, () => Array(10).fill(''));
    o.items.forEach(it => {
      const col = Math.max(0, Math.min(9, Math.floor(it.s / 0.5))), row = 9 - Math.max(0, Math.min(9, Math.floor(it.p / 0.5)));
      grid[row][col] = grid[row][col] ? grid[row][col] + ', ' + it.no : String(it.no);
    });
    const mrows = [[{ v: o.title, bold: true }], [{ v: o.yLabel + ' ↑', bold: true }]];
    for (let r = 0; r < 10; r++) {
      const p = 5 - r * 0.5;
      const row = [{ v: (p - 0.5).toFixed(1) + '–' + p.toFixed(1), align: 'center' }];
      for (let c = 0; c < 10; c++) {
        const z = o.zones[r][c];
        row.push({ v: grid[r][c], fill: o.colors[z], bold: true, align: 'center', color: grid[r][c] ? '#C0392B' : null, border: true });
      }
      mrows.push(row);
    }
    const axis = [''];
    for (let c = 0; c < 10; c++) axis.push({ v: (c * 0.5).toFixed(1) + '–' + (c * 0.5 + 0.5).toFixed(1), align: 'center' });
    mrows.push(axis);
    mrows.push(['', { v: o.xLabel + ' →', bold: true }]);
    mrows.push([]);
    mrows.push([{ v: '', fill: o.colors.H }, o.zoneLabels.H, { v: '', fill: o.colors.M }, o.zoneLabels.M, { v: '', fill: o.colors.L }, o.zoneLabels.L]);
    mrows.push([]);
    o.items.forEach(it => mrows.push([{ v: it.no, align: 'center', bold: true }, it.name]));
    const head = o.headers;
    const drows = [head.map(h => ({ v: h, bold: true, fill: '#1F6F69', color: '#FFFFFF', align: 'center' }))];
    o.items.forEach(it => drows.push([it.no, it.name, it.cat, { v: +it.p.toFixed(2), num: true }, { v: +it.s.toFixed(2), num: true }, { v: +it.score.toFixed(2), num: true }, { v: it.zoneLabel, fill: o.colors[it.zone] }, it.n]));
    const series = o.items.map((it, i) => ({ name: String(it.no), xRef: `Data!$E$${i + 2}`, yRef: `Data!$D$${i + 2}` }));
    const blob = await XLSXW.build({
      sheets: [
        { name: 'Matrix', cols: [12, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9], rowHeights: Object.fromEntries(Array.from({ length: 10 }, (_, i) => [i + 2, 30])), rows: mrows, showGrid: false },
        { name: 'Data', cols: [8, 28, 22, 12, 12, 14, 14, 8], rows: drows,
          chart: { title: o.title, xTitle: o.xLabel, yTitle: o.yLabel, min: 0, max: 5, series, anchor: { col: 9, row: 1, toCol: 19, toRow: 26 } } }
      ]
    });
    return blob;
  }

  window.HRDD_MATRIX = { aggregate, zoneOf, renderSVG, svgToPng, download, matrixXlsx };
})();
