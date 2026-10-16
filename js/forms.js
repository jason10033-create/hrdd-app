/* Parser for Microsoft Forms "Open results in Excel" exports (needs SheetJS).
 * Detects columns by header text in 繁中 / 简中 / English, pairs Probability/Severity columns in order. */
(function () {
  const has = (h, words) => words.some(w => h.toLowerCase().includes(w.toLowerCase()));
  const score = v => {
    if (v === null || v === undefined || v === '') return null;
    if (typeof v === 'number') return v >= 1 && v <= 5 ? v : null;
    const m = String(v).match(/^\s*([1-5])/);
    return m ? +m[1] : null;
  };
  const toIso = v => {
    if (typeof v === 'number') return new Date(Math.round((v - 25569) * 86400000)).toISOString().slice(0, 19);
    const d = new Date(v); return isNaN(d) ? new Date().toISOString().slice(0, 19) : d.toISOString().slice(0, 19);
  };

  function detect(header) {
    const m = { p: [], s: [] };
    header.forEach((h, i) => {
      h = String(h || '').trim(); if (!h) return;
      if (/^id$/i.test(h)) m.id = i;
      else if (has(h, ['電子郵件', '电子邮件', 'email', 'e-mail'])) m.email = i;
      else if (/^(名稱|名称|name)$/i.test(h)) m.name = i;
      else if (/^(語言|语言|language)$/i.test(h)) m.lang = i;
      else if (has(h, ['完成時間', '完成时间', 'completion time'])) m.done = i;
      // comment header also mentions 「發生機率」, so test it before the score columns
      else if (has(h, ['補充說明', '补充说明', 'additional', 'comment'])) m.comment = i;
      else if (has(h, ['區域', '区域', 'region'])) m.region = i;
      else if (has(h, ['發生機率', '发生概率', '發生概率', 'probability'])) m.p.push(i);
      else if (has(h, ['嚴重程度', '严重程度', 'severity'])) m.s.push(i);
    });
    return m;
  }

  /* returns { mapping, rows:[{ resp, status }] } */
  function parse(arrayBuffer, ctx) {
    // ctx: { cycle, questions (enabled, ordered), units:[ids], session, existingIds:Set }
    const wb = XLSX.read(arrayBuffer, { type: 'array' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: '' });
    if (!data.length) return { mapping: null, rows: [] };
    const header = data[0].map(h => String(h || '').replace(/\s+/g, ' ').trim());
    const m = detect(header);
    const pairs = Math.min(m.p.length, m.s.length, ctx.questions.length);
    const mapping = {
      header, m,
      pairs: Array.from({ length: pairs }, (_, i) => ({ q: ctx.questions[i], p: header[m.p[i]], s: header[m.s[i]] }))
    };
    if (!pairs) return { mapping, rows: [] };
    const rows = [];
    data.slice(1).forEach(r => {
      if (!r.some(v => v !== '' && v !== null)) return;
      const unitRaw = m.region !== undefined ? String(r[m.region] || '').toUpperCase() : '';
      const unit = ctx.units.find(u => unitRaw.includes(u)) || '';
      const email = m.email !== undefined ? String(r[m.email] || '').trim() : '';
      const name = m.name !== undefined ? String(r[m.name] || '').trim() : '';
      const answers = {}; let complete = true;
      for (let i = 0; i < pairs; i++) {
        const p = score(r[m.p[i]]), s = score(r[m.s[i]]);
        if (p === null || s === null) complete = false;
        answers[ctx.questions[i].id] = { p, s };
      }
      const key = (email || name || ('row' + (m.id !== undefined ? r[m.id] : rows.length))).toLowerCase();
      const resp = {
        id: 'forms-' + ctx.cycle + '-' + key, cycle: ctx.cycle, unit, name, email,
        lang: m.lang !== undefined ? String(r[m.lang] || '').replace(/[‎‏]/g, '').trim() : '',
        submitted_at: m.done !== undefined ? toIso(r[m.done]) : new Date().toISOString().slice(0, 19),
        source: 'forms', weight: 1, answers,
        comment: m.comment !== undefined ? String(r[m.comment] || '').trim() : ''
      };
      let status = 'new';
      if (!unit || !complete) status = 'invalid';
      else if (ctx.session.role !== 'admin' && ctx.session.unit !== unit) status = 'forbidden';
      else if (ctx.existingIds.has(resp.id) || rows.some(x => x.resp.id === resp.id)) status = 'dup';
      rows.push({ resp, status });
    });
    return { mapping, rows };
  }

  window.HRDD_FORMS = { parse };
})();
