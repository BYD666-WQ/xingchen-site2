/* 星辰彩讯 · 公共数据层（只读主站数据，三源回退） */
(function () {
  "use strict";
  var MAIN = "https://byd666-wq.github.io/xingchen-caixun/";
  var CDN  = "https://cdn.jsdelivr.net/gh/BYD666-WQ/xingchen-caixun@main/";
  var RAW  = "https://raw.githubusercontent.com/BYD666-WQ/xingchen-caixun/main/";
  var VF_KEY = "Xc9vF2026";
  var ZODIAC = ["马","蛇","龙","兔","虎","牛","鼠","猪","狗","鸡","猴","羊"];
  var RED = [1,2,7,8,12,13,18,19,23,24,29,30,34,35,40,45,46];
  var BLUE = [3,4,9,10,14,15,20,25,26,31,36,37,41,42,47,48];
  var WAVE_NAME = { r: "红", b: "蓝", g: "绿" };
  var DAY_CN = ["星期日","星期一","星期二","星期三","星期四","星期五","星期六"];

  function raceFetch(path) {
    var bases = [MAIN, CDN, RAW];
    return new Promise(function (resolve, reject) {
      var done = false, left = bases.length;
      bases.forEach(function (base) {
        var AC = (typeof AbortController !== "undefined") ? new AbortController() : null;
        var TO = AC ? setTimeout(function () { try { AC.abort(); } catch (e) {} }, 4000) : null;
        fetch(base + path + "?t=" + Date.now(), { cache: "no-store", signal: AC ? AC.signal : undefined })
          .then(function (r) { if (!r.ok) throw new Error("http " + r.status); return r.json(); })
          .then(function (j) { if (!done) { done = true; if (TO) clearTimeout(TO); resolve(j); } else if (TO) clearTimeout(TO); })
          .catch(function (e) { left--; if (TO) clearTimeout(TO); if (left === 0 && !done) reject(e); });
      });
    });
  }

  function get(path) {
    var key = "s2c:" + path, cached = null;
    try { var raw = localStorage.getItem(key); if (raw) cached = JSON.parse(raw); } catch (e) {}
    var live = raceFetch(path).then(function (j) {
      try { localStorage.setItem(key, JSON.stringify(j)); } catch (e) {}
      return j;
    });
    if (cached) { live.catch(function () {}); return Promise.resolve(cached); }
    return live;
  }

  function dec(enc) {
    try {
      var bin = atob(String(enc || ""));
      var arr = new Uint8Array(bin.length);
      for (var i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i) ^ VF_KEY.charCodeAt(i % VF_KEY.length);
      return JSON.parse(new TextDecoder("utf-8").decode(arr));
    } catch (e) { return null; }
  }

  function mdCompat(md) {
    if (md && md.current && md.current.issue !== undefined) {
      var c = md.current;
      return { name: md.name, issue: c.issue, nums: c.nums || [], numsEnc: c.numsEnc,
        visibleFrom: c.visibleFrom, publishedAt: c.publishedAt || md.publishedAt,
        history: md.history || [], updated: md.updated, drawTime: md.drawTime };
    }
    return md || {};
  }

  function numsOf(md) {
    md = mdCompat(md);
    if (md.nums && md.nums.length === 7) return md.nums;
    if (md.numsEnc) { var n = dec(md.numsEnc); if (n && n.length) return n; }
    return [];
  }

  function colorOf(n) {
    var v = parseInt(n, 10);
    if (!v) return "g";
    if (RED.indexOf(v) >= 0) return "r";
    if (BLUE.indexOf(v) >= 0) return "b";
    return "g";
  }

  function zodiacOf(n, attrs) {
    var v = parseInt(n, 10);
    if (attrs && attrs[v] && attrs[v].zodiac) return attrs[v].zodiac;
    if (!v || v < 1 || v > 49) return "";
    return ZODIAC[(v - 1) % 12];
  }

  function shortIssue(x) { return String(x == null ? "" : x).slice(-3); }

  function pad2(x) { var v = parseInt(x, 10); if (!isFinite(v)) return String(x == null ? "" : x); return (v < 10 ? "0" : "") + v; }

  function nextDate(hm, days) {
    var n = new Date();
    var a = String(hm || "21:34").split(":");
    var t = new Date(n.getFullYear(), n.getMonth(), n.getDate(), parseInt(a[0], 10) || 21, parseInt(a[1], 10) || 34, 0);
    if (days && days.length) {
      for (var i = 0; i < 21; i++) {
        if (days.indexOf(t.getDay()) >= 0 && t > n) return t;
        t = new Date(t.getTime() + 864e5);
      }
      return t;
    }
    if (t <= n) t = new Date(t.getTime() + 864e5);
    return t;
  }

  function fmtCountdown(msLeft) {
    var s = Math.max(0, Math.floor(msLeft / 1000));
    return pad2(Math.floor(s / 3600)) + ":" + pad2(Math.floor(s % 3600 / 60)) + ":" + pad2(s % 60);
  }

  var TIMES_DEFAULT = {
    newhk: { time: "21:34", days: [0,1,2,3,4,5,6] },
    newmo: { time: "21:30", days: [0,1,2,3,4,5,6] },
    hk:    { time: "21:30", days: [0] }
  };
  function drawTimes(cfg) {
    var d = (cfg && cfg.drawTimes) || {};
    var out = {};
    ["newhk","newmo","hk"].forEach(function (k) {
      var x = d[k] || {};
      out[k] = { time: x.time || TIMES_DEFAULT[k].time, days: (x.days && x.days.length) ? x.days : TIMES_DEFAULT[k].days };
    });
    return out;
  }
  function nextDraw(kind, cfg) {
    var t = drawTimes(cfg)[kind] || TIMES_DEFAULT[kind];
    return nextDate(t.time, t.days);
  }

  function ballHtml(nums, attrs, opt) {
    opt = opt || {};
    var arr = (nums || []).slice(0, 7);
    var h = "";
    for (var i = 0; i < 7; i++) {
      var x = arr[i];
      if (i === 6 && !opt.noPlus && arr.length >= 7) h += '<span class="plus" style="flex:0 0 8px;align-self:center;font-weight:900;color:#7A6000">+</span>';
      if (!x) { h += '<div class="ball gray"><span class="n">?</span><span class="z">—</span></div>'; continue; }
      var c = x.c != null ? x.c : x;
      var z = x.z || zodiacOf(c, attrs);
      var w = colorOf(c);
      var ci = "c" + ((parseInt(c, 10) || 0) % 4 + 1);
      h += '<div class="ball ' + w + (i === 6 ? " j" : "") + '"><span class="n">' + pad2(c) + '</span><span class="z ' + ci + '">' + (z || (i === 6 ? "" : "—")) + '</span>' + (opt.wuxing ? '<span class="w">' + (opt.wuxing[c] || "") + '</span>' : '') + '</div>';
    }
    return h;
  }

  /* 九板块：数据源 + 摘要 + 命中判定 */
  var BLOCKS = [
    { key: "wuxiao", file: "data/wuxiao.json", name: "五肖五码", sub: "5 组生肖+号码",
      summary: function (r) { return (r.list || []).map(function (x) { return x.z; }).join(" "); },
      hit: function (r) { var z = r.special && r.special.z; return (r.list || []).some(function (x) { return x.z === z; }); } },
    { key: "santou", file: "data/santou.json", name: "三头中特", sub: "头数 0-9",
      summary: function (r) { return (r.heads || []).join(" / ") + " 头"; },
      hit: function (r) { var c = parseInt(r.special && r.special.c, 10); return c && (r.heads || []).indexOf(Math.floor(c / 10)) >= 0; } },
    { key: "shuangbo", file: "data/shuangbo.json", name: "必赢双波", sub: "双波组合",
      summary: function (r) { return (r.waves || []).join(" "); },
      hit: function (r) { var c = r.special && r.special.c; return (r.waves || []).indexOf(WAVE_NAME[colorOf(c)]) >= 0; } },
    { key: "danshuang", file: "data/danshuang.json", name: "单双", sub: "单双 + 三肖",
      summary: function (r) { return (r.oddEven || "") + " " + (r.zodiacs || []).join(""); },
      hit: function (r) { var c = parseInt(r.special && r.special.c, 10); var z = r.special && r.special.z;
        return ((r.oddEven === "单数") === (c % 2 === 1)) || (r.zodiacs || []).indexOf(z) >= 0; } },
    { key: "liuxiao", file: "data/liuxiao.json", name: "六肖六码", sub: "6 肖 6 码",
      summary: function (r) { return (r.list || []).map(function (x) { return x.z; }).join(" "); },
      hit: function (r) { var z = r.special && r.special.z; return (r.list || []).some(function (x) { return x.z === z; }); } },
    { key: "qiwei", file: "data/qiwei.json", name: "七尾中特", sub: "尾数命中",
      summary: function (r) { return "尾 " + (r.tails || "").split("").join(" "); },
      hit: function (r) { var c = r.special && r.special.c; return c && String(r.tails || "").indexOf(String(parseInt(c, 10) % 10)) >= 0; } },
    { key: "sisha", file: "data/sisha.json", name: "死杀三肖", sub: "排除三肖",
      summary: function (r) { return "杀 " + (r.sisha || []).join(" "); },
      hit: function (r) { var z = r.special && r.special.z; return (r.sisha || []).indexOf(z) < 0; } },
    { key: "pingte", file: "data/pingte.json", name: "平特①肖", sub: "平特逐期对照",
      summary: function (r) { return "平特 " + (r.zod || ""); },
      hit: function (r) { return r.special && r.special.z === r.zod; } },
    { key: "ds4", file: "data/danshuangsixiao.json", name: "单双四肖", sub: "单双 × 四肖",
      summary: function (r) { return "单 " + (r.dan || []).join("") + " / 双 " + (r.shuang || []).join(""); },
      hit: function (r) { var z = r.special && r.special.z; var c = parseInt(r.special && r.special.c, 10);
        return c % 2 === 1 ? (r.dan || []).indexOf(z) >= 0 : (r.shuang || []).indexOf(z) >= 0; } }
  ];

  function latestRows(arr, n) {
    if (!arr || !arr.rows) return [];
    return arr.rows.slice().sort(function (a, b) { return (parseInt(b.issue, 10) || 0) - (parseInt(a.issue, 10) || 0); }).slice(0, n || 5);
  }

  function rowsAsc(arr, n) {
    if (!arr || !arr.rows) return [];
    return arr.rows.slice().sort(function (a, b) { return (parseInt(a.issue, 10) || 0) - (parseInt(b.issue, 10) || 0); }).slice(-(n || 6));
  }

  function lastRow(arr) {
    var rs = latestRows(arr, 1);
    return rs.length ? rs[0] : null;
  }

  var attrMap = {};
  function setAttrs(arr) {
    attrMap = {};
    if (arr && arr.rows) arr.rows.forEach(function (x) { attrMap[parseInt(x.num, 10)] = x; });
  }

  function zodiacTableHtml() {
    var order = ["鼠","牛","虎","兔","龙","蛇","马","羊","猴","鸡","狗","猪"];
    var map = {};
    for (var n = 1; n <= 49; n++) {
      var z = (attrMap[n] && attrMap[n].zodiac) || ZODIAC[(n - 1) % 12];
      (map[z] = map[z] || []).push(n);
    }
    return order.map(function (z) {
      var nums = (map[z] || []).map(function (n) {
        var c = colorOf(n);
        return '<i class="' + c + '">' + pad2(n) + '</i>';
      }).join(" ");
      return '<div class="zc' + (z === lastSpecialZ ? " hot" : "") + '"><b>' + z + '</b><span class="n">' + nums + '</span></div>';
    }).join("");
  }
  var lastSpecialZ = "";

  function el(sel, root) { return (root || document).querySelector(sel); }
  function els(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function showErr(msg) {
    var e = el("#err");
    if (e) {
      e.style.display = "block";
      e.innerHTML = "数据加载遇到问题：" + (msg || "网络异常") + ' <a href="javascript:location.reload()" style="margin-left:8px;background:#D40000;color:#FFE86A;padding:1px 8px;border:1px solid #111;text-decoration:none">重试</a>';
    }
    var l = el("#loading"); if (l) l.style.display = "none";
  }

  var API = {
    get: get, dec: dec, mdCompat: mdCompat, numsOf: numsOf, colorOf: colorOf,
    zodiacOf: zodiacOf, shortIssue: shortIssue, pad2: pad2, nextDate: nextDate,
    fmtCountdown: fmtCountdown, drawTimes: drawTimes, nextDraw: nextDraw,
    ballHtml: ballHtml, BLOCKS: BLOCKS, latestRows: latestRows, rowsAsc: rowsAsc, lastRow: lastRow,
    setAttrs: setAttrs, zodiacTableHtml: zodiacTableHtml, attrMap: function () { return attrMap; },
    setLastSpecialZ: function (z) { lastSpecialZ = z; },
    el: el, els: els, showErr: showErr,
    MAIN: MAIN, CDN: CDN, RAW: RAW,
    imgUrl: function (p) { return MAIN + String(p || "").replace(/^\/+/, ""); },
    imgFallback: function (p) { return CDN + String(p || "").replace(/^\/+/, ""); },
    imgTag: function (p, alt, cls) {
      var real = String(p || "").replace(/^\/+/, "");
      if (!real) return "";
      var a = alt || "";
      return '<img class="' + (cls || "") + '" loading="lazy" src="' + MAIN + real + '" data-fb="' + CDN + real + '" alt="' + a.replace(/"/g, "&quot;") + '" onerror="if(this.dataset.fb&&!this.dataset.tried){this.dataset.tried=1;this.src=this.dataset.fb}else{this.style.background=\'#FFF3A0\';this.removeAttribute(\'src\')}">';
    }
  };
  window.SD = API;
})();