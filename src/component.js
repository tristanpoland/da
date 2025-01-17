
/*CPS stuff*/
let all = (s, ...x) => x.reduce((f, g) => (...x) => f(g(...x)), s);
let id = (x) => x;

let to_cps = (fn) => (nxt) => (...x) => nxt(fn(...x));
let un_cps = (fn) => fn(id);




/*CSS stuff*/
let gen_sheet = document.createElement("style");
document.head.appendChild(gen_sheet);
let gen_styles = gen_sheet.sheet;

let gen_rule = (sel, style) => gen_styles.insertRule(`${sel} { ${Object.entries(style).map(v=>v[0].replace(/([A-Z])/g,"-$1") + ":" + v[1]).join(";")}; } \n`);
let gen_class = (name, style) => gen_rule("." + name, style);

gen_class("border", {
	"border-color": "grey",
	"border-style": "solid",
	"border-radius": "0.5em",
	"border-width": "0.1em",
	"padding": "0.45em",
	"margin": "0.45em",
	"overflow": "visible",
	"width": "calc(100% - 2*(0.45em) - 2*(0.1em) - 2*(0.45em))",
	"height": "calc(100% - 2*(0.45em) - 2*(0.1em) - 2*(0.45em))"
});

gen_class("vpart", {
	"display": "flex",
	"flex-direction": "column"
});

gen_class("hpart", {
	"display": "flex",
	"flex-direction": "row"
});

gen_class("partBlock", {
	"flex": "1"
});

gen_class("Block", {
	"min-height": "100%",
	"width": "100%",
	"padding": "0",
	"margin": "0",
	"border": "0"
});

gen_rule("body", {
	"color": "grey",
	"width": "100vw",
	"height": "100vh",
	"margin": "0",
	"padding": "0",
	"overflow": "hidden",
	"font-size": "12px"
});

gen_rule("*", {
	"touch-action": "none"
});



let el = (type) => to_cps(() => document.createElement(type));

let Children = (...x) => to_cps((el) => {
	el.replaceChildren(...x.filter(v => v != null).map(v => un_cps(v)()));
	return el;
});

let Style = (style) => to_cps((el) => {
	Object.entries(style).forEach(v=>el.style[v[0]] = v[1])
	return el;
});

let Class = (cl) => to_cps((el) => {
	el.classList.add(cl);
	return el;
});

let Text = (text) => to_cps((el) => {
	el.innerText = text;
	return el;
});

let Attr = (name, value) => to_cps((el) => {
	el[name] = value;
	return el;
});

let Event = (name, cb) => to_cps((el) => {
	el.addEventListener(name, cb);
	return el;
});








let col = (...nd) => all(
	Block(el("div")),
	Children(...nd)
)

let row = (...nd) => all(
  Block(el("div")),
  Style({ whiteSpace: "nowrap" }),
  Children(...nd.map(v=>
    all(
      v,
      Style({
	      display: "inline-block",
	      whiteSpace: "wrap"
      })
    )
  ))
);

let Overlap = (...nd) => all(
  Block(el("div")),
  Style({position: "relative"}),
  Children(...nd.map(v=>
    all(
      v,
      Style({position: "absolute"}))
    )
  )
);

let Button = (nd, cb) => all(
  nd,
  Style({userSelect: "none", cursor: "pointer"}),
  Event("click", cb)
);


let vpart = (...w) => (...nd) => all(
  Block(el("div")),
  Class("vpart"),
  Children(...nd.map((v,i)=>
    w[i] != null
      ? Rect(null, w[i])(v)
      : all(Block(el("div")), Class("partBlock"), Children(v))
  ))
);

let hpart = (...w) => (...nd) => all(
  Block(el("div")),
  Class("hpart"),

  Children(...nd.map((v,i)=>
    w[i] != null
      ? Rect(w[i], null)(v)
      : all(Block(el("div")), Class("partBlock"), Children(v))
  )));

let Center = (w, h) => nd =>
vpart(null, h, null)(
  null,
  hpart(null, w, null)(
    null,
    nd,
    null
  ),
  null
);

let Body = nd => all(
  el("body"),
  Children(nd)
);

let Block = nd => all(
  nd,
  Class("Block"),
);

let Rect = (w, h) => nd => all(
  Block(el("div")),
  Style({
    width: `calc(${w})`,
    height: `calc(${h})`,
    "min-height": "auto"
  }),
  Children(nd)
);

let Scroll = nd => all(
    Rect("100%", "100%")(el("div")),
    Style({overflow: "auto"}),
    Children(nd)
);

let ScrollX = nd => all(
    Rect("100%", "100%")(el("div")),
    Style({overflow: "visible", overflowX: "auto"}),
    Children(nd)
);

let ScrollY = nd => all(
    Rect("100%", "100%")(el("div")),
    Style({overflow: "visible", overflowY: "auto"}),
    Children(nd)
);











let Border = nd => all(
  el("div"),
  Class("border"),
  Children(nd)
);

let vresize = nd => all(
  Block(el("div")),
  Style({
    resize: "vertical",
    maxHeight: "100%"
  }),
  Children(nd)
);

let hresize = nd => all(
  Block(el("div")),
  Style({
    resize: "horizontal",
    maxWidth: "100%"
  }),
  Children(nd)
);

