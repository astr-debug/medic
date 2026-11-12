/* ============================================================
   ЛОГИКА
   ============================================================ */
const state = {cur:"start", line:null, hist:[], t0:Date.now(), tab:"doc"};
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
  h += `<p class="hint">Клавиши 1–9 выбирают вариант, Backspace — назад.</p>`;
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
function newCall(){ state.cur="start"; state.line=null; state.hist=[]; state.t0=Date.now(); render(); window.scrollTo({top:0}); }

function renderPane(){
  ["doc","odd","memo"].forEach(t=>$("#tab-"+t).setAttribute("aria-selected", String(state.tab===t)));
  const p=$("#pane");
  if(state.tab==="doc"){
    if(state.line) p.innerHTML = DOCTORS[state.line];
    else p.innerHTML = `<p class="empty">Выберите П5 или П6 в скрипте — здесь появятся врачи этой поликлиники.</p><p><button class="btn" type="button" data-l="p5">Показать П5</button> <button class="btn" type="button" data-l="p6">Показать П6</button></p>`;
    p.querySelectorAll("[data-l]").forEach(b=>b.onclick=()=>{p.innerHTML=DOCTORS[b.dataset.l];});
  } else if(state.tab==="odd"){
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
    p.innerHTML = MEMO;
  }
}
["doc","odd","memo"].forEach(t=>$("#tab-"+t).onclick=()=>{state.tab=t;renderPane();});
$("#backBtn").onclick=back;
$("#newBtn").onclick=newCall;
document.addEventListener("keydown",e=>{
  if(e.target.closest("input,textarea")) return;
  if(e.ctrlKey||e.metaKey||e.altKey) return;
  const opts=$("#card")._opts||[];
  if(/^[0-9]$/.test(e.key)){
    const i = e.key==="0"?9:(+e.key-1);
    if(opts[i]){ e.preventDefault(); choose(opts[i]); }
  } else if(e.key==="Backspace"){ e.preventDefault(); back(); }
});
setInterval(()=>{const s=Math.floor((Date.now()-state.t0)/1000);$("#timer").textContent=String(Math.floor(s/60)).padStart(2,"0")+":"+String(s%60).padStart(2,"0");},1000);
$("#card").tabIndex=-1;
render();
