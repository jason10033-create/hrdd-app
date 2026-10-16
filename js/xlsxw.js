/* Minimal .xlsx writer (needs JSZip) with cell fills and an optional native scatter chart.
 * workbook = { sheets: [ { name, cols:[widths], rows:[[cell]], merges:['A1:C1'], chart } ] }
 * cell = value | { v, s }  where s is a style name below, or { v, fill:'#RRGGBB', bold, color, align }
 * chart = { title, xTitle, yTitle, min, max, series:[{ name, xRef, yRef, color }], anchor:{col,row,toCol,toRow} } */
(function () {
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');
  const colName = n => { let s = ''; n++; while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); } return s; };

  function buildStyles(styleList) {
    // styleList: array of {fill, bold, color, align, wrap, num}
    const fills = ['<fill><patternFill patternType="none"/></fill>', '<fill><patternFill patternType="gray125"/></fill>'];
    const fonts = ['<font><sz val="11"/><name val="Calibri"/></font>'];
    const xfs = ['<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>'];
    const fillIdx = {}, fontIdx = { '': 0 };
    styleList.forEach(st => {
      let fid = 0, fo = 0;
      if (st.fill) {
        const k = st.fill.replace('#', '').toUpperCase();
        if (fillIdx[k] === undefined) { fillIdx[k] = fills.length; fills.push(`<fill><patternFill patternType="solid"><fgColor rgb="FF${k}"/><bgColor indexed="64"/></patternFill></fill>`); }
        fid = fillIdx[k];
      }
      const fk = (st.bold ? 'b' : '') + (st.color || '');
      if (fk) {
        if (fontIdx[fk] === undefined) { fontIdx[fk] = fonts.length; fonts.push(`<font>${st.bold ? '<b/>' : ''}<sz val="11"/>${st.color ? `<color rgb="FF${st.color.replace('#', '').toUpperCase()}"/>` : ''}<name val="Calibri"/></font>`); }
        fo = fontIdx[fk];
      }
      const numFmt = st.num ? 2 : 0;
      const al = (st.align || st.wrap) ? `<alignment${st.align ? ` horizontal="${st.align}" vertical="center"` : ' vertical="top"'}${st.wrap ? ' wrapText="1"' : ''}/>` : '';
      xfs.push(`<xf numFmtId="${numFmt}" fontId="${fo}" fillId="${fid}" borderId="${st.border ? 1 : 0}" xfId="0"${numFmt ? ' applyNumberFormat="1"' : ''}${fid ? ' applyFill="1"' : ''}${fo ? ' applyFont="1"' : ''}${al ? ' applyAlignment="1"' : ''}${st.border ? ' applyBorder="1"' : ''}>${al}</xf>`);
    });
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<fonts count="${fonts.length}">${fonts.join('')}</fonts>
<fills count="${fills.length}">${fills.join('')}</fills>
<borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left style="thin"><color rgb="FFFFFFFF"/></left><right style="thin"><color rgb="FFFFFFFF"/></right><top style="thin"><color rgb="FFFFFFFF"/></top><bottom style="thin"><color rgb="FFFFFFFF"/></bottom><diagonal/></border></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="${xfs.length}">${xfs.join('')}</cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;
  }

  function chartXml(ch) {
    const ser = ch.series.map((s, i) => `
<c:ser><c:idx val="${i}"/><c:order val="${i}"/>
<c:tx><c:v>${esc(s.name)}</c:v></c:tx>
<c:spPr><a:ln w="19050"><a:noFill/></a:ln></c:spPr>
<c:marker><c:symbol val="circle"/><c:size val="${s.size || 16}"/><c:spPr><a:solidFill><a:srgbClr val="${(s.color || '#E8762D').replace('#', '')}"/></a:solidFill><a:ln><a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill></a:ln></c:spPr></c:marker>
<c:dLbls><c:spPr><a:noFill/><a:ln><a:noFill/></a:ln></c:spPr><c:txPr><a:bodyPr/><a:lstStyle/><a:p><a:pPr><a:defRPr sz="900" b="1"><a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill></a:defRPr></a:pPr><a:endParaRPr lang="en-US"/></a:p></c:txPr><c:dLblPos val="ctr"/><c:showLegendKey val="0"/><c:showVal val="0"/><c:showCatName val="0"/><c:showSerName val="1"/><c:showPercent val="0"/><c:showBubbleSize val="0"/></c:dLbls>
<c:xVal><c:numRef><c:f>${s.xRef}</c:f></c:numRef></c:xVal>
<c:yVal><c:numRef><c:f>${s.yRef}</c:f></c:numRef></c:yVal>
<c:smooth val="0"/></c:ser>`).join('');
    const axTitle = t => `<c:title><c:tx><c:rich><a:bodyPr/><a:lstStyle/><a:p><a:pPr><a:defRPr sz="1000" b="1"/></a:pPr><a:r><a:rPr lang="zh-TW" sz="1000" b="1"/><a:t>${esc(t)}</a:t></a:r></a:p></c:rich></c:tx><c:overlay val="0"/></c:title>`;
    const ax = (id, cross, pos, title) => `<c:valAx><c:axId val="${id}"/><c:scaling><c:orientation val="minMax"/><c:max val="${ch.max}"/><c:min val="${ch.min}"/></c:scaling><c:delete val="0"/><c:axPos val="${pos}"/><c:majorGridlines><c:spPr><a:ln w="6350"><a:solidFill><a:srgbClr val="D9D9D9"/></a:solidFill></a:ln></c:spPr></c:majorGridlines>${axTitle(title)}<c:numFmt formatCode="0.0" sourceLinked="0"/><c:majorTickMark val="out"/><c:minorTickMark val="none"/><c:tickLblPos val="nextTo"/><c:crossAx val="${cross}"/><c:crosses val="autoZero"/><c:crossBetween val="midCat"/><c:majorUnit val="0.5"/></c:valAx>`;
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<c:chartSpace xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<c:roundedCorners val="0"/>
<c:chart>
<c:title><c:tx><c:rich><a:bodyPr/><a:lstStyle/><a:p><a:pPr><a:defRPr sz="1200" b="1"/></a:pPr><a:r><a:rPr lang="zh-TW" sz="1200" b="1"/><a:t>${esc(ch.title)}</a:t></a:r></a:p></c:rich></c:tx><c:overlay val="0"/></c:title>
<c:autoTitleDeleted val="0"/>
<c:plotArea><c:layout/>
<c:scatterChart><c:scatterStyle val="lineMarker"/><c:varyColors val="0"/>${ser}
<c:axId val="500100"/><c:axId val="500200"/></c:scatterChart>
${ax(500100, 500200, 'b', ch.xTitle)}
${ax(500200, 500100, 'l', ch.yTitle)}
</c:plotArea>
<c:legend><c:legendPos val="r"/><c:overlay val="0"/></c:legend>
<c:plotVisOnly val="1"/><c:dispBlanksAs val="gap"/>
</c:chart>
</c:chartSpace>`;
  }

  function drawingXml(a) {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
<xdr:twoCellAnchor>
<xdr:from><xdr:col>${a.col}</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>${a.row}</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from>
<xdr:to><xdr:col>${a.toCol}</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>${a.toRow}</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:to>
<xdr:graphicFrame macro=""><xdr:nvGraphicFramePr><xdr:cNvPr id="2" name="Chart 1"/><xdr:cNvGraphicFramePr/></xdr:nvGraphicFramePr>
<xdr:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/></xdr:xfrm>
<a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/chart"><c:chart xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" r:id="rId1"/></a:graphicData></a:graphic>
</xdr:graphicFrame><xdr:clientData/></xdr:twoCellAnchor>
</xdr:wsDr>`;
  }

  async function build(wb) {
    const zip = new JSZip();
    const styleKeys = [], styleList = [];
    const styleId = st => {
      if (!st) return 0;
      const k = JSON.stringify(st);
      let i = styleKeys.indexOf(k);
      if (i < 0) { styleKeys.push(k); styleList.push(st); i = styleKeys.length - 1; }
      return i + 1;
    };
    let chartN = 0;
    const sheetXml = wb.sheets.map((sh, si) => {
      const rows = sh.rows.map((row, ri) => {
        const cells = (row || []).map((c, ci) => {
          if (c === null || c === undefined || c === '') return '';
          const o = (typeof c === 'object') ? c : { v: c };
          const st = Object.assign({}, o); delete st.v;
          const s = Object.keys(st).length ? ` s="${styleId(st)}"` : '';
          const ref = colName(ci) + (ri + 1);
          if (o.v === null || o.v === undefined || o.v === '') return `<c r="${ref}"${s}/>`;
          if (typeof o.v === 'number' && isFinite(o.v)) return `<c r="${ref}"${s}><v>${o.v}</v></c>`;
          return `<c r="${ref}"${s} t="inlineStr"><is><t xml:space="preserve">${esc(o.v)}</t></is></c>`;
        }).join('');
        const ht = sh.rowHeights && sh.rowHeights[ri] ? ` ht="${sh.rowHeights[ri]}" customHeight="1"` : '';
        return `<row r="${ri + 1}"${ht}>${cells}</row>`;
      }).join('');
      const cols = sh.cols ? `<cols>${sh.cols.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join('')}</cols>` : '';
      const merges = sh.merges && sh.merges.length ? `<mergeCells count="${sh.merges.length}">${sh.merges.map(m => `<mergeCell ref="${m}"/>`).join('')}</mergeCells>` : '';
      let drawing = '';
      if (sh.chart) {
        chartN++;
        drawing = '<drawing r:id="rId1"/>';
        zip.file(`xl/worksheets/_rels/sheet${si + 1}.xml.rels`, `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/drawing${chartN}.xml"/></Relationships>`);
        zip.file(`xl/drawings/drawing${chartN}.xml`, drawingXml(sh.chart.anchor));
        zip.file(`xl/drawings/_rels/drawing${chartN}.xml.rels`, `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/chart" Target="../charts/chart${chartN}.xml"/></Relationships>`);
        zip.file(`xl/charts/chart${chartN}.xml`, chartXml(sh.chart));
      }
      return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheetViews><sheetView workbookViewId="0"${sh.showGrid === false ? ' showGridLines="0"' : ''}/></sheetViews>
<sheetFormatPr defaultRowHeight="15"/>${cols}<sheetData>${rows}</sheetData>${merges}${drawing}</worksheet>`;
    });
    sheetXml.forEach((x, i) => zip.file(`xl/worksheets/sheet${i + 1}.xml`, x));
    zip.file('xl/styles.xml', buildStyles(styleList));
    zip.file('xl/workbook.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${wb.sheets.map((s, i) => `<sheet name="${esc(s.name.slice(0, 31))}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets></workbook>`);
    zip.file('xl/_rels/workbook.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${wb.sheets.map((s, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')}<Relationship Id="rId${wb.sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`);
    zip.file('_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`);
    let ct = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>`;
    wb.sheets.forEach((s, i) => { ct += `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`; });
    for (let i = 1; i <= chartN; i++) ct += `<Override PartName="/xl/drawings/drawing${i}.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/><Override PartName="/xl/charts/chart${i}.xml" ContentType="application/vnd.openxmlformats-officedocument.drawingml.chart+xml"/>`;
    zip.file('[Content_Types].xml', ct + '</Types>');
    return zip.generateAsync({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  }

  window.XLSXW = { build, colName };
})();
