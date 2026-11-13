/* ============================================================
   ЛОГИКА
   ============================================================ */
const state = {cur:"start", line:null, hist:[], tab:"doc"};
const $ = s => document.querySelector(s);
const esc = s => s.replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const fmt = s => esc(s).replace(/\[([^\]]+)\]/g,'<span class="ph">[$1]</span>');

function pick(v){
  if(!v) return [];
  if(typeof v === "string") return [v];
  const out=[]; if(v.a) out.push(v.a);
  if(state.line && v[state.line]) out.push(v[state.line]);
  if(!state.line){ if(v.p5) out.push("П5: "+v.p5); if(v.p6) out.push("П6: "+v.p6); }
  return out;
}
function paras(list){ return list.flatMap(x=>x.split("\n")).map(p=>`<p>${fmt(p)}</p>`).join(""); }

function render(){
  const st = S[state.cur];
  const card = $("#card");
  card.className = "card" + (st.danger ? " danger" : state.line ? " "+state.line : "");
  const say = pick(st.say), note = pick(st.note);
  const opts = (st.opts||[]).filter(o => !(o[2]&&o[2].only&&o[2].only!==state.line));
  let h = `<p class="kicker">${esc(st.kick||"")}</p><h1>${esc(st.t)}</h1>`;
  if(say.length) h += `<div class="block say ${st.danger?"":""}"><h3>Скажите пациенту <button class="copy" type="button" data-copy>Копировать</button></h3>${paras(say)}</div>`;
  if(note.length) h += `<div class="block ${st.danger&&!say.length?"danger-block":"note"}"><h3>Оператору</h3>${paras(note)}</div>`;
  if(opts.length){
    h += `<p class="q">${opts.length>1?"Что ответил пациент / что дальше:":"Следующий шаг:"}</p><div class="opts">`;
    opts.forEach((o,i)=>{
      const x=o[2]||{}; const k=i<9?String(i+1):(i===9?"0":"");
      const cls = x.line ? x.line : x.end ? "end" : "";
      h += `<button type="button" class="opt ${cls}" data-i="${i}">${k&&!x.line?`<span class="k">${k}</span>`:""}<span>${esc(o[0])}${x.sub?`<small>${esc(x.sub)}</small>`:""}</span></button>`;
    });
    h += `</div>`;
  }
  h += `<p class="hint">Клавиши 1–9 выбирают вариант, Backspace — назад, / — поиск.</p>`;
  card.innerHTML = h;
  card.querySelectorAll(".opt").forEach(b=>b.onclick=()=>choose(opts[+b.dataset.i]));
  const cb = card.querySelector("[data-copy]");
  if(cb) cb.onclick = async ()=>{ try{ await navigator.clipboard.writeText(say.join("\n")); cb.textContent="Скопировано"; }catch(e){ cb.textContent="Не удалось"; } };
  card._opts = opts;
  // trail
  const tr = state.hist.map((h,i)=>`<button type="button" data-h="${i}">${esc(S[h.cur].t)}</button><span class="sep">›</span>`).join("");
  $("#trail").innerHTML = tr + `<strong>${esc(st.t)}</strong>`;
  $("#trail").querySelectorAll("[data-h]").forEach(b=>b.onclick=()=>jumpBack(+b.dataset.h));
  // chip
  const chip=$("#lineChip");
  chip.className="chip"+(state.line?" "+state.line:"");
  chip.textContent= state.line==="p5"?"П5 · Уральская 14, Абая 22а": state.line==="p6"?"П6 · Абая 111, Юбилейный 62":"Линия не выбрана";
  $("#backBtn").disabled = !state.hist.length;
  renderPane();
}

function choose(o){
  const [label, go, x={}] = o;
  if(go==="NEW") return newCall();
  if(go.startsWith("PANEL:")){ state.tab=go.slice(6); renderPane(); $("#pane").scrollTop=0; return; }
  state.hist.push({cur:state.cur, line:state.line});
  if(x.line) state.line = x.line;
  state.cur = go;
  render();
  $("#card").focus({preventScroll:true});
  window.scrollTo({top:0});
}
function back(){ if(!state.hist.length) return; const h=state.hist.pop(); state.cur=h.cur; state.line=h.line; render(); }
function jumpBack(i){ const h=state.hist[i]; state.hist=state.hist.slice(0,i); state.cur=h.cur; state.line=h.line; render(); }
function newCall(){ state.cur="start"; state.line=null; state.hist=[]; render(); window.scrollTo({top:0}); }


/* ============================================================
   ОТПУСКА И БОЛЬНИЧНЫЕ ВРАЧЕЙ (ABSENT в data.js)
   Показываются сами по сегодняшней дате: сейчас + за 7 дней до начала. После даты «по» исчезают.
   ============================================================ */
const ABS = (typeof ABSENT!=="undefined" && Array.isArray(ABSENT)) ? ABSENT : [];
const ymd = d => d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
const TODAY = ymd(new Date());
const plusDays = (s,n) => { const d=new Date(s+"T12:00:00"); d.setDate(d.getDate()+n); return ymd(d); };
const dm = s => s ? s.slice(8,10)+"."+s.slice(5,7) : "";
const ABS_WORD = {"Отпуск":"в отпуске","Больничный":"на больничном","Без содержания":"в отпуске без содержания","Учёба":"на учёбе","Другое":"нет на работе"};
function absFor(line){
  const soon=plusDays(TODAY,7);
  return ABS.filter(a=>a&&a.who&&a.line===line&&a.from&&a.to&&a.to>=TODAY&&a.from<=soon)
    .map(a=>Object.assign({},a,{now:a.from<=TODAY}))
    .sort((x,y)=>(y.now-x.now)||x.from.localeCompare(y.from)||x.who.localeCompare(y.who));
}
function absPhrase(a){ const w=ABS_WORD[a.kind]||"нет на работе"; return a.now ? `${w} до ${dm(a.to)}` : `с ${dm(a.from)} ${w} (до ${dm(a.to)})`; }
const surname = who => (who||"").trim().split(/\s+/).slice(0,2).join(" "); /* фамилия + имя: однофамильцы (Искакова А. и Искакова М.) не путаются */
function absBoxHtml(line){
  const list=absFor(line); if(!list.length) return "";
  const item=a=>`<div class="abs-item ${a.now?"now":"soon"}"><b>${esc(a.who)}</b> — ${esc(absPhrase(a))}${a.note?`<span class="abs-note">${esc(a.note)}</span>`:""}</div>`;
  const now=list.filter(a=>a.now), soon=list.filter(a=>!a.now);
  return `<div class="absbox">${now.length?`<p class="abs-h">Сейчас нет на работе</p>${now.map(item).join("")}`:""}${soon.length?`<p class="abs-h soon">Скоро уходят</p>${soon.map(item).join("")}`:""}</div>`;
}
function markAbsent(p,line){
  absFor(line).forEach(a=>{ const sn=surname(a.who); if(!sn) return;
    p.querySelectorAll("tr").forEach(tr=>{ const td=[...tr.querySelectorAll("td")].find(c=>c.textContent.includes(sn)); if(!td||td.querySelector(".absbadge")) return;
      td.insertAdjacentHTML("beforeend",` <span class="absbadge ${a.now?"now":"soon"}">${esc(absPhrase(a))}</span>`); });
  });
}
function updateDocTab(){ const n=state.line?absFor(state.line).filter(a=>a.now).length:0; $("#tab-doc").innerHTML="Врачи"+(n?` <span class="tabcount" title="Сейчас нет на работе: ${n}">${n}</span>`:""); }
function secLabel(h){
  let t=h.replace(/\s*\([^)]*\)/g,"").replace(/\s+П[56]$/,"").trim();
  const parts=t.split(" · ");
  if(parts.length>1) t=/^(Уральская|Абая|Юбилейный)/.test(parts[0])?parts[1]:parts[0];
  return t;
}
/* Вкладка «Врачи»: быстрая навигация по разделам + сам справочник */
function showDocs(list,line){
  const p=$("#pane");
  const secs=(list||[]).filter(b=>b.h!=null).map(b=>b.h);
  p.innerHTML=(secs.length>1?`<div class="qnav" role="navigation" aria-label="Разделы справочника">${secs.map((h,i)=>`<button type="button" data-s="${i}" title="${esc(h)}">${esc(secLabel(h))}</button>`).join("")}</div>`:"")+(line?absBoxHtml(line):"")+blocksHtml(list);
  if(line) markAbsent(p,line);
  const hs=[...p.querySelectorAll("h4[data-sec]")];
  const btns=[...p.querySelectorAll(".qnav button")];
  btns.forEach(b=>b.onclick=()=>{const h=hs[+b.dataset.s]; if(h) h.scrollIntoView({block:"start",behavior:"smooth"});});
  const mark=()=>{ const nav=p.querySelector(".qnav"); if(!nav) return; const top=p.getBoundingClientRect().top+nav.offsetHeight+8; let cur=0; hs.forEach((h,i)=>{ if(h.getBoundingClientRect().top<=top+4) cur=i; }); btns.forEach((b,i)=>b.setAttribute("aria-current",String(i===cur))); };
  const nv=p.querySelector(".qnav"); if(nv) p.style.setProperty("--qnav-h",(nv.offsetHeight+8)+"px");
  p.onscroll=mark; mark();
}
function renderPane(){
  updateDocTab();
  ["doc","odd","memo"].forEach(t=>$("#tab-"+t).setAttribute("aria-selected", String(state.tab===t)));
  const p=$("#pane");
  if(state.tab==="doc"){
    if(state.line) showDocs(DOCTORS[state.line],state.line);
    else { p.onscroll=null; p.innerHTML = `<p class="empty">Выберите П5 или П6 в скрипте — здесь появятся врачи этой поликлиники.</p><p><button class="btn" type="button" data-l="p5">Показать П5</button> <button class="btn" type="button" data-l="p6">Показать П6</button></p>`; }
    p.querySelectorAll("[data-l]").forEach(b=>b.onclick=()=>showDocs(DOCTORS[b.dataset.l],b.dataset.l));
  } else if(state.tab==="odd"){
    p.onscroll=null;
    const q = (p.querySelector(".search")||{}).value || "";
    p.innerHTML = `<input class="search" id="oddSearch" type="search" placeholder="Поиск: БЛ, снимок, отпуск, полиция…" value="${esc(q)}"><div id="oddList"></div>`;
    const inp=p.querySelector("#oddSearch");
    const draw=()=>{
      const s=inp.value.trim().toLowerCase(); let h="";
      ODD.forEach(([g,items])=>{
        const f=items.filter(([a,b])=>!s||(a+" "+b).toLowerCase().includes(s));
        if(f.length){ h+=`<p class="grp">${esc(g)}</p>`+f.map(([a,b])=>`<details${s?" open":""}><summary>${esc(a)}</summary><div>${fmt(b)}</div></details>`).join(""); }
      });
      $("#oddList").innerHTML = h || `<p class="empty">Ничего не нашлось. Не придумываем ответ — оформите запрос в группу.</p>`;
    };
    inp.oninput=draw; draw();
  } else {
    p.onscroll=null; p.innerHTML = blocksHtml(MEMO);
  }
}

/* ============================================================
   ПОИСК ПО ВСЕМУ СКРИПТУ
   ============================================================ */
const norm = s => String(s||"").toLowerCase().replace(/ё/g,"е");
const txt = v => !v ? {a:"",p5:"",p6:""} : typeof v==="string" ? {a:v,p5:"",p6:""} : {a:v.a||"",p5:v.p5||"",p6:v.p6||""};
let IDX = null;
function buildIndex(){
  const out=[];
  for(const [id,st] of Object.entries(S)){
    const sa=txt(st.say), no=txt(st.note);
    out.push({kind:"Шаги скрипта", title:st.t, sub:st.kick||"", parts:{a:sa.a+"\n"+no.a, p5:sa.p5+"\n"+no.p5, p6:sa.p6+"\n"+no.p6}, act:{step:id}});
  }
  const blocks=(list,kind,line,tab)=>{
    let h="", tr=0, pi=0, hi=0, li=0, ti=0;
    (list||[]).forEach(b=>{
      if(b.h!=null){ h=b.h; out.push({kind,title:b.h,sub:"",parts:{a:""},line,act:{tab,line,sel:"h4",n:hi++}}); }
      else if(b.p!=null){ b.p.split("\n").forEach(line_=>{ out.push({kind,title:h||kind,sub:"",parts:{a:line_.replace(/\*\*/g,"")},line,act:{tab,line,sel:"p",n:pi++}}); }); }
      else if(b.list!=null){ b.list.split("\n").filter(x=>x.trim()).forEach(x=>out.push({kind,title:h||kind,sub:"",parts:{a:x.replace(/\*\*/g,"")},line,act:{tab,line,sel:"li",n:li++}})); }
      else if(b.tip!=null||b.warn!=null){ out.push({kind,title:h||kind,sub:"",parts:{a:(b.tip||b.warn).replace(/\*\*/g,"")},line,act:{tab,line,sel:".tipb",n:ti++}}); }
      else if(b.table){ const head=b.table.head||[]; const ni=head.findIndex(x=>/врач|фио/i.test(x));
        (b.table.rows||[]).forEach(r=>{ const name=ni>=0?r[ni]:(/участ/i.test(head[0]||"")&&r[0]?"Участки "+r[0]:r.find(c=>c&&c!=="—")||""); out.push({kind,title:name||h,sub:h,parts:{a:r.map((c,i)=>(head[i]?head[i]+": ":"")+(c||"")).join(" · ")},line,act:{tab,line,sel:"tr",n:tr++}}); }); }
    });
  };
  blocks(DOCTORS.p5,"Врачи П5","p5","doc");
  blocks(DOCTORS.p6,"Врачи П6","p6","doc");
  ODD.forEach(([g,items])=>items.forEach(([q,a])=>out.push({kind:"Нестандартное",title:q,sub:g,parts:{a},act:{tab:"odd",q}})));
  blocks(MEMO,"Памятка",null,"memo");
  ["p5","p6"].forEach(l=>absFor(l).forEach((x,i)=>out.push({kind:l==="p5"?"Врачи П5":"Врачи П6",title:x.who,sub:"Отпуска и больничные",parts:{a:absPhrase(x)+(x.note?" · "+x.note:"")},line:l,act:{tab:"doc",line:l,sel:".abs-item",n:i}})));
  out.forEach(e=>e.ntitle=norm(e.title+" "+e.sub));
  return out;
}
function textFor(e){ const p=e.parts; if(e.act.step){ if(state.line) return (p.a+"\n"+(p[state.line]||"")).trim(); return [p.a,p.p5,p.p6].filter(x=>x&&x.trim()).join("\n"); } return p.a; }
function hl(s,toks){ let h=esc(s); toks.forEach(t=>{ if(!t)return; const re=new RegExp("("+t.replace(/[.*+?^${}()|[\]\\]/g,"\\$&").replace(/е/g,"[её]")+")","gi"); h=h.replace(re,"<mark>$1</mark>"); }); return h; }
function snippet(text,toks){
  const flat=text.replace(/\s*\n\s*/g," · ").trim(); if(!flat) return "";
  const n=norm(flat); let i=-1; for(const t of toks){ const j=n.indexOf(t); if(j>=0&&(i<0||j<i)) i=j; }
  if(i<0) return flat.length>110?flat.slice(0,110)+"…":flat;
  const st=Math.max(0,i-40); const en=Math.min(flat.length,i+90);
  return (st>0?"…":"")+flat.slice(st,en)+(en<flat.length?"…":"");
}
function runSearch(q){
  if(!IDX) IDX=buildIndex();
  const stem=t=>/^[а-я]+$/.test(t)?(t.length>6?t.slice(0,-2):t.length>4?t.slice(0,-1):t):t; /* «участок» найдёт и «участки», «жазиры» — «Жазира» */
  const toks=norm(q).split(/[\s,]+/).filter(Boolean).map(stem);
  if(!toks.length) return {toks,res:[]};
  const res=[];
  for(const e of IDX){
    if(e.line && state.line && e.line!==state.line) continue;
    const body=textFor(e); const hay=e.ntitle+" "+norm(body);
    if(!toks.every(t=>hay.includes(t))) continue;
    let sc=0; toks.forEach(t=>{ sc += e.ntitle.includes(t)?3:1; }); if(e.act.step) sc+=0.5;
    res.push({e,sc,body});
  }
  res.sort((a,b)=>b.sc-a.sc);
  return {toks,res:res.slice(0,40)};
}
const gs={sel:0,items:[]};
function drawSearch(){
  const q=$("#gsq").value; const box=$("#gsr");
  if(!q.trim()){ box.hidden=true; $("#gsq").setAttribute("aria-expanded","false"); return; }
  const {toks,res}=runSearch(q);
  gs.items=res; gs.sel=0;
  if(!res.length){ gs.order=[]; box.innerHTML=`<p class="empty">Ничего не нашлось. Попробуйте другое слово или посмотрите «Нестандартное».</p>`; }
  else{
    const order=[...new Set(res.map(r=>r.e.kind))]; /* группа с самым подходящим результатом — первой */ let h=""; let k=0;
    order.forEach(kind=>{ const g=res.filter(r=>r.e.kind===kind); if(!g.length) return;
      h+=`<p class="gh">${esc(kind)}</p>`;
      g.forEach(r=>{ const sn=snippet(r.body,toks); const i=res.indexOf(r);
        h+=`<button type="button" class="gi" role="option" data-i="${i}" aria-selected="false"><b>${hl(r.e.title||"",toks)}</b>${r.e.sub&&r.e.sub!==r.e.title?`<span class="tag">${esc(r.e.sub)}</span>`:""}${sn?`<small>${hl(sn,toks)}</small>`:""}</button>`; k++; });
    });
    box.innerHTML=h;
    box.querySelectorAll(".gi").forEach(b=>{ b.onmousedown=e=>e.preventDefault(); b.onclick=()=>openResult(gs.items[+b.dataset.i]); });
    // порядок на экране может отличаться от порядка в res — выбираем по экрану
    gs.order=[...box.querySelectorAll(".gi")].map(b=>+b.dataset.i);
    markSel();
  }
  box.hidden=false; $("#gsq").setAttribute("aria-expanded","true");
}
function markSel(){ const btns=[...$("#gsr").querySelectorAll(".gi")]; btns.forEach((b,i)=>b.setAttribute("aria-selected",String(i===gs.sel))); if(btns[gs.sel]) btns[gs.sel].scrollIntoView({block:"nearest"}); }
function closeSearch(clear){ $("#gsr").hidden=true; $("#gsq").setAttribute("aria-expanded","false"); if(clear){ $("#gsq").value=""; } }
function flash(el){ if(!el) return; el.classList.add("hl"); el.scrollIntoView({block:"center",behavior:"smooth"}); setTimeout(()=>el.classList.remove("hl"),2500); }
function openResult(r){
  if(!r) return; const a=r.e.act; closeSearch(false); $("#gsq").blur();
  if(a.step){
    if(a.step!==state.cur){ state.hist.push({cur:state.cur,line:state.line}); state.cur=a.step; render(); }
    window.scrollTo({top:0}); return;
  }
  state.tab=a.tab; renderPane();
  const p=$("#pane");
  if(a.tab==="doc" && a.line && !state.line) showDocs(DOCTORS[a.line],a.line);
  if(a.tab==="odd"){ const inp=$("#oddSearch"); inp.value=a.q; inp.oninput(); flash(p.querySelector("details")); }
  else { const els = a.sel==="tr" ? [...p.querySelectorAll("tr")].filter(t=>t.querySelector("td")) : [...p.querySelectorAll(a.sel)]; flash(els[a.n]); }
  if(window.innerWidth<=980) p.scrollIntoView({behavior:"smooth"});
}
$("#gsq").addEventListener("input",drawSearch);
$("#gsq").addEventListener("focus",()=>{ if($("#gsq").value.trim()) drawSearch(); });
$("#gsq").addEventListener("blur",()=>setTimeout(()=>closeSearch(false),120));
$("#gsq").addEventListener("keydown",e=>{
  const n=(gs.order||[]).length;
  if(e.key==="ArrowDown"){ e.preventDefault(); if(n){gs.sel=(gs.sel+1)%n;markSel();} }
  else if(e.key==="ArrowUp"){ e.preventDefault(); if(n){gs.sel=(gs.sel-1+n)%n;markSel();} }
  else if(e.key==="Enter"){ e.preventDefault(); if(n) openResult(gs.items[gs.order[gs.sel]]); }
  else if(e.key==="Escape"){ e.preventDefault(); closeSearch(true); $("#gsq").blur(); }
});
["doc","odd","memo"].forEach(t=>$("#tab-"+t).onclick=()=>{state.tab=t;renderPane();});
$("#backBtn").onclick=back;
$("#newBtn").onclick=newCall;
document.addEventListener("keydown",e=>{
  if((e.key==="k"||e.key==="K"||e.key==="л"||e.key==="Л")&&(e.ctrlKey||e.metaKey)){ e.preventDefault(); $("#gsq").focus(); $("#gsq").select(); return; }
  if(e.target.closest("input,textarea")) return;
  if(e.key==="/"||e.key==="."&&e.code==="Slash"){ e.preventDefault(); $("#gsq").focus(); return; }
  if(e.ctrlKey||e.metaKey||e.altKey) return;
  const opts=$("#card")._opts||[];
  if(/^[0-9]$/.test(e.key)){
    const i = e.key==="0"?9:(+e.key-1);
    if(opts[i]){ e.preventDefault(); choose(opts[i]); }
  } else if(e.key==="Backspace"){ e.preventDefault(); back(); }
});
$("#card").tabIndex=-1;
render();
