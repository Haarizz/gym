import{p as E,r as T,e as a,a as _,i as M,h as H,f as b,P as k,L as N,c as w,b as C}from"./index-Bxn7CKoc.js";import{r as A,M as c,I as x,A as $,Z as u,R as y,a as R}from"./theme-BVpU--hQ.js";const F=(t,s)=>`
  @page { size: A4 ${t?"landscape":"portrait"}; margin: 15mm 14mm 17mm 14mm;
    @bottom-left { content: "${s.replace(/["\\]/g,"")}"; font: 7.5pt ${k}; color: ${c}; }
    @bottom-right { content: "Page " counter(page) " of " counter(pages); font: 7.5pt ${k}; color: ${c}; }
  }
  * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  html, body { margin: 0; padding: 0; background: #fff; }
  body { font-family: ${k}; color: ${x}; font-size: 9pt; line-height: 1.4; }
  .doc-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 10mm; padding-bottom: 3.5mm; border-bottom: 0.6mm solid ${$}; margin-bottom: 6mm; }
  .co-local { text-align: left; font-family: ${N}; font-size: 13pt; font-weight: 700; color: ${$}; unicode-bidi: isolate; line-height: 1.35; }
  .co-name { font-size: 15pt; font-weight: 700; color: ${$}; line-height: 1.25; margin-bottom: 1mm; }
  .co-line { font-size: 8.5pt; color: ${c}; }
  .co-trn { font-size: 8.5pt; font-weight: 700; color: ${x}; }
  .logo { max-width: 46mm; max-height: 22mm; object-fit: contain; display: block; }
  h1 { font-size: 16pt; margin: 0 0 1mm; line-height: 1.25; }
  .subtitle { color: ${c}; font-size: 9.5pt; margin-bottom: 1mm; }
  .info { display: grid; grid-template-columns: repeat(${t?4:3}, 1fr); gap: 2.4mm 4mm; background: ${u}; border: 0.25mm solid ${y}; border-radius: 1.8mm; padding: 3.2mm 4mm; margin: 2.5mm 0 7mm; break-inside: avoid; }
  .k { font-size: 6.6pt; font-weight: 700; color: ${c}; text-transform: uppercase; letter-spacing: .02em; }
  .v { font-size: 8.8pt; }
  .kv { display: grid; gap: 2.4mm 4mm; margin-bottom: 6mm; break-inside: avoid; }
  .kv .v { font-weight: 600; }
  .sec-title { font-size: 11pt; font-weight: 700; border-left: 1.1mm solid ${$}; padding-left: 2.2mm; margin: 0 0 2.6mm; break-after: avoid; page-break-after: avoid; }
  .sec-desc { color: ${c}; font-size: 8.5pt; margin: -1.4mm 0 2.4mm; break-after: avoid; }
  section { margin-bottom: 7mm; }
  .kpis { display: grid; grid-template-columns: repeat(var(--n), 1fr); gap: 3.5mm; }
  .kpi { background: ${u}; border: 0.25mm solid ${y}; border-left: 0.9mm solid ${$}; border-radius: 1.8mm; padding: 2.6mm 3.2mm; break-inside: avoid; }
  .kpi .val { font-size: 13pt; font-weight: 700; margin-top: 1mm; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .kpi .hint { font-size: 6.8pt; color: ${c}; margin-top: .6mm; }
  .kpi .hint.good { color: #0f7b4d; } .kpi .hint.bad { color: #b42318; }
  .chart { break-inside: avoid; page-break-inside: avoid; }
  .chart svg { width: 100%; height: auto; display: block; }
  table { width: 100%; border-collapse: collapse; font-size: var(--fs); }
  thead { display: table-header-group; }
  tfoot { display: table-row-group; }
  tr { break-inside: avoid; page-break-inside: avoid; }
  th { background: ${$}; color: #fff; font-weight: 700; text-align: left; padding: 1.7mm 2mm; vertical-align: middle; }
  td { padding: 1.6mm 2mm; border-bottom: 0.15mm solid ${y}; vertical-align: middle; }
  tbody tr:nth-child(even) td { background: ${u}; }
  .r { text-align: right; white-space: nowrap; } .c { text-align: center; } .nw { white-space: nowrap; }
  tr.section td { background: #eef2f1 !important; font-weight: 700; }
  tr.subtotal td { background: #f3f4f6 !important; font-weight: 700; }
  tr.total td, tfoot td { background: ${R} !important; font-weight: 700; border-top: 0.4mm solid ${$}; }
  tr.muted td { color: ${c}; font-style: italic; }
  .empty { background: ${u}; border: 0.25mm solid ${y}; border-radius: 1.8mm; padding: 4mm; text-align: center; color: ${c}; }
  .empty.big { padding: 9mm; } .empty.big b { display: block; color: ${x}; font-size: 12pt; margin-bottom: 1.5mm; }
  .text p { margin: 0 0 2mm; white-space: pre-wrap; text-align: start; }
  [dir="auto"] { unicode-bidi: isolate; }
`,p=t=>/[^\x00-\u024F\u2000-\u20CF]/.test(t)?' dir="auto"':"";function L(t,s){if(!t.rows.length)return`<div class="empty">${a(t.emptyText||"No data available for the selected filters.")}</div>`;const o=t.columns,e=t.rows.length>300?t.rows.filter((i,d)=>d%Math.ceil(t.rows.length/300)===0):t.rows,h=o.map(i=>!i.wrap&&(i.format==="date"||i.format==="time"||Math.max(0,...e.map(d=>b(d[i.key],i.format,s).length))<=18)),l=(i,d)=>{const n=w(i),v=[n==="right"?"r":n==="center"?"c":"",h[d]?"nw":""].filter(Boolean);return v.length?` class="${v.join(" ")}"`:""},r=i=>i==="right"?' class="r"':i==="center"?' class="c"':"",g=o.length<=6?8.5:o.length<=9?8:o.length<=12?7.2:6.5,f=`<thead><tr>${o.map(i=>`<th${r(w(i))}>${a(i.header)}</th>`).join("")}</tr></thead>`,m=t.rows.map(i=>{const d=i._kind??"data";if(d==="section"&&!o.slice(1).some(n=>i[n.key]!=null&&i[n.key]!=="")){const n=String(i[o[0].key]??"");return`<tr class="section"><td colspan="${o.length}"${p(n)}>${a(n)}</td></tr>`}return`<tr${d!=="data"?` class="${d}"`:""}>${o.map((n,v)=>{const z=b(i[n.key],n.format,s);return`<td${l(n,v)}${p(z)}>${a(z)}</td>`}).join("")}</tr>`}).join("");let j="";if(t.totals){const i=typeof t.totals=="object"&&t.totals.label?t.totals.label:"Total",d=C(o,t.rows,i);j=`<tfoot><tr>${o.map(n=>`<td${r(w(n))}>${a(b(d[n.key],n.total&&["sum","avg","min","max"].includes(n.total)?n.format:n.total==="count"?"integer":"text",s))}</td>`).join("")}</tr></tfoot>`}return`<table style="--fs:${g}pt">${f}<tbody>${m}</tbody>${j}</table>`}function P(t,s,o){const e="title"in t&&t.title?`<div class="sec-title"${p(t.title)}>${a(t.title)}</div>`:"",h="description"in t&&t.description?`<div class="sec-desc">${a(t.description)}</div>`:"";switch(t.kind){case"pageBreak":return'<div style="break-after:page;page-break-after:always"></div>';case"kpis":{if(!t.items.length)return"";const l=Math.min(t.items.length,o?5:4);return`<section>${e}<div class="kpis" style="--n:${l}">${t.items.map(r=>`<div class="kpi"><div class="k">${a(r.label)}</div><div class="val"${p(String(r.value??""))}>${a(b(r.value,r.format,s)||"—")}</div>${r.hint?`<div class="hint ${r.tone??""}">${a(r.hint)}</div>`:""}</div>`).join("")}</div></section>`}case"keyValue":{if(!t.items.length)return"";const l=t.columns??(o?3:2);return`<section>${e}<div class="kv" style="grid-template-columns:repeat(${l},1fr)">${t.items.map(r=>{const g=b(r.value,r.format,s)||"—";return`<div><div class="k">${a(r.label)}</div><div class="v"${p(g)}>${a(g)}</div></div>`}).join("")}</div></section>`}case"text":return t.text.trim()?`<section class="text">${e}${t.text.split(/\n{2,}/).map(l=>`<p${p(l)}>${a(l)}</p>`).join("")}</section>`:"";case"chart":{if(!H(t.chart))return`<section class="chart">${e}${h}<div class="empty">No data available for this chart.</div></section>`;const l=t.chart.type==="pie"||t.chart.type==="donut",r=t.chart.type==="hbar"?t.chart.categories.length*Math.max(1,t.chart.series.length):0,g=l?Math.max(250,Math.min(420,t.chart.categories.length*22+40)):t.chart.type==="hbar"?Math.max(200,Math.min(620,r*24+30)):300,f=Math.round(g*(t.height??1)*(o&&!l?.88:1)),m=o&&!l?1040:760;return`<section class="chart">${e}${h}<div style="${l?"max-width:182mm":""}">${A(t.chart,s,m,f)}</div></section>`}case"table":return`<section>${e}${h}${L(t,s)}</section>`}}function X(t,s){const o=T(t)==="landscape",e=s.company,h=[e.phone&&`Phone: ${e.phone}`,e.email&&`Email: ${e.email}`].filter(Boolean).map(a).join("&nbsp;&nbsp;|&nbsp;&nbsp;"),l=`<header class="doc-head">
    <div>
      ${e.nameLocal?`<div class="co-local" dir="auto"${/[\u0600-\u06FF]/.test(e.nameLocal)?' lang="ar"':""}>${a(e.nameLocal)}</div>`:""}
      ${e.name?`<div class="co-name">${a(e.name)}</div>`:""}
      ${e.address?`<div class="co-line"${p(e.address)}>${a(e.address)}</div>`:""}
      ${h?`<div class="co-line">${h}</div>`:""}
      ${e.trn?`<div class="co-trn">TRN: ${a(e.trn)}</div>`:""}
    </div>
    ${e.logo?`<img class="logo" src="${e.logo.dataUrl}" alt=""/>`:""}
  </header>`,r=_(t,s).map(m=>`<div><div class="k">${a(m.label)}</div><div class="v"${p(m.value)}>${a(m.value)}</div></div>`).join(""),g=M(t)?'<div class="empty big"><b>No data available</b>There are no records for the selected period and filters.</div>':t.sections.map(m=>P(m,s,o)).join(""),f=[t.title,e.name].filter(Boolean).join("  ·  ");return`<!doctype html><html><head><meta charset="utf-8"/><title>${a(t.title)}</title><style>${F(o,f)}</style></head><body>
    ${l}
    <h1${p(t.title)}>${a(t.title)}</h1>
    ${t.subtitle?`<div class="subtitle">${a(t.subtitle)}</div>`:""}
    <div class="info">${r}</div>
    ${g}
  </body></html>`}function S(t,s){E(X(t,s))}export{X as buildReportPrintHtml,S as printReport};
