var $ = function (i) {
  return document.getElementById(i);
};
var cvs = $("mainCvs"),
  ctx = cvs.getContext("2d", { willReadFrequently: true });
var ovC = $("ovCvs"),
  ovCtx = ovC.getContext("2d");
function clmp(v, a, b) {
  return v < a ? a : v > b ? b : v;
}
function fmtB(b) {
  if (b < 1024) return b + " B";
  if (b < 1048576) return (b / 1024).toFixed(1) + " KB";
  return (b / 1048576).toFixed(2) + " MB";
}
var S = {
  layers: [],
  ai: -1,
  cw: 800,
  ch: 600,
  mode: "magic",
  tol: 50,
  brushSz: 20,
  tgt: { r: 255, g: 255, b: 255 },
  picking: false,
  erDown: false,
  erCol: { r: 0, g: 0, b: 0 },
  paintDown: false,
  adj: { br: 0, co: 0, sa: 0, hu: 0, te: 0, vi: 0, bl: 0 },
  fmt: "png",
  qual: 92,
  zoom: 1,
  raf: null,
  dlURL: null,
  hist: [],
  hi: -1,
  nid: 1,
  drag: null,
  gridOn: false,
  shapeType: "rect",
  grad: { type: "none", c1: "#0a0a0c", c2: "#00e5a0", angle: 0 },
};
var crop = { on: false, sel: false, sx: 0, sy: 0, ex: 0, ey: 0, rect: null };
var PRESETS = {
  normal: { br: 0, co: 0, sa: 0, hu: 0, te: 0, vi: 0, bl: 0 },
  vintage: { br: 8, co: 15, sa: -35, hu: 20, te: 25, vi: 35, bl: 0 },
  bw: { br: 5, co: 25, sa: -100, hu: 0, te: 0, vi: 0, bl: 0 },
  warm: { br: 5, co: 10, sa: 15, hu: 0, te: 35, vi: 0, bl: 0 },
  cool: { br: 0, co: 10, sa: 5, hu: 0, te: -35, vi: 0, bl: 0 },
  drama: { br: -10, co: 45, sa: 25, hu: 0, te: -10, vi: 45, bl: 0 },
};
var EMOJIS = [
  "😀",
  "😂",
  "😍",
  "🥺",
  "🤔",
  "😎",
  "👍",
  "👏",
  "🙌",
  "💪",
  "❤️",
  "🔥",
  "⭐",
  "✨",
  "🎉",
  "🏆",
  "🎵",
  "📸",
  "🖼️",
  "🎨",
  "✏️",
  "💡",
  "🌈",
  "☀️",
  "🌙",
  "🏠",
  "🌍",
  "⚡",
  "💎",
  "🦋",
  "🌺",
  "🍕",
  "🎮",
  "🚀",
  "🎯",
  "💖",
  "👻",
  "🤖",
  "🦄",
  "🐱",
  "🐶",
  "🌸",
  "🍀",
  "🍉",
  "🎸",
  "👑",
  "🎪",
];
function toggleTheme() {
  var d = document.documentElement.getAttribute("data-theme") === "dark";
  document.documentElement.setAttribute("data-theme", d ? "light" : "dark");
  $("themeBtn").textContent = d ? "☀️" : "🌙";
  toast("Tema " + (d ? "claro" : "escuro"), "info");
}
function mkL(nm, c, x, y, w, h) {
  return {
    id: S.nid++,
    name: nm,
    cvs: c,
    origCvs: null,
    x: x,
    y: y,
    w: w,
    h: h,
    opacity: 1,
    visible: true,
    blend: "source-over",
    shadowOn: false,
    shadowX: 4,
    shadowY: 4,
    shadowBlur: 8,
    shadowColor: "#000000",
    borderOn: false,
    borderW: 3,
    borderC: "#ffffff",
  };
}
function addFromFile(f) {
  var r = new FileReader();
  r.onload = function (ev) {
    var img = new Image();
    img.onload = function () {
      var c = document.createElement("canvas");
      c.width = img.width;
      c.height = img.height;
      c.getContext("2d").drawImage(img, 0, 0);
      var oc = document.createElement("canvas");
      oc.width = img.width;
      oc.height = img.height;
      oc.getContext("2d").drawImage(img, 0, 0);
      var L = mkL(
        f.name.replace(/\.[^.]+$/, ""),
        c,
        0,
        0,
        img.width,
        img.height,
      );
      L.origCvs = oc;
      if (!S.layers.length) {
        S.cw = img.width;
        S.ch = img.height;
        $("cvsW").value = img.width;
        $("cvsH").value = img.height;
      } else {
        L.x = Math.round((S.cw - img.width) / 2);
        L.y = Math.round((S.ch - img.height) / 2);
      }
      S.layers.push(L);
      S.ai = S.layers.length - 1;
      showUI();
      pushH();
      renderAll();
      updLy();
      updInfo();
      toast("Camada: " + L.name, "success");
    };
    img.src = ev.target.result;
  };
  r.readAsDataURL(f);
}
function addTxt() {
  var t = $("txtIn").value.trim();
  if (!t) {
    toast("Digite texto", "error");
    return;
  }
  var sz = +$("txtSz").value || 48,
    col = $("txtCol").value,
    font = $("txtFont").value,
    bold = $("txtBold").checked ? "bold " : "",
    italic = $("txtItalic").checked ? "italic " : "";
  var c = document.createElement("canvas"),
    tx = c.getContext("2d");
  tx.font = italic + bold + sz + 'px "' + font + '"';
  var m = tx.measureText(t),
    tw = Math.ceil(m.width) + 20,
    th = Math.ceil(sz * 1.4) + 10;
  c.width = tw;
  c.height = th;
  tx.font = italic + bold + sz + 'px "' + font + '"';
  tx.fillStyle = col;
  tx.textBaseline = "top";
  tx.fillText(t, 10, 5);
  var oc = document.createElement("canvas");
  oc.width = tw;
  oc.height = th;
  oc.getContext("2d").drawImage(c, 0, 0);
  var L = mkL(
    "Txt: " + t.substring(0, 10),
    c,
    Math.round((S.cw - tw) / 2),
    Math.round((S.ch - th) / 2),
    tw,
    th,
  );
  L.origCvs = oc;
  S.layers.push(L);
  S.ai = S.layers.length - 1;
  showUI();
  pushH();
  renderAll();
  updLy();
  toast("Texto adicionado", "success");
}
function addEmoji(em) {
  var c = document.createElement("canvas");
  c.width = 128;
  c.height = 128;
  var tx = c.getContext("2d");
  tx.font = "100px serif";
  tx.textAlign = "center";
  tx.textBaseline = "middle";
  tx.fillText(em, 64, 68);
  var oc = document.createElement("canvas");
  oc.width = 128;
  oc.height = 128;
  oc.getContext("2d").drawImage(c, 0, 0);
  var L = mkL(
    "Emoji " + em,
    c,
    Math.round((S.cw - 128) / 2),
    Math.round((S.ch - 128) / 2),
    128,
    128,
  );
  L.origCvs = oc;
  S.layers.push(L);
  S.ai = S.layers.length - 1;
  showUI();
  pushH();
  renderAll();
  updLy();
  toast("Emoji adicionado", "success");
}
function addShape() {
  var sz = +$("shSz").value || 120,
    col = $("shCol2").value,
    fill = $("shFill").checked,
    type = S.shapeType;
  var c = document.createElement("canvas");
  c.width = sz;
  c.height = sz;
  var tx = c.getContext("2d");
  if (fill) tx.fillStyle = col;
  else {
    tx.strokeStyle = col;
    tx.lineWidth = Math.max(3, sz * 0.03);
  }
  tx.lineJoin = "round";
  tx.lineCap = "round";
  var m = sz * 0.06;
  if (type === "rect") {
    if (fill) tx.fillRect(m, m, sz - m * 2, sz - m * 2);
    else tx.strokeRect(m, m, sz - m * 2, sz - m * 2);
  } else if (type === "circle") {
    tx.beginPath();
    tx.arc(sz / 2, sz / 2, sz / 2 - m, 0, Math.PI * 2);
    fill ? tx.fill() : tx.stroke();
  } else if (type === "triangle") {
    tx.beginPath();
    tx.moveTo(sz / 2, m);
    tx.lineTo(sz - m, sz - m);
    tx.lineTo(m, sz - m);
    tx.closePath();
    fill ? tx.fill() : tx.stroke();
  } else if (type === "star") {
    tx.beginPath();
    var cx = sz / 2,
      cy = sz / 2,
      or = sz / 2 - m,
      ir = or * 0.4;
    for (var i = 0; i < 10; i++) {
      var r = i % 2 === 0 ? or : ir,
        a = -Math.PI / 2 + (Math.PI / 5) * i;
      tx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    }
    tx.closePath();
    fill ? tx.fill() : tx.stroke();
  } else if (type === "diamond") {
    tx.beginPath();
    tx.moveTo(sz / 2, m);
    tx.lineTo(sz - m, sz / 2);
    tx.lineTo(sz / 2, sz - m);
    tx.lineTo(m, sz / 2);
    tx.closePath();
    fill ? tx.fill() : tx.stroke();
  } else if (type === "line") {
    tx.beginPath();
    tx.moveTo(m, sz - m);
    tx.lineTo(sz - m, m);
    tx.stroke();
  }
  var oc = document.createElement("canvas");
  oc.width = sz;
  oc.height = sz;
  oc.getContext("2d").drawImage(c, 0, 0);
  var L = mkL(
    "Forma " + type,
    c,
    Math.round((S.cw - sz) / 2),
    Math.round((S.ch - sz) / 2),
    sz,
    sz,
  );
  L.origCvs = oc;
  S.layers.push(L);
  S.ai = S.layers.length - 1;
  showUI();
  pushH();
  renderAll();
  updLy();
  toast("Forma adicionada", "success");
}
function delActive() {
  if (S.ai < 0 || !S.layers.length) return;
  S.layers.splice(S.ai, 1);
  S.ai = Math.min(S.ai, S.layers.length - 1);
  pushH();
  renderAll();
  updLy();
  updInfo();
  toast("Removido", "info");
}
function dupAct() {
  if (S.ai < 0) return;
  var L = S.layers[S.ai],
    c = document.createElement("canvas");
  c.width = L.cvs.width;
  c.height = L.cvs.height;
  c.getContext("2d").drawImage(L.cvs, 0, 0);
  var oc = document.createElement("canvas");
  oc.width = L.cvs.width;
  oc.height = L.cvs.height;
  oc.getContext("2d").drawImage(L.origCvs || L.cvs, 0, 0);
  var nl = mkL(L.name + " copia", c, L.x + 15, L.y + 15, L.w, L.h);
  nl.opacity = L.opacity;
  nl.blend = L.blend;
  nl.origCvs = oc;
  nl.shadowOn = L.shadowOn;
  nl.shadowX = L.shadowX;
  nl.shadowY = L.shadowY;
  nl.shadowBlur = L.shadowBlur;
  nl.shadowColor = L.shadowColor;
  nl.borderOn = L.borderOn;
  nl.borderW = L.borderW;
  nl.borderC = L.borderC;
  S.layers.splice(S.ai + 1, 0, nl);
  S.ai++;
  pushH();
  renderAll();
  updLy();
  toast("Duplicado", "success");
}
function bringFront() {
  if (S.ai >= S.layers.length - 1) return;
  var t = S.layers.splice(S.ai, 1)[0];
  S.layers.push(t);
  S.ai = S.layers.length - 1;
  pushH();
  renderAll();
  updLy();
}
function sendBack() {
  if (S.ai <= 0) return;
  var t = S.layers.splice(S.ai, 1)[0];
  S.layers.unshift(t);
  S.ai = 0;
  pushH();
  renderAll();
  updLy();
}
function mergeDown() {
  if (S.ai < 1) return;
  var top = S.layers[S.ai],
    bot = S.layers[S.ai - 1];
  var oc = document.createElement("canvas");
  oc.width = bot.cvs.width;
  oc.height = bot.cvs.height;
  var otx = oc.getContext("2d");
  otx.drawImage(bot.cvs, 0, 0);
  otx.globalAlpha = top.opacity;
  otx.globalCompositeOperation = top.blend;
  otx.drawImage(top.cvs, top.x - bot.x, top.y - bot.y, top.w, top.h);
  bot.cvs.width = oc.width;
  bot.cvs.height = oc.height;
  bot.cvs.getContext("2d").drawImage(oc, 0, 0);
  S.layers.splice(S.ai, 1);
  S.ai--;
  pushH();
  renderAll();
  updLy();
  toast("Mesclado", "success");
}
function resetAct() {
  if (S.ai < 0) return;
  var L = S.layers[S.ai];
  if (L.origCvs) {
    L.cvs.getContext("2d").clearRect(0, 0, L.cvs.width, L.cvs.height);
    L.cvs.getContext("2d").drawImage(L.origCvs, 0, 0);
  }
  pushH();
  renderAll();
  toast("Restaurado", "info");
}
function alignTo(dir) {
  if (S.ai < 0) return;
  var L = S.layers[S.ai];
  if (dir === "l") L.x = 0;
  else if (dir === "r") L.x = S.cw - L.w;
  else if (dir === "ch") L.x = Math.round((S.cw - L.w) / 2);
  else if (dir === "t") L.y = 0;
  else if (dir === "b") L.y = S.ch - L.h;
  else if (dir === "cv") L.y = Math.round((S.ch - L.h) / 2);
  pushH();
  renderAll();
}
function setGrad(t) {
  S.grad.type = t;
  document.querySelectorAll("[data-gr]").forEach(function (p) {
    p.classList.toggle("active", p.dataset.gr === t);
  });
  $("gradOpts").style.display = t === "none" ? "none" : "block";
  renderAll();
}
$("gC1").addEventListener("input", function () {
  S.grad.c1 = this.value;
  renderAll();
});
$("gC2").addEventListener("input", function () {
  S.grad.c2 = this.value;
  renderAll();
});
$("sGA").addEventListener("input", function () {
  S.grad.angle = +this.value;
  $("vGA").textContent = this.value + "°";
  renderAll();
});
function renderAll() {
  if (!S.layers.length) return;
  cvs.width = S.cw;
  cvs.height = S.ch;
  ovC.width = S.cw;
  ovC.height = S.ch;
  ctx.clearRect(0, 0, S.cw, S.ch);
  if (!$("cvsBgT").checked) {
    if (S.grad.type === "none") {
      ctx.fillStyle = $("cvsBg").value;
      ctx.fillRect(0, 0, S.cw, S.ch);
    } else if (S.grad.type === "linear") {
      var a = (S.grad.angle * Math.PI) / 180,
        cx = S.cw / 2,
        cy = S.ch / 2,
        len = Math.max(S.cw, S.ch);
      var x1 = cx - Math.cos(a) * len,
        y1 = cy - Math.sin(a) * len,
        x2 = cx + Math.cos(a) * len,
        y2 = cy + Math.sin(a) * len;
      var g = ctx.createLinearGradient(x1, y1, x2, y2);
      g.addColorStop(0, S.grad.c1);
      g.addColorStop(1, S.grad.c2);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, S.cw, S.ch);
    } else {
      var g = ctx.createRadialGradient(
        S.cw / 2,
        S.ch / 2,
        0,
        S.cw / 2,
        S.ch / 2,
        Math.max(S.cw, S.ch) / 2,
      );
      g.addColorStop(0, S.grad.c1);
      g.addColorStop(1, S.grad.c2);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, S.cw, S.ch);
    }
  }
  for (var i = 0; i < S.layers.length; i++) {
    var L = S.layers[i];
    if (!L.visible) continue;
    ctx.save();
    ctx.globalAlpha = L.opacity;
    ctx.globalCompositeOperation = L.blend;
    if (L.shadowOn) {
      ctx.shadowOffsetX = L.shadowX;
      ctx.shadowOffsetY = L.shadowY;
      ctx.shadowBlur = L.shadowBlur;
      ctx.shadowColor = L.shadowColor;
    }
    ctx.drawImage(L.cvs, L.x, L.y, L.w, L.h);
    ctx.restore();
    if (L.borderOn && L.borderW > 0) {
      ctx.save();
      ctx.globalAlpha = L.opacity;
      ctx.globalCompositeOperation = L.blend;
      ctx.strokeStyle = L.borderC;
      ctx.lineWidth = L.borderW;
      ctx.strokeRect(L.x, L.y, L.w, L.h);
      ctx.restore();
    }
  }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
  if (hasAdj()) {
    var id = ctx.getImageData(0, 0, S.cw, S.ch);
    appAdj(id);
    ctx.putImageData(id, 0, 0);
  }
  cvs.style.filter = S.adj.bl > 0 ? "blur(" + S.adj.bl + "px)" : "none";
  drawOv();
}
function hasAdj() {
  var a = S.adj;
  return a.br || a.co || a.sa || a.hu || a.te || a.vi;
}
function appAdj(id) {
  var d = id.data,
    w = id.width,
    h = id.height,
    a = S.adj,
    br = (a.br / 100) * 255,
    cF = a.co === 0 ? 1 : (259 * (a.co + 255)) / (255 * (259 - a.co)),
    sF = 1 + a.sa / 100,
    tmp = a.te * 0.6,
    vs = a.vi / 100,
    cx = w / 2,
    cy = h / 2,
    md = Math.sqrt(cx * cx + cy * cy);
  for (var i = 0; i < d.length; i += 4) {
    var r = d[i],
      g = d[i + 1],
      b = d[i + 2];
    if (!d[i + 3]) continue;
    r += br;
    g += br;
    b += br;
    if (a.co) {
      r = cF * (r - 128) + 128;
      g = cF * (g - 128) + 128;
      b = cF * (b - 128) + 128;
    }
    r += tmp;
    b -= tmp;
    if (sF !== 1) {
      var gr = 0.299 * r + 0.587 * g + 0.114 * b;
      r = gr + sF * (r - gr);
      g = gr + sF * (g - gr);
      b = gr + sF * (b - gr);
    }
    r = clmp(r, 0, 255);
    g = clmp(g, 0, 255);
    b = clmp(b, 0, 255);
    if (vs > 0) {
      var px = (i / 4) % w,
        py = (i / 4 / w) | 0;
      var ds = Math.sqrt((px - cx) * (px - cx) + (py - cy) * (py - cy)) / md;
      var v = 1 - ds * ds * vs;
      r *= v;
      g *= v;
      b *= v;
    }
    d[i] = Math.round(r);
    d[i + 1] = Math.round(g);
    d[i + 2] = Math.round(b);
  }
}
function drawOv() {
  ovCtx.clearRect(0, 0, S.cw, S.ch);
  if (S.gridOn) {
    ovCtx.strokeStyle = "rgba(0,229,160,0.1)";
    ovCtx.lineWidth = 1;
    var gs = Math.max(20, Math.round(Math.min(S.cw, S.ch) / 20));
    for (var x = gs; x < S.cw; x += gs) {
      ovCtx.beginPath();
      ovCtx.moveTo(x, 0);
      ovCtx.lineTo(x, S.ch);
      ovCtx.stroke();
    }
    for (var y = gs; y < S.ch; y += gs) {
      ovCtx.beginPath();
      ovCtx.moveTo(0, y);
      ovCtx.lineTo(S.cw, y);
      ovCtx.stroke();
    }
  }
  if (S.ai >= 0 && S.ai < S.layers.length && !crop.on) {
    var L = S.layers[S.ai];
    ovCtx.strokeStyle = "rgba(0,229,160,0.6)";
    ovCtx.lineWidth = 1.5;
    ovCtx.setLineDash([4, 3]);
    ovCtx.strokeRect(L.x, L.y, L.w, L.h);
    ovCtx.setLineDash([]);
    var hs = 5;
    ovCtx.fillStyle = "#00e5a0";
    [
      [L.x, L.y],
      [L.x + L.w, L.y],
      [L.x, L.y + L.h],
      [L.x + L.w, L.y + L.h],
    ].forEach(function (c) {
      ovCtx.fillRect(c[0] - hs / 2, c[1] - hs / 2, hs, hs);
    });
  }
  if (crop.on && (crop.rect || crop.sel)) {
    var r = crop.rect || {
      x: Math.min(crop.sx, crop.ex),
      y: Math.min(crop.sy, crop.ey),
      w: Math.abs(crop.ex - crop.sx),
      h: Math.abs(crop.ey - crop.sy),
    };
    ovCtx.fillStyle = "rgba(0,0,0,0.4)";
    ovCtx.fillRect(0, 0, S.cw, S.ch);
    ovCtx.clearRect(r.x, r.y, r.w, r.h);
    ovCtx.strokeStyle = "#00e5a0";
    ovCtx.lineWidth = 2;
    ovCtx.setLineDash([5, 3]);
    ovCtx.strokeRect(r.x, r.y, r.w, r.h);
    ovCtx.setLineDash([]);
    ovCtx.fillStyle = "#00e5a0";
    ovCtx.font = "bold 10px DM Mono";
    ovCtx.fillText(r.w + "×" + r.h, r.x + 3, r.y - 4);
  }
}
function getCXY(e) {
  var r = cvs.getBoundingClientRect();
  return {
    x: Math.floor(((e.clientX - r.left) * cvs.width) / r.width),
    y: Math.floor(((e.clientY - r.top) * cvs.height) / r.height),
  };
}
function inB(x, y, w, h, mx, my) {
  return mx >= x && mx <= x + w && my >= y && my <= y + h;
}
function getHandle(L, mx, my) {
  var hs = 10,
    cs = [
      [L.x, L.y, "tl"],
      [L.x + L.w, L.y, "tr"],
      [L.x, L.y + L.h, "bl"],
      [L.x + L.w, L.y + L.h, "br"],
    ];
  for (var i = 0; i < 4; i++) {
    if (Math.abs(mx - cs[i][0]) < hs && Math.abs(my - cs[i][1]) < hs)
      return cs[i][2];
  }
  return null;
}
function hitLayer(mx, my) {
  for (var i = S.layers.length - 1; i >= 0; i--) {
    var L = S.layers[i];
    if (L.visible && inB(L.x, L.y, L.w, L.h, mx, my)) return i;
  }
  return -1;
}
function toL(L, p) {
  return {
    x: Math.round(((p.x - L.x) * L.cvs.width) / L.w),
    y: Math.round(((p.y - L.y) * L.cvs.height) / L.h),
  };
}
function inL(L, lp) {
  return lp.x >= 0 && lp.y >= 0 && lp.x < L.cvs.width && lp.y < L.cvs.height;
}
$("cCont").addEventListener("mousedown", function (e) {
  if (e.button !== 0 || !S.layers.length) return;
  var p = getCXY(e);
  if (crop.on) {
    crop.sel = true;
    crop.sx = p.x;
    crop.sy = p.y;
    crop.ex = p.x;
    crop.ey = p.y;
    crop.rect = null;
    $("btnCA").style.display = "none";
    $("btnCC").style.display = "none";
    $("cropInfo").style.display = "none";
    return;
  }
  if (S.mode === "paint" && S.ai >= 0) {
    S.paintDown = true;
    var L = S.layers[S.ai],
      lp = toL(L, p);
    if (inL(L, lp)) {
      var tc = L.cvs.getContext("2d");
      tc.fillStyle = $("paintCol").value;
      tc.beginPath();
      tc.arc(lp.x, lp.y, (S.brushSz * L.cvs.width) / L.w / 2, 0, Math.PI * 2);
      tc.fill();
    }
    renderAll();
    return;
  }
  if (S.mode === "bucket" && S.ai >= 0) {
    var L = S.layers[S.ai],
      lp = toL(L, p);
    if (inL(L, lp)) {
      var id = L.cvs
        .getContext("2d")
        .getImageData(0, 0, L.cvs.width, L.cvs.height);
      bucketFill(
        id,
        lp.x,
        lp.y,
        L.cvs.width,
        L.cvs.height,
        $("paintCol").value,
      );
      L.cvs.getContext("2d").putImageData(id, 0, 0);
      pushH();
      renderAll();
      toast("Preenchido", "success");
    }
    return;
  }
  if (S.mode === "eraser" && S.ai >= 0) {
    S.erDown = true;
    var L = S.layers[S.ai],
      lp = toL(L, p);
    if (inL(L, lp)) {
      var bd = L.cvs.getContext("2d").getImageData(lp.x, lp.y, 1, 1).data;
      S.erCol = { r: bd[0], g: bd[1], b: bd[2] };
      eraseAt(L, lp.x, lp.y);
      renderAll();
    }
    return;
  }
  if (S.picking && S.ai >= 0) {
    var L = S.layers[S.ai],
      lp = toL(L, p);
    if (inL(L, lp)) {
      var bd = L.cvs.getContext("2d").getImageData(lp.x, lp.y, 1, 1).data;
      S.tgt = { r: bd[0], g: bd[1], b: bd[2] };
      $("swatch").style.background =
        "rgb(" + bd[0] + "," + bd[1] + "," + bd[2] + ")";
    }
    S.picking = false;
    setMode(S.mode);
    toast("Cor selecionada", "success");
    return;
  }
  if (S.mode === "magic" && S.ai >= 0) {
    var L = S.layers[S.ai],
      lp = toL(L, p);
    if (inL(L, lp)) {
      var id = L.cvs
          .getContext("2d")
          .getImageData(0, 0, L.cvs.width, L.cvs.height),
        idx = (lp.y * L.cvs.width + lp.x) * 4;
      S.tgt = { r: id.data[idx], g: id.data[idx + 1], b: id.data[idx + 2] };
      $("swatch").style.background =
        "rgb(" +
        id.data[idx] +
        "," +
        id.data[idx + 1] +
        "," +
        id.data[idx + 2] +
        ")";
      var n = floodR(id, lp.x, lp.y, L.cvs.width, L.cvs.height);
      L.cvs.getContext("2d").putImageData(id, 0, 0);
      pushH();
      renderAll();
      toast(n + " px removidos", "success");
    }
    return;
  }
  if (S.ai >= 0) {
    var L = S.layers[S.ai];
    var h = getHandle(L, p.x, p.y);
    if (h) {
      S.drag = {
        type: "resize",
        handle: h,
        mx: p.x,
        my: p.y,
        lx: L.x,
        ly: L.y,
        lw: L.w,
        lh: L.h,
      };
      return;
    }
  }
  var hit = hitLayer(p.x, p.y);
  if (hit >= 0) {
    S.ai = hit;
    var L = S.layers[hit];
    S.drag = { type: "move", mx: p.x, my: p.y, lx: L.x, ly: L.y };
    updLy();
    renderAll();
    updLP();
    return;
  }
  S.ai = -1;
  updLy();
  renderAll();
});
$("cCont").addEventListener("mousemove", function (e) {
  var p = getCXY(e);
  $("cXY").textContent = p.x + ", " + p.y;
  if (S.mode === "eraser" || S.mode === "paint") showErCur(e);
  if (crop.sel) {
    crop.ex = clmp(p.x, 0, S.cw);
    crop.ey = clmp(p.y, 0, S.ch);
    drawOv();
    return;
  }
  if (S.paintDown && S.ai >= 0) {
    var L = S.layers[S.ai],
      lp = toL(L, p);
    if (inL(L, lp)) {
      var tc = L.cvs.getContext("2d");
      tc.fillStyle = $("paintCol").value;
      tc.beginPath();
      tc.arc(lp.x, lp.y, (S.brushSz * L.cvs.width) / L.w / 2, 0, Math.PI * 2);
      tc.fill();
      renderAll();
    }
    return;
  }
  if (S.erDown && S.ai >= 0) {
    var L = S.layers[S.ai],
      lp = toL(L, p);
    eraseAt(L, lp.x, lp.y);
    renderAll();
    return;
  }
  if (!S.drag || S.ai < 0) return;
  var dx = p.x - S.drag.mx,
    dy = p.y - S.drag.my,
    L = S.layers[S.ai];
  if (S.drag.type === "move") {
    L.x = S.drag.lx + dx;
    L.y = S.drag.ly + dy;
    renderAll();
  } else if (S.drag.type === "resize") {
    var h = S.drag.handle,
      r = S.drag.lw / S.drag.lh,
      nw;
    if (h === "br") {
      nw = Math.max(20, S.drag.lw + dx);
      L.w = nw;
      L.h = nw / r;
    } else if (h === "bl") {
      nw = Math.max(20, S.drag.lw - dx);
      L.w = nw;
      L.h = nw / r;
      L.x = S.drag.lx + S.drag.lw - nw;
    } else if (h === "tr") {
      nw = Math.max(20, S.drag.lw + dx);
      L.w = nw;
      L.h = nw / r;
      L.y = S.drag.ly + S.drag.lh - nw / r;
    } else if (h === "tl") {
      nw = Math.max(20, S.drag.lw - dx);
      L.w = nw;
      L.h = nw / r;
      L.x = S.drag.lx + S.drag.lw - nw;
      L.y = S.drag.ly + S.drag.lh - nw / r;
    }
    $("lyW").value = Math.round(L.w);
    $("lyH").value = Math.round(L.h);
    renderAll();
  }
});
$("cCont").addEventListener("mouseup", function () {
  if (crop.sel) {
    crop.sel = false;
    var x1 = Math.min(crop.sx, crop.ex),
      y1 = Math.min(crop.sy, crop.ey),
      x2 = Math.max(crop.sx, crop.ex),
      y2 = Math.max(crop.sy, crop.ey),
      w = x2 - x1,
      h = y2 - y1;
    if (w > 4 && h > 4) {
      crop.rect = { x: x1, y: y1, w: w, h: h };
      $("btnCA").style.display = "inline-flex";
      $("btnCC").style.display = "inline-flex";
      $("cropInfo").style.display = "block";
      $("cropInfo").textContent = w + " × " + h + " px";
    }
    drawOv();
    return;
  }
  if (S.paintDown) {
    S.paintDown = false;
    pushH();
    toast("Pintura", "success");
  }
  if (S.erDown) {
    S.erDown = false;
    pushH();
    toast("Apagado", "success");
  }
  if (S.drag) {
    S.drag = null;
    pushH();
  }
});
$("cCont").addEventListener("mouseleave", function () {
  S.paintDown = false;
  if (S.erDown) {
    S.erDown = false;
    pushH();
  }
  S.drag = null;
  hideErCur();
});
function showErCur(e) {
  var r = S.brushSz * S.zoom;
  erCur.style.width = r * 2 + "px";
  erCur.style.height = r * 2 + "px";
  erCur.style.left = e.clientX + "px";
  erCur.style.top = e.clientY + "px";
  erCur.style.opacity = "1";
}
function hideErCur() {
  erCur.style.opacity = "0";
}
function eraseAt(L, cx, cy) {
  var id = L.cvs.getContext("2d").getImageData(0, 0, L.cvs.width, L.cvs.height),
    d = id.data,
    w = L.cvs.width,
    h = L.cvs.height,
    tgt = S.erCol,
    tol = S.tol,
    r = Math.round((S.brushSz * L.cvs.width) / L.w),
    r2 = r * r;
  for (var dy = -r; dy <= r; dy++)
    for (var dx = -r; dx <= r; dx++) {
      if (dx * dx + dy * dy > r2) continue;
      var px = cx + dx,
        py = cy + dy;
      if (px < 0 || py < 0 || px >= w || py >= h) continue;
      var i = (py * w + px) * 4;
      if (
        Math.abs(d[i] - tgt.r) <= tol &&
        Math.abs(d[i + 1] - tgt.g) <= tol &&
        Math.abs(d[i + 2] - tgt.b) <= tol
      )
        d[i + 3] = 0;
    }
  L.cvs.getContext("2d").putImageData(id, 0, 0);
}
function bucketFill(id, sx, sy, w, h, color) {
  var d = id.data,
    tot = w * h,
    vis = new Uint8Array(tot),
    stk = [sy * w + sx],
    si = (sy * w + sx) * 4,
    tr = d[si],
    tg = d[si + 1],
    tb = d[si + 2],
    tol = S.tol,
    pr = parseInt(color.substr(1, 2), 16),
    pg = parseInt(color.substr(3, 2), 16),
    pb = parseInt(color.substr(5, 2), 16);
  function ok(i) {
    var j = i * 4;
    return (
      Math.abs(d[j] - tr) <= tol &&
      Math.abs(d[j + 1] - tg) <= tol &&
      Math.abs(d[j + 2] - tb) <= tol
    );
  }
  while (stk.length) {
    var p = stk.pop();
    if (p < 0 || p >= tot || vis[p] || !ok(p)) continue;
    vis[p] = 1;
    var j = p * 4;
    d[j] = pr;
    d[j + 1] = pg;
    d[j + 2] = pb;
    d[j + 3] = 255;
    var px = p % w,
      py = (p / w) | 0;
    if (px > 0) stk.push(p - 1);
    if (px < w - 1) stk.push(p + 1);
    if (py > 0) stk.push(p - w);
    if (py < h - 1) stk.push(p + w);
  }
}
function floodR(id, sx, sy, w, h) {
  var d = id.data,
    tgt = S.tgt,
    tol = S.tol,
    tot = w * h,
    vis = new Uint8Array(tot),
    cnt = 0,
    stk = [sy * w + sx];
  function ok(i) {
    var j = i * 4;
    return (
      Math.abs(d[j] - tgt.r) <= tol &&
      Math.abs(d[j + 1] - tgt.g) <= tol &&
      Math.abs(d[j + 2] - tgt.b) <= tol
    );
  }
  while (stk.length) {
    var p = stk.pop();
    if (p < 0 || p >= tot || vis[p] || !ok(p)) continue;
    vis[p] = 1;
    d[p * 4 + 3] = 0;
    cnt++;
    var px = p % w,
      py = (p / w) | 0;
    if (px > 0) stk.push(p - 1);
    if (px < w - 1) stk.push(p + 1);
    if (py > 0) stk.push(p - w);
    if (py < h - 1) stk.push(p + w);
  }
  return cnt;
}
function rmBgAll() {
  if (S.ai < 0) return;
  var L = S.layers[S.ai],
    id = L.cvs.getContext("2d").getImageData(0, 0, L.cvs.width, L.cvs.height),
    d = id.data,
    w = L.cvs.width,
    h = L.cvs.height,
    tgt = S.tgt,
    tol = S.tol,
    cnt = 0;
  for (var i = 0; i < w * h; i++) {
    var j = i * 4;
    if (
      Math.abs(d[j] - tgt.r) <= tol &&
      Math.abs(d[j + 1] - tgt.g) <= tol &&
      Math.abs(d[j + 2] - tgt.b) <= tol
    ) {
      d[j + 3] = 0;
      cnt++;
    }
  }
  L.cvs.getContext("2d").putImageData(id, 0, 0);
  pushH();
  renderAll();
  toast(cnt + " px removidos", "success");
}
function rotAct(deg) {
  if (S.ai < 0) return;
  var L = S.layers[S.ai],
    oc = document.createElement("canvas");
  oc.width = L.cvs.height;
  oc.height = L.cvs.width;
  var otx = oc.getContext("2d");
  otx.translate(oc.width / 2, oc.height / 2);
  otx.rotate((deg * Math.PI) / 180);
  otx.drawImage(L.cvs, -L.cvs.width / 2, -L.cvs.height / 2);
  L.cvs.width = oc.width;
  L.cvs.height = oc.height;
  L.cvs.getContext("2d").drawImage(oc, 0, 0);
  if (L.origCvs) {
    var o2 = document.createElement("canvas");
    o2.width = oc.width;
    o2.height = oc.height;
    o2.getContext("2d").drawImage(oc, 0, 0);
    L.origCvs = o2;
  }
  var t = L.w;
  L.w = L.h;
  L.h = t;
  $("lyW").value = Math.round(L.w);
  $("lyH").value = Math.round(L.h);
  pushH();
  renderAll();
  toast("Rotacionado", "success");
}
function flipAct(dir) {
  if (S.ai < 0) return;
  var L = S.layers[S.ai],
    oc = document.createElement("canvas");
  oc.width = L.cvs.width;
  ((oc.height = L.cvs.height), (otx = oc.getContext("2d")));
  if (dir === "h") {
    otx.translate(oc.width, 0);
    otx.scale(-1, 1);
  } else {
    otx.translate(0, oc.height);
    otx.scale(1, -1);
  }
  otx.drawImage(L.cvs, 0, 0);
  L.cvs.getContext("2d").clearRect(0, 0, L.cvs.width, L.cvs.height);
  L.cvs.getContext("2d").drawImage(oc, 0, 0);
  if (L.origCvs) {
    var o2 = document.createElement("canvas");
    o2.width = oc.width;
    o2.height = oc.height;
    o2.getContext("2d").drawImage(oc, 0, 0);
    L.origCvs = o2;
  }
  pushH();
  renderAll();
  toast("Espelhado", "success");
}
function applyCrop() {
  if (!crop.rect) return;
  var r = crop.rect;
  if (r.w < 2 || r.h < 2) {
    toast("Muito pequeno", "error");
    return;
  }
  S.cw = r.w;
  S.ch = r.h;
  $("cvsW").value = r.w;
  $("cvsH").value = r.h;
  for (var i = 0; i < S.layers.length; i++) {
    S.layers[i].x -= r.x;
    S.layers[i].y -= r.y;
  }
  cancelCrop();
  pushH();
  renderAll();
  fitV();
  toast("Recortado", "success");
}
function cancelCrop() {
  crop.on = false;
  crop.sel = false;
  crop.rect = null;
  $("btnCA").style.display = "none";
  $("btnCC").style.display = "none";
  $("cropInfo").style.display = "none";
  drawOv();
  setMode(S.mode);
}
function showUI() {
  $("eSt").style.display = "none";
  $("cCont").style.display = "block";
  $("toolbar").style.display = "flex";
  $("sBar").style.display = "flex";
  ["pLy", "pElem", "pEdit", "pAdj", "pExp", "pInfo", "pHist"].forEach(
    function (id) {
      $(id).style.display = "block";
    },
  );
  $("addArea").style.display = "block";
  $("btnDL").style.display = "inline-flex";
  $("btnCmp").style.display = "inline-flex";
  setMode(S.mode);
  fitV();
}
function updInfo() {
  $("iDim").textContent = S.cw + " × " + S.ch + " px";
  $("iLy").textContent = S.layers.length;
}
function updLy() {
  var el = $("lyList");
  el.innerHTML = "";
  for (var i = S.layers.length - 1; i >= 0; i--) {
    var L = S.layers[i];
    var d = document.createElement("div");
    d.className = "ly-item" + (i === S.ai ? " active" : "");
    d.innerHTML =
      '<div class="ly-vis' +
      (L.visible ? "" : " off") +
      '" data-i="' +
      i +
      '">' +
      (L.visible ? "👁" : "✕") +
      '</div><img class="ly-thumb" src="' +
      L.cvs.toDataURL("image/png") +
      '"><span class="ly-name">' +
      L.name +
      "</span>";
    d.dataset.idx = i;
    d.addEventListener("click", function (ev) {
      if (ev.target.classList.contains("ly-vis")) {
        var idx = +ev.target.dataset.i;
        S.layers[idx].visible = !S.layers[idx].visible;
        renderAll();
        updLy();
        return;
      }
      S.ai = +this.dataset.idx;
      updLy();
      renderAll();
      updLP();
    });
    el.appendChild(d);
  }
  updLP();
}
function updLP() {
  if (S.ai < 0 || S.ai >= S.layers.length) return;
  var L = S.layers[S.ai];
  $("sOp").value = Math.round(L.opacity * 100);
  $("vOp").textContent = Math.round(L.opacity * 100) + "%";
  $("blendSel").value = L.blend;
  $("lyW").value = Math.round(L.w);
  $("lyH").value = Math.round(L.h);
  $("shOn").checked = L.shadowOn;
  $("sShX").value = L.shadowX;
  $("vShX").textContent = L.shadowX;
  $("sShY").value = L.shadowY;
  $("vShY").textContent = L.shadowY;
  $("sShB").value = L.shadowBlur;
  $("vShB").textContent = L.shadowBlur;
  $("shCol").value = L.shadowColor;
  $("brdOn").checked = L.borderOn;
  $("sBrd").value = L.borderW;
  $("vBrd").textContent = L.borderW;
  $("brdCol").value = L.borderC;
}
$("sOp").addEventListener("input", function () {
  if (S.ai < 0) return;
  S.layers[S.ai].opacity = +this.value / 100;
  $("vOp").textContent = this.value + "%";
  renderAll();
});
$("blendSel").addEventListener("change", function () {
  if (S.ai < 0) return;
  S.layers[S.ai].blend = this.value;
  pushH();
  renderAll();
});
$("lyW").addEventListener("change", function () {
  if (S.ai < 0) return;
  var L = S.layers[S.ai],
    nw = +this.value || L.w;
  if ($("lyR").checked && L.w > 0)
    L.h = Math.round((nw * L.cvs.height) / L.cvs.width);
  L.w = nw;
  $("lyH").value = Math.round(L.h);
  renderAll();
});
$("lyH").addEventListener("change", function () {
  if (S.ai < 0) return;
  var L = S.layers[S.ai],
    nh = +this.value || L.h;
  if ($("lyR").checked && L.h > 0)
    L.w = Math.round((nh * L.cvs.width) / L.cvs.height);
  L.h = nh;
  $("lyW").value = Math.round(L.w);
  renderAll();
});
$("cvsW").addEventListener("change", function () {
  S.cw = +this.value || 800;
  renderAll();
});
$("cvsH").addEventListener("change", function () {
  S.ch = +this.value || 600;
  renderAll();
});
$("cvsBg").addEventListener("input", function () {
  renderAll();
});
$("cvsBgT").addEventListener("change", function () {
  renderAll();
});
$("shOn").addEventListener("change", function () {
  if (S.ai < 0) return;
  S.layers[S.ai].shadowOn = this.checked;
  pushH();
  renderAll();
});
$("sShX").addEventListener("input", function () {
  if (S.ai < 0) return;
  S.layers[S.ai].shadowX = +this.value;
  $("vShX").textContent = this.value;
  renderAll();
});
$("sShY").addEventListener("input", function () {
  if (S.ai < 0) return;
  S.layers[S.ai].shadowY = +this.value;
  $("vShY").textContent = this.value;
  renderAll();
});
$("sShB").addEventListener("input", function () {
  if (S.ai < 0) return;
  S.layers[S.ai].shadowBlur = +this.value;
  $("vShB").textContent = this.value;
  renderAll();
});
$("shCol").addEventListener("input", function () {
  if (S.ai < 0) return;
  S.layers[S.ai].shadowColor = this.value;
  $("shColH").textContent = this.value;
  renderAll();
});
$("brdOn").addEventListener("change", function () {
  if (S.ai < 0) return;
  S.layers[S.ai].borderOn = this.checked;
  pushH();
  renderAll();
});
$("sBrd").addEventListener("input", function () {
  if (S.ai < 0) return;
  S.layers[S.ai].borderW = +this.value;
  $("vBrd").textContent = this.value;
  renderAll();
});
$("brdCol").addEventListener("input", function () {
  if (S.ai < 0) return;
  S.layers[S.ai].borderC = this.value;
  $("brdColH").textContent = this.value;
  renderAll();
});
$("paintCol").addEventListener("input", function () {
  $("paintColH").textContent = this.value;
});
function setMode(m) {
  S.mode = m;
  document.querySelectorAll("[data-md]").forEach(function (p) {
    p.classList.toggle("active", p.dataset.md === m);
  });
  var cls = "cvs-wrap cc";
  if (m === "magic") cls += " cross";
  else if (m === "eraser") cls += " eraser";
  else if (m === "paint") cls += " paint";
  else if (m === "bucket") cls += " bucket";
  else if (m === "pick") cls += " pick";
  if (crop.on) cls += " crop-m";
  $("cCont").className = cls;
  var showB = m === "eraser" || m === "paint";
  $("gBrush").style.display = showB ? "block" : "none";
  $("gPaintCol").style.display =
    m === "paint" || m === "bucket" ? "block" : "none";
  if (!showB) hideErCur();
}
$("sTol").addEventListener("input", function () {
  S.tol = +this.value;
  $("vTol").textContent = this.value;
});
$("sBr2").addEventListener("input", function () {
  S.brushSz = +this.value;
  $("vBr2").textContent = this.value;
});
$("swatch").addEventListener("click", function () {
  S.picking = true;
  setMode("pick");
  toast("Clique na imagem", "info");
});
function setElTab(t) {
  document.querySelectorAll("[data-el]").forEach(function (p) {
    p.classList.toggle("active", p.dataset.el === t);
  });
  $("tabShapes").style.display = t === "shapes" ? "" : "none";
  $("tabText").style.display = t === "text" ? "" : "none";
  $("tabEmoji").style.display = t === "emoji" ? "" : "none";
}
function setShape(t) {
  S.shapeType = t;
  document.querySelectorAll("[data-sh]").forEach(function (p) {
    p.classList.toggle("active", p.dataset.sh === t);
  });
}
$("pEdit").addEventListener("click", function (e) {
  if (
    e.target.closest("button") ||
    e.target.closest("input") ||
    e.target.closest("label") ||
    e.target.closest(".fp") ||
    e.target.closest("select") ||
    !S.layers.length
  )
    return;
  crop.on = true;
  setMode(S.mode);
  $("cCont").className += " crop-m";
  toast("Arraste para recortar", "info");
});
function setPreset(w, h) {
  S.cw = w;
  S.ch = h;
  $("cvsW").value = w;
  $("cvsH").value = h;
  renderAll();
  fitV();
  toast(w + "×" + h, "info");
}
[
  ["sBr", "vBr", "br"],
  ["sCo", "vCo", "co"],
  ["sSa", "vSa", "sa"],
  ["sHu", "vHu", "hu"],
  ["sTe", "vTe", "te"],
  ["sVi", "vVi", "vi"],
  ["sBl", "vBl", "bl"],
].forEach(function (a) {
  $(a[0]).addEventListener("input", function () {
    S.adj[a[2]] = +this.value;
    $(a[1]).textContent = a[2] === "hu" ? this.value + "°" : this.value;
    setAP(null);
    cancelAnimationFrame(S.raf);
    S.raf = requestAnimationFrame(renderAll);
  });
});
function syncSl() {
  [
    ["sBr", "vBr", "br"],
    ["sCo", "vCo", "co"],
    ["sSa", "vSa", "sa"],
    ["sHu", "vHu", "hu"],
    ["sTe", "vTe", "te"],
    ["sVi", "vVi", "vi"],
    ["sBl", "vBl", "bl"],
  ].forEach(function (a) {
    $(a[0]).value = S.adj[a[2]];
    $(a[1]).textContent = a[2] === "hu" ? S.adj[a[2]] + "°" : S.adj[a[2]];
  });
}
function usePre(n) {
  var p = PRESETS[n];
  if (!p) return;
  S.adj = {
    br: p.br,
    co: p.co,
    sa: p.sa,
    hu: p.hu,
    te: p.te,
    vi: p.vi,
    bl: p.bl,
  };
  syncSl();
  setAP(n);
  cancelAnimationFrame(S.raf);
  S.raf = requestAnimationFrame(renderAll);
}
function setAP(n) {
  document.querySelectorAll(".p-chip").forEach(function (el) {
    el.classList.toggle("active", el.dataset.p === n);
  });
}
function resetAdj() {
  S.adj = { br: 0, co: 0, sa: 0, hu: 0, te: 0, vi: 0, bl: 0 };
  syncSl();
  setAP("normal");
  cancelAnimationFrame(S.raf);
  S.raf = requestAnimationFrame(renderAll);
  toast("Ajustes resetados", "info");
}
function setFmt(f) {
  S.fmt = f;
  document.querySelectorAll("#fmtP .fpp").forEach(function (p) {
    p.classList.toggle("active", p.dataset.f === f);
  });
  $("gQ").style.display = f === "jpeg" || f === "webp" ? "block" : "none";
}
$("sQu").addEventListener("input", function () {
  S.qual = +this.value;
  $("vQu").textContent = this.value + "%";
});
function setZoom(z) {
  S.zoom = Math.max(0.05, Math.min(5, z));
  cvs.style.transform = "scale(" + S.zoom + ")";
  cvs.style.transformOrigin = "center center";
  ovC.style.transform = "scale(" + S.zoom + ")";
  ovC.style.transformOrigin = "center center";
  $("zV").textContent = Math.round(S.zoom * 100) + "%";
}
function zi() {
  setZoom(S.zoom + 0.15);
}
function zo() {
  setZoom(S.zoom - 0.15);
}
function fitV() {
  var w = $("cWrap"),
    p = 40;
  setZoom(Math.min((w.clientWidth - p) / S.cw, (w.clientHeight - p) / S.ch, 1));
}
function togGrid() {
  S.gridOn = !S.gridOn;
  $("btnGrid").classList.toggle("on", S.gridOn);
  drawOv();
}
function capSt() {
  return {
    layers: S.layers.map(function (L) {
      return {
        id: L.id,
        name: L.name,
        x: L.x,
        y: L.y,
        w: L.w,
        h: L.h,
        opacity: L.opacity,
        visible: L.visible,
        blend: L.blend,
        shadowOn: L.shadowOn,
        shadowX: L.shadowX,
        shadowY: L.shadowY,
        shadowBlur: L.shadowBlur,
        shadowColor: L.shadowColor,
        borderOn: L.borderOn,
        borderW: L.borderW,
        borderC: L.borderC,
        data: L.cvs
          .getContext("2d")
          .getImageData(0, 0, L.cvs.width, L.cvs.height),
        ow: L.cvs.width,
        oh: L.cvs.height,
      };
    }),
    ai: S.ai,
    cw: S.cw,
    ch: S.ch,
  };
}
function resSt(st) {
  S.layers = st.layers.map(function (ls) {
    var c = document.createElement("canvas");
    c.width = ls.ow;
    c.height = ls.oh;
    c.getContext("2d").putImageData(ls.data, 0, 0);
    var oc = document.createElement("canvas");
    oc.width = ls.ow;
    oc.height = ls.oh;
    oc.getContext("2d").putImageData(ls.data, 0, 0);
    return {
      id: ls.id,
      name: ls.name,
      cvs: c,
      origCvs: oc,
      x: ls.x,
      y: ls.y,
      w: ls.w,
      h: ls.h,
      opacity: ls.opacity,
      visible: ls.visible,
      blend: ls.blend,
      shadowOn: ls.shadowOn,
      shadowX: ls.shadowX,
      shadowY: ls.shadowY,
      shadowBlur: ls.shadowBlur,
      shadowColor: ls.shadowColor,
      borderOn: ls.borderOn,
      borderW: ls.borderW,
      borderC: ls.borderC,
    };
  });
  S.ai = st.ai;
  S.cw = st.cw;
  S.ch = st.ch;
}
function pushH() {
  S.hist = S.hist.slice(0, S.hi + 1);
  S.hist.push(capSt());
  S.hi = S.hist.length - 1;
  updHist();
  updUR();
}
function undo() {
  if (S.hi > 0) {
    S.hi--;
    resSt(S.hist[S.hi]);
    renderAll();
    updLy();
    updInfo();
    updHist();
    updUR();
  }
}
function redo() {
  if (S.hi < S.hist.length - 1) {
    S.hi++;
    resSt(S.hist[S.hi]);
    renderAll();
    updLy();
    updInfo();
    updHist();
    updUR();
  }
}
function updUR() {
  $("btnUndo").disabled = S.hi <= 0;
  $("btnRedo").disabled = S.hi >= S.hist.length - 1;
}
function updHist() {
  var el = $("hList");
  el.innerHTML = "";
  S.hist.forEach(function (_, i) {
    var d = document.createElement("div");
    d.className = "hl-item" + (i === S.hi ? " cur" : "");
    d.innerHTML = '<span class="dt"></span>Estado ' + (i + 1);
    d.onclick = function () {
      S.hi = i;
      resSt(S.hist[i]);
      renderAll();
      updLy();
      updInfo();
      updHist();
      updUR();
    };
    el.appendChild(d);
  });
  el.scrollTop = el.scrollHeight;
}
function buildExp() {
  var tc = document.createElement("canvas");
  tc.width = S.cw;
  tc.height = S.ch;
  var tx = tc.getContext("2d");
  if (!$("cvsBgT").checked) {
    if (S.grad.type === "none") {
      tx.fillStyle = $("cvsBg").value;
      tx.fillRect(0, 0, S.cw, S.ch);
    }
  }
  for (var i = 0; i < S.layers.length; i++) {
    var L = S.layers[i];
    if (!L.visible) continue;
    tx.save();
    tx.globalAlpha = L.opacity;
    tx.globalCompositeOperation = L.blend;
    if (L.shadowOn) {
      tx.shadowOffsetX = L.shadowX;
      tx.shadowOffsetY = L.shadowY;
      tx.shadowBlur = L.shadowBlur;
      tx.shadowColor = L.shadowColor;
    }
    tx.drawImage(L.cvs, L.x, L.y, L.w, L.h);
    tx.restore();
    if (L.borderOn && L.borderW > 0) {
      tx.save();
      tx.globalAlpha = L.opacity;
      tx.strokeStyle = L.borderC;
      tx.lineWidth = L.borderW;
      tx.strokeRect(L.x, L.y, L.w, L.h);
      tx.restore();
    }
  }
  tx.globalAlpha = 1;
  tx.globalCompositeOperation = "source-over";
  if (hasAdj()) {
    var id = tx.getImageData(0, 0, S.cw, S.ch);
    appAdj(id);
    tx.putImageData(id, 0, 0);
  }
  return tc;
}
function doDownload() {
  if (!S.layers.length) {
    toast("Adicione imagens", "error");
    return;
  }
  var exp = buildExp(),
    fmt = S.fmt,
    ext = fmt === "jpeg" ? "jpg" : fmt,
    mime = "image/" + (fmt === "jpeg" ? "jpeg" : fmt),
    q = fmt === "jpeg" || fmt === "webp" ? S.qual / 100 : undefined,
    fn = "pixelMake Pro." + ext;
  try {
    exp.toBlob(
      function (b) {
        if (S.dlURL)
          try {
            URL.revokeObjectURL(S.dlURL);
          } catch (e) {}
        var url = b ? URL.createObjectURL(b) : exp.toDataURL(mime, q);
        if (b) S.dlURL = url;
        dlA.href = url;
        dlA.download = fn;
        dlA.click();
        toast(
          "Download: " + fn + (b ? " (" + fmtB(b.size) + ")" : ""),
          "success",
        );
      },
      mime,
      q,
    );
  } catch (e) {
    toast("Erro: " + e.message, "error");
  }
}
function showOrig() {
  if (S.layers.length && S.layers[0].origCvs) {
    ctx.clearRect(0, 0, cvs.width, cvs.height);
    ctx.drawImage(
      S.layers[0].origCvs,
      S.layers[0].x,
      S.layers[0].y,
      S.layers[0].w,
      S.layers[0].h,
    );
    cvs.style.filter = "none";
  }
}
function showCur() {
  renderAll();
}
function toast(m, t) {
  t = t || "info";
  var c = $("toasts"),
    e = document.createElement("div");
  e.className = "tt " + t;
  e.innerHTML =
    '<span style="font-weight:700">' +
    ({ su: "✓", er: "✕", in: "ℹ" }[t] || "ℹ") +
    "</span> " +
    m;
  c.appendChild(e);
  setTimeout(function () {
    e.style.animation = "fo .3s ease forwards";
    setTimeout(function () {
      e.remove();
    }, 300);
  }, 3000);
}
var upZ = $("upZone"),
  fI = $("fIn"),
  fI2 = $("fIn2");
upZ.addEventListener("click", function () {
  fI.click();
});
upZ.addEventListener("dragover", function (e) {
  e.preventDefault();
  upZ.classList.add("over");
});
upZ.addEventListener("dragleave", function () {
  upZ.classList.remove("over");
});
upZ.addEventListener("drop", function (e) {
  e.preventDefault();
  upZ.classList.remove("over");
  for (var i = 0; i < e.dataTransfer.files.length; i++)
    if (e.dataTransfer.files[i].type.startsWith("image/"))
      addFromFile(e.dataTransfer.files[i]);
});
fI.addEventListener("change", function (e) {
  for (var i = 0; i < e.target.files.length; i++)
    addFromFile(e.target.files[i]);
  e.target.value = "";
});
fI2.addEventListener("change", function (e) {
  for (var i = 0; i < e.target.files.length; i++)
    addFromFile(e.target.files[i]);
  e.target.value = "";
});
document.addEventListener("keydown", function (e) {
  if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
    e.preventDefault();
    undo();
  }
  if (
    (e.ctrlKey || e.metaKey) &&
    (e.key === "y" || (e.key === "z" && e.shiftKey))
  ) {
    e.preventDefault();
    redo();
  }
  if ((e.ctrlKey || e.metaKey) && e.key === "s") {
    e.preventDefault();
    doDownload();
  }
  if (e.key === "Escape") {
    cancelCrop();
  }
  if (e.key === "Enter" && crop.rect) {
    applyCrop();
  }
  if (e.key === "Delete" && S.ai >= 0) {
    delActive();
  }
  if (
    S.ai >= 0 &&
    ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].indexOf(e.key) >= 0
  ) {
    e.preventDefault();
    var L = S.layers[S.ai],
      st = e.shiftKey ? 10 : 1;
    if (e.key === "ArrowUp") L.y -= st;
    if (e.key === "ArrowDown") L.y += st;
    if (e.key === "ArrowLeft") L.x -= st;
    if (e.key === "ArrowRight") L.x += st;
    renderAll();
  }
  if (!e.ctrlKey && !e.metaKey && e.key >= "1" && e.key <= "9" && S.ai >= 0) {
    var modes = [
      "source-over",
      "multiply",
      "screen",
      "overlay",
      "darken",
      "lighten",
      "color-dodge",
      "hard-light",
      "difference",
    ];
    var idx = parseInt(e.key) - 1;
    if (idx < modes.length) {
      S.layers[S.ai].blend = modes[idx];
      $("blendSel").value = modes[idx];
      pushH();
      renderAll();
      toast("Blend: " + modes[idx], "info");
    }
  }
});
document.addEventListener("dragover", function (e) {
  e.preventDefault();
});
document.addEventListener("drop", function (e) {
  e.preventDefault();
});
(function () {
  var g = $("emoGrid");
  EMOJIS.forEach(function (em) {
    var b = document.createElement("button");
    b.className = "emoji-btn";
    b.textContent = em;
    b.onclick = function () {
      addEmoji(em);
    };
    g.appendChild(b);
  })();
  syncSl();
})();
