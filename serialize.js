/* Превращает данные скрипта обратно в текст файла data.js.
   Используется редактором (admin.html). */
function serializeData(d){
  const j = v => JSON.stringify(v);
  const pretty = v => JSON.stringify(v, null, 2);
  const steps = Object.entries(d.S).map(([id, st]) => {
    const lines = [];
    for (const k of Object.keys(st)) {
      if (k === "opts") {
        const o = st.opts || [];
        lines.push('    "opts": [' + (o.length ? "\n" + o.map(x => "      " + j(x)).join(",\n") + "\n    ]" : "]"));
      } else {
        lines.push("    " + j(k) + ": " + j(st[k]));
      }
    }
    return "  " + j(id) + ": {\n" + lines.join(",\n") + "\n  }";
  });
  const blocks = list => "[\n" + list.map(b => "  " + j(b)).join(",\n") + "\n]";
  return [
    "/* Данные скрипта оператора П5 и П6.",
    "   Удобнее всего править через редактор: откройте admin.html на сайте.",
    "   S       — шаги скрипта",
    "   DOCTORS — вкладка «Врачи» (p5 и p6)",
    "   ODD     — вкладка «Нестандартное»",
    "   MEMO    — вкладка «Памятка»",
    "   HELP    — руководство для операторов (кнопка «?») */",
    "",
    "const S = {\n" + steps.join(",\n") + "\n};",
    "",
    "const DOCTORS = {\n\"p5\": " + blocks(d.DOCTORS.p5) + ",\n\"p6\": " + blocks(d.DOCTORS.p6) + "\n};",
    "",
    "const ODD = " + pretty(d.ODD) + ";",
    "",
    "const MEMO = " + blocks(d.MEMO) + ";",
    "",
    "const HELP = " + blocks(d.HELP || []) + ";",
    ""
  ].join("\n");
}
if (typeof module !== "undefined") module.exports = { serializeData };
