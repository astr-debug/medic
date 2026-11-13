/* Общий показ блоков (врачи, памятка, руководство операторам).
   Типы блоков: {h} заголовок, {p} текст, {list} список (пункт с новой строки),
   {tip} зелёная подсказка, {warn} жёлтое «важно», {table:{head,rows}} таблица.
   В тексте: **жирный**, [подставить] — подсвечивается. */
function bEsc(s){ return String(s==null?"":s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c])); }
function bRich(s){ return bEsc(s).replace(/\*\*(.+?)\*\*/g,"<b>$1</b>").replace(/\[([^\]]+)\]/g,'<span class="ph">[$1]</span>'); }
function blocksHtml(list,opt){
  opt=opt||{}; const H=opt.h||"h4";
  return (list||[]).map((b,bi)=>{
    if(b.h!=null) return `<${H} data-sec${opt.ids?` id="s${bi}"`:""}>${bEsc(b.h)}</${H}>`;
    if(b.p!=null) return b.p.split("\n").map(x=>`<p>${bRich(x)}</p>`).join("");
    if(b.list!=null) return `<ul class="blist">${b.list.split("\n").filter(x=>x.trim()).map(x=>`<li>${bRich(x)}</li>`).join("")}</ul>`;
    if(b.tip!=null) return `<div class="tipb">${b.tip.split("\n").map(bRich).join("<br>")}</div>`;
    if(b.warn!=null) return `<div class="tipb warn">${b.warn.split("\n").map(bRich).join("<br>")}</div>`;
    if(b.table){
      const head=b.table.head||[]; const u=head.findIndex(x=>/участ/i.test(x)); const tl=head.findIndex(x=>/телефон|номер/i.test(x));
      return `<table>${head.length?`<tr>${head.map(x=>`<th>${bEsc(x)}</th>`).join("")}</tr>`:""}${(b.table.rows||[]).map(r=>`<tr>${r.map((c,i)=>`<td${i===u?' class="u"':i===tl?' class="tel"':""}>${i===tl?(c||"").split(/,\s*|\s+\/\s+|;\s*/).filter(Boolean).map(x=>`<span class="nw">${bRich(x)}</span>`).join("<br>"):bRich(c||"")}</td>`).join("")}</tr>`).join("")}</table>`;
    }
    return "";
  }).join("");
}
