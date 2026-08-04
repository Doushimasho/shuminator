/* ============================================================
   シュミネーター 趣味図鑑ジェネレータ
   hobbies.js / videos.js を読み、全趣味の個別ページと図鑑一覧を生成する。
   GitHub Actions から実行される想定(手動実行も可: node build_pages.js)。
   ------------------------------------------------------------
   出力: hobby/1.html 〜 hobby/N.html / zukan.html / sitemap.xml
   注意: ページ番号は hobbies.js の並び順に依存する。並びは「末尾に追記」
        のみとし、途中の削除・並べ替えをしないこと(URLが変わるため)。
   ============================================================ */
const fs = require('fs');
const path = require('path');

const SITE = 'https://doushimasho.github.io/shuminator';
const AMAZON_TAG = 'doushimasho44-22';

// ---------- データ読み込み ----------
function loadHobbies() {
  const src = fs.readFileSync('hobbies.js', 'utf8');
  const m = src.match(/const HOBBIES=\[\n([\s\S]*?)\n\];/);
  if (!m) throw new Error('hobbies.js の HOBBIES 配列が見つかりません');
  return eval('[' + m[1] + ']');
}
function loadVideos() {
  try {
    const t = fs.readFileSync('videos.js', 'utf8');
    const a = t.indexOf('{', t.indexOf('BAKED_VIDEOS'));
    const b = t.lastIndexOf('}');
    return eval('(' + t.slice(a, b + 1) + ')');
  } catch (e) {
    console.warn('videos.js を読めませんでした(動画なしで生成します):', e.message);
    return {};
  }
}

const HOBBIES = loadHobbies();
const VIDEOS = loadVideos();
console.log('趣味数:', HOBBIES.length, '/ 動画つき:', Object.keys(VIDEOS).length);

// ---------- ラベル定義 ----------
const CORES = ['上達','攻略','達成','競う','組む','表現','模倣','発見','深掘','繋がる',
               '披露','育てる','推す','収集','愛でる','記録','高揚','静穏','躍動','物語'];
const GAIN  = ['体験が残る','からだが変わる','技が身につく','記録が集まる','かたちに残る'];
const SPAN  = ['5分の隙間から','1〜2時間','半日〜1日','数日がかり','何年もかけて育てる'];
const CURVE = ['初日から楽しい','わりとすぐ楽しい','ほどよく練習','じっくり練習','極めるほど深い'];
const CULT  = ['和のもの','アジア・エスニック','洋のもの','国を問わない'];
const OUT   = ['完全に室内','ほぼ室内','室内でも外でも','外が主役','がっつり屋外'];
const COST  = ['ほぼ0円から','数千円から','1万円前後から','数万円から','しっかり投資'];
const RARE  = ['とても珍しい','珍しい','ほどよく知られている','よく知られている','定番中の定番'];

// ---------- 相性のいい趣味(エンジンと同じ考え方) ----------
function coreVec(h) { return CORES.map(c => (h[3][c] || 0) / 4); }
function coreDist(a, b) { let d = 0; for (let k = 0; k < 20; k++) { const x = a[k] - b[k]; d += x * x; } return Math.sqrt(d); }
function mates(ri) {
  const base = coreVec(HOBBIES[ri]);
  return HOBBIES.map((h, j) => {
    if (j === ri) return { j, s: -1 };
    const c = coreDist(base, coreVec(h));
    if (c < 0.35) return { j, s: -1 };            // 似すぎは除外
    let s = (1 - Math.min(1, c / 2.4)) * 2;
    if (h[2] === HOBBIES[ri][2]) s *= 0.25;        // 同じ細領域は控えめ
    else if (h[1] === HOBBIES[ri][1]) s *= 0.6;
    return { j, s };
  }).filter(x => x.s > 0).sort((a, b) => b.s - a.s).slice(0, 3).map(x => x.j);
}

// ---------- HTML部品 ----------
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const amazon = kw => `https://www.amazon.co.jp/s?k=${encodeURIComponent(kw)}&tag=${AMAZON_TAG}`;

const STYLE = `
:root{--gold:#f7be46;--ink:#ece9f4;--sakura:#ffb7c5;--washi:#faf4e6;--sumi:#37302a;--dim:#b7a6d6}
*{box-sizing:border-box}
body{margin:0;font-family:"Zen Maru Gothic",system-ui,sans-serif;background:linear-gradient(165deg,#1c1638,#2c1e52 55%,#46305f);background-attachment:fixed;color:var(--ink);line-height:1.85;-webkit-font-smoothing:antialiased}
a{color:var(--sakura)}
.wrap{max-width:780px;margin:0 auto;padding:18px 18px 70px}
.brand{display:block;text-align:center;font-family:"RocknRoll One",sans-serif;font-size:clamp(22px,6vw,32px);background:linear-gradient(180deg,#fff8dc,#ffe680 30%,#f7be46 52%,#ffdd76 74%,#e79a2b);-webkit-background-clip:text;background-clip:text;color:transparent;-webkit-text-stroke:1.2px #6a3a12;filter:drop-shadow(0 3px 2px rgba(0,0,0,.5));text-decoration:none;padding:14px 0 4px}
.crumb{font-size:12.5px;color:var(--dim);text-align:center;margin:6px 0 18px}
.crumb a{color:var(--dim)}
.card{background:var(--washi);color:var(--sumi);border-radius:20px;padding:24px 22px;box-shadow:0 12px 34px rgba(0,0,0,.42)}
h1{font-family:"RocknRoll One",sans-serif;font-size:clamp(27px,7vw,40px);line-height:1.3;margin:2px 0 4px;color:#453058;text-align:center}
.tagline{text-align:center;color:#b9557d;font-size:13px;font-weight:700;letter-spacing:.04em;margin:0 0 14px}
.rule{height:3px;background:linear-gradient(90deg,transparent,#f0b64e,transparent);margin:12px 0 18px;border-radius:2px}
.desc{font-size:15.5px;color:#4c443c;margin:0 0 20px}
h2{font-size:14px;color:#7a4a86;letter-spacing:.06em;margin:24px 0 10px;padding-left:9px;border-left:4px solid #f0b64e}
.chips{display:flex;flex-wrap:wrap;gap:8px}
.chip{background:#7a4a86;color:#fff;border-radius:999px;padding:6px 15px;font-size:13.5px;font-weight:700}
.spec{display:grid;grid-template-columns:auto 1fr;gap:9px 16px;font-size:14px}
.spec dt{color:#8a7d72;white-space:nowrap}
.spec dd{margin:0;font-weight:700;color:#453058}
.meter{display:inline-block;letter-spacing:2px;color:#f0b64e}
.meter i{color:#ded3bd;font-style:normal}
.tools{display:grid;gap:10px}
.tool{display:block;background:#f2ebda;border-radius:12px;padding:12px 14px;text-decoration:none;color:var(--sumi);border:1px solid #e5d9bd}
.tool b{color:#b9557d;font-size:14.5px}
.tool span{display:block;font-size:12.5px;color:#7d726a;margin-top:2px}
.vids{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:12px}
.vid{display:block;text-decoration:none;color:var(--sumi)}
.vid img{width:100%;border-radius:10px;display:block;background:#ded3bd}
.vid span{display:block;font-size:12px;margin-top:5px;line-height:1.5}
.mates{display:flex;flex-wrap:wrap;gap:9px}
.mate{background:#fff;border:1.5px solid #e0d3b4;border-radius:999px;padding:7px 15px;font-size:14px;text-decoration:none;color:#7a4a86;font-weight:700}
.cta{display:block;text-align:center;background:linear-gradient(180deg,#ff7db0,#e0568a);color:#fff;font-weight:700;font-size:17px;text-decoration:none;padding:15px;border-radius:14px;margin:24px 0 6px;box-shadow:0 6px 0 #b23a6e}
.cta small{display:block;font-weight:500;font-size:12.5px;opacity:.92;margin-top:3px}
.nav{display:flex;justify-content:space-between;gap:10px;margin-top:22px;font-size:13px}
.nav a{background:rgba(255,255,255,.09);border-radius:10px;padding:9px 13px;text-decoration:none;color:var(--ink);flex:1}
.nav a.next{text-align:right}
footer{text-align:center;color:var(--dim);font-size:12px;margin-top:26px;line-height:1.9}
/* 図鑑一覧 */
.tools-bar{display:flex;gap:8px;flex-wrap:wrap;margin:0 0 16px}
#q{flex:1;min-width:180px;padding:11px 14px;border-radius:12px;border:1.5px solid rgba(255,255,255,.25);background:rgba(255,255,255,.08);color:#fff;font-size:15px;font-family:inherit}
#q::placeholder{color:#a294c4}
.gsel{padding:11px 12px;border-radius:12px;border:1.5px solid rgba(255,255,255,.25);background:#2c1e52;color:#fff;font-size:14px;font-family:inherit}
.genre{margin:26px 0 8px;font-size:16px;color:var(--gold);font-weight:700;border-bottom:1px solid rgba(247,190,70,.35);padding-bottom:6px}
.list{display:grid;grid-template-columns:repeat(auto-fill,minmax(158px,1fr));gap:8px}
.item{display:block;background:rgba(255,255,255,.07);border-radius:10px;padding:10px 12px;text-decoration:none;color:var(--ink);font-size:14px;border:1px solid rgba(255,255,255,.09)}
.item:hover{background:rgba(255,255,255,.14)}
.count{color:var(--dim);font-size:13px;text-align:center;margin-bottom:4px}
/* ランダム生成 */
.gen{text-align:center}
.genh1{font-family:"RocknRoll One",sans-serif;font-size:clamp(23px,5.6vw,32px);color:#fff;margin:4px 0 14px}
.slot{background:rgba(255,255,255,.07);border:2px solid rgba(247,190,70,.45);border-radius:16px;min-height:96px;display:flex;align-items:center;justify-content:center;padding:12px;margin-bottom:14px}
.slot.spinning{border-color:rgba(255,125,176,.75)}
.slot-idle{color:#a294c4;font-size:15px}
.slot-run{font-family:"RocknRoll One",sans-serif;font-size:clamp(24px,6vw,34px);color:#cbbde6;opacity:.75}
.slot-hit{font-family:"RocknRoll One",sans-serif;font-size:clamp(28px,7.5vw,44px);color:var(--gold);text-shadow:0 3px 0 rgba(106,58,18,.85)}
.spin{width:100%;background:linear-gradient(180deg,#ff7db0,#e0568a);color:#fff;font-family:inherit;font-weight:700;font-size:19px;border:none;padding:17px;border-radius:15px;box-shadow:0 6px 0 #b23a6e;cursor:pointer}
.spin:active{transform:translateY(3px);box-shadow:0 3px 0 #b23a6e}
.spin:disabled{filter:grayscale(.6);opacity:.6;cursor:not-allowed}
.opt{display:flex;flex-wrap:wrap;gap:7px;justify-content:center;margin:14px 0 6px}
.gsel2{padding:9px 10px;border-radius:10px;border:1.5px solid rgba(255,255,255,.22);background:#2c1e52;color:#fff;font-size:13.5px;font-family:inherit}
.hit{color:var(--dim);font-size:12.5px;margin:2px 0 12px}
.out{display:grid;gap:12px}
.rcard{background:var(--washi);color:var(--sumi);border-radius:16px;padding:16px 16px 14px;text-align:left;box-shadow:0 6px 18px rgba(0,0,0,.28)}
.rcat{margin:0;font-size:11.5px;color:#b9557d;font-weight:700;letter-spacing:.04em}
.rname{font-family:"RocknRoll One",sans-serif;font-size:clamp(20px,5.4vw,25px);color:#453058;margin:3px 0 8px;line-height:1.35}
.rchips{display:flex;flex-wrap:wrap;gap:5px;margin-bottom:9px}
.rchip{background:#7a4a86;color:#fff;border-radius:999px;padding:3px 11px;font-size:11.5px;font-weight:700;font-style:normal}
.rdesc{margin:0 0 11px;font-size:13.5px;line-height:1.8;color:#4c443c}
.rspecs{display:grid;grid-template-columns:1fr 1fr;gap:5px 10px;border-top:1px solid #e5d9bd;padding-top:10px}
.rspec{display:flex;gap:6px;align-items:baseline;min-width:0}
.rspec .rk{font-size:11px;color:#a2968a;white-space:nowrap}
.rspec .rv{font-size:12.5px;font-weight:700;color:#453058;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.rspec:last-child{grid-column:1 / -1}
.rmore{display:block;margin-top:11px;text-align:center;background:#7a4a86;color:#fff;text-decoration:none;font-size:13px;font-weight:700;padding:10px;border-radius:10px}
@media(max-width:380px){
  .rspecs{grid-template-columns:1fr}
  .rspec:last-child{grid-column:auto}
  .rdesc{font-size:13px}
}
.acts{display:flex;gap:9px;justify-content:center;margin-top:14px}
.faq2 dt{font-weight:700;color:#7a4a86;margin-top:15px;font-size:14.5px}
.faq2 dd{margin:4px 0 0;font-size:14px;color:#5c5148}
.mini{background:rgba(255,255,255,.1);border:1.5px solid rgba(255,255,255,.24);color:var(--ink);font-family:inherit;font-size:13.5px;padding:9px 16px;border-radius:10px;text-decoration:none;cursor:pointer}
/* 上部CTA */
.cta-top{display:block;text-align:center;background:linear-gradient(180deg,#ff7db0,#e0568a);color:#fff;font-weight:700;font-size:15.5px;text-decoration:none;padding:12px 16px;border-radius:13px;margin:0 0 16px;box-shadow:0 5px 0 #b23a6e}
.cta-top small{display:block;font-weight:500;font-size:12px;opacity:.92;margin-top:2px}
/* 常に押せる浮遊ボタン */
.fab{position:fixed;right:16px;bottom:16px;z-index:50;background:linear-gradient(180deg,#ff7db0,#e0568a);color:#fff;font-weight:700;font-size:14.5px;text-decoration:none;padding:13px 20px;border-radius:999px;box-shadow:0 6px 18px rgba(0,0,0,.45);border:2px solid rgba(255,255,255,.28)}
.fab:hover{filter:brightness(1.06)}
@media(max-width:480px){.fab{right:12px;bottom:12px;font-size:13.5px;padding:12px 17px}}
`;

function head(title, desc, canonical, extraJsonLd) {
  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${canonical}">
<meta property="og:type" content="article">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:image" content="${SITE}/ogp.png?v=3">
<meta property="og:url" content="${canonical}">
<meta property="og:site_name" content="シュミネーター">
<link rel="icon" type="image/png" sizes="32x32" href="${SITE}/favicon-32.png">
<script data-goatcounter="https://shuminator.goatcounter.com/count" async src="//gc.zgo.at/count.js"></script>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=RocknRoll+One&family=Zen+Maru+Gothic:wght@400;500;700&display=swap" rel="stylesheet">
${extraJsonLd || ''}
<style>${STYLE}</style>
</head>
<body><div class="wrap">
<a class="brand" href="${SITE}/">シュミネーター</a>`;
}

function meter(v, max) {
  let s = '';
  for (let i = 0; i < max; i++) s += (i <= v ? '●' : '<i>●</i>');
  return `<span class="meter">${s}</span>`;
}

// ---------- 個別ページ ----------
function hobbyPage(h, i) {
  const id = i + 1;
  const url = `${SITE}/hobby/${id}.html`;
  const cores = Object.entries(h[3]).sort((a, b) => b[1] - a[1]).slice(0, 5).map(x => x[0]);
  const mt = mates(i);
  const vids = (VIDEOS[h[0]] && VIDEOS[h[0]].v) ? VIDEOS[h[0]].v.slice(0, 3) : [];
  const g = h[11] !== undefined ? h[11] : 2;
  const sp = h[12] !== undefined ? h[12] : 1;
  const cv = h[13] !== undefined ? h[13] : 2;
  const cl = h[14] !== undefined ? h[14] : 3;
  const desc = `${h[0]}とは——${h[5]} 「${cores.slice(0,3).join('・')}」に惹かれる人に向いています。始め方・道具・相性のいい趣味も紹介。`;

  const jsonld = `<script type="application/ld+json">${JSON.stringify({
    "@context": "https://schema.org", "@type": "Article",
    "headline": `${h[0]}｜趣味図鑑`,
    "about": h[0],
    "description": h[5],
    "author": { "@type": "Person", "name": "導師真ショウ", "jobTitle": "国家資格キャリアコンサルタント" },
    "publisher": { "@type": "Organization", "name": "シュミネーター" },
    "inLanguage": "ja", "mainEntityOfPage": url
  })}</script>`;

  let s = head(`${h[0]}とは｜趣味図鑑｜シュミネーター`, desc, url, jsonld);
  s += `\n<p class="crumb"><a href="${SITE}/zukan.html">趣味図鑑</a> › ${esc(h[1])} › ${esc(h[2])}</p>`;
  s += `\n<a class="cta-top" href="${SITE}/?p=303">▶ あなたに眠る趣味を診断してもらう<small>質問に答えるだけ・3分・無料・全1000種から</small></a>`;
  s += `\n<div class="card">`;
  s += `\n<p class="tagline">No.${id} ／ ${esc(h[1])}</p>`;
  s += `\n<h1>${esc(h[0])}</h1>`;
  s += `\n<div class="rule"></div>`;
  s += `\n<p class="desc">${esc(h[5])}</p>`;

  s += `\n<h2>こんな人に、眠っています</h2>\n<div class="chips">${cores.map(c => `<span class="chip">${esc(c)}タイプ</span>`).join('')}</div>`;

  s += `\n<h2>この趣味のかたち</h2>\n<dl class="spec">`;
  s += `<dt>のこるもの</dt><dd>${GAIN[g]}</dd>`;
  s += `<dt>時間の単位</dt><dd>${SPAN[sp]}</dd>`;
  s += `<dt>上達の道のり</dt><dd>${CURVE[cv]}</dd>`;
  s += `<dt>文化の色</dt><dd>${CULT[cl]}</dd>`;
  s += `<dt>外でやる度</dt><dd>${meter(h[7], 5)} ${OUT[h[7]]}</dd>`;
  s += `<dt>はじめる費用</dt><dd>${meter(h[8], 5)} ${COST[h[8]]}</dd>`;
  s += `<dt>めずらしさ</dt><dd>${meter(4 - (h[10] !== undefined ? h[10] : 2), 5)} ${RARE[h[10] !== undefined ? h[10] : 2]}</dd>`;
  s += `</dl>`;

  if (h[6] && h[6].length) {
    s += `\n<h2>はじめるための道具</h2>\n<div class="tools">`;
    h[6].forEach(t => {
      s += `<a class="tool" href="${amazon(t[0])}" target="_blank" rel="noopener nofollow"><b>${esc(t[0])}</b><span>${esc(t[1])}</span></a>`;
    });
    s += `</div>`;
  }

  if (vids.length) {
    s += `\n<h2>まず観てみる</h2>\n<div class="vids">`;
    vids.forEach(v => {
      s += `<a class="vid" href="https://www.youtube.com/watch?v=${esc(v.id)}" target="_blank" rel="noopener"><img loading="lazy" src="https://i.ytimg.com/vi/${esc(v.id)}/mqdefault.jpg" alt="${esc(v.t)}"><span>${esc(v.t)}</span></a>`;
    });
    s += `</div>`;
  }

  if (mt.length) {
    s += `\n<h2>相性のいい趣味</h2>\n<div class="mates">`;
    mt.forEach(j => { s += `<a class="mate" href="${SITE}/hobby/${j + 1}.html">${esc(HOBBIES[j][0])}</a>`; });
    s += `</div>`;
  }

  s += `\n<a class="cta" href="${SITE}/">あなたに眠る趣味を診断する<small>質問に答えるだけ・3分・全1000種から神様が見抜きます</small></a>`;
  s += `\n</div>`;

  const prev = i > 0 ? HOBBIES[i - 1][0] : null;
  const next = i < HOBBIES.length - 1 ? HOBBIES[i + 1][0] : null;
  s += `\n<div class="nav">`;
  s += prev ? `<a href="${SITE}/hobby/${i}.html">← ${esc(prev)}</a>` : `<a href="${SITE}/zukan.html">← 図鑑へ</a>`;
  s += next ? `<a class="next" href="${SITE}/hobby/${i + 2}.html">${esc(next)} →</a>` : `<a class="next" href="${SITE}/zukan.html">図鑑へ →</a>`;
  s += `</div>`;
  s += `\n<footer><a href="${SITE}/zukan.html">趣味図鑑トップ</a> ・ <a href="${SITE}/hobby-finder.html">趣味の見つけ方</a><br>監修:導師真ショウ(国家資格キャリアコンサルタント)<br><a href="${SITE}/">シュミネーター</a>は、全1000種からあなたに眠る趣味を見抜く無料の診断ゲームです。</footer>`;
  s += `\n</div><a class="fab" href="${SITE}/?p=304">🔮 趣味を診断する</a></body></html>`;
  return s;
}

// ---------- 図鑑一覧 ----------
function zukanPage() {
  const url = `${SITE}/zukan.html`;
  const byGenre = {};
  HOBBIES.forEach((h, i) => { (byGenre[h[1]] = byGenre[h[1]] || []).push([h[0], i + 1]); });
  let s = head(`趣味図鑑 全${HOBBIES.length}種｜シュミネーター`,
    `世の中の趣味を${HOBBIES.length}種、20ジャンルに分類した図鑑。それぞれの始め方・道具・相性のいい趣味がわかります。`,
    url);
  s += `\n<p class="crumb">全${HOBBIES.length}種・20ジャンルの趣味図鑑</p>`;
  s += `\n<a class="cta-top" href="${SITE}/?p=305">▶ あなたに眠る趣味を診断してもらう<small>どれが自分に合うか、神様に見抜いてもらえます(無料・3分)</small></a>`;
  s += `\n<div class="tools-bar"><input id="q" type="search" placeholder="趣味名で検索（例：苔、ボード、和）" aria-label="趣味名で検索">
<select class="gsel" id="gsel"><option value="">すべてのジャンル</option>${Object.keys(byGenre).map(g => `<option>${esc(g)}</option>`).join('')}</select></div>`;
  s += `\n<p class="count" id="cnt"></p>`;
  Object.entries(byGenre).forEach(([g, arr]) => {
    s += `\n<section data-genre="${esc(g)}"><h3 class="genre">${esc(g)}<span style="color:#b7a6d6;font-size:13px;font-weight:400"> ${arr.length}種</span></h3><div class="list">`;
    arr.forEach(([n, id]) => { s += `<a class="item" href="${SITE}/hobby/${id}.html">${esc(n)}</a>`; });
    s += `</div></section>`;
  });
  s += `\n<a class="cta" href="${SITE}/">この中から、あなたの趣味を見抜いてもらう<small>質問に答えるだけ・3分・無料</small></a>`;
  s += `\n<footer><a href="${SITE}/hobby-finder.html">趣味の見つけ方</a> ・ <a href="${SITE}/solo-hobbies.html">一人でできる趣味</a> ・ <a href="${SITE}/indoor-hobbies.html">インドアの趣味</a><br>監修:導師真ショウ(国家資格キャリアコンサルタント)</footer>`;
  s += `
<script>
(function(){
  var q=document.getElementById('q'), gs=document.getElementById('gsel'), cnt=document.getElementById('cnt');
  var secs=[].slice.call(document.querySelectorAll('section[data-genre]'));
  function run(){
    var t=(q.value||'').trim(), g=gs.value, total=0;
    secs.forEach(function(sec){
      var hit=0;
      [].slice.call(sec.querySelectorAll('.item')).forEach(function(a){
        var ok=(!t||a.textContent.indexOf(t)>=0)&&(!g||sec.dataset.genre===g);
        a.style.display=ok?'':'none'; if(ok)hit++;
      });
      sec.style.display=hit?'':'none'; total+=hit;
    });
    cnt.textContent=(t||g)?total+'種が見つかりました':'';
  }
  q.addEventListener('input',run); gs.addEventListener('change',run);
})();
</script>`;
  s += `\n</div><a class="fab" href="${SITE}/?p=306">🔮 趣味を診断する</a></body></html>`;
  return s;
}

// ---------- ランダム趣味ジェネレーター ----------
function randomPage() {
  const url = `${SITE}/random.html`;
  // ページに埋め込む最小限のデータ（名前/ID/ジャンル/費用/屋外/時間/習得/文化）
  const data = HOBBIES.map((h, i) => [
    h[0], i + 1, h[1],
    h[8], h[7],
    (h[12] !== undefined ? h[12] : 1),
    (h[13] !== undefined ? h[13] : 2),
    (h[14] !== undefined ? h[14] : 3),
    h[5],                                                   // 説明文
    Object.entries(h[3]).sort((a,b)=>b[1]-a[1]).slice(0,3).map(x=>x[0]), // 魅力の核 上位3
    h[2],                                                   // 細領域
    (h[11] !== undefined ? h[11] : 2)                       // 成果のかたち
  ]);
  const genres = [...new Set(HOBBIES.map(h => h[1]))];

  const jsonld = `<script type="application/ld+json">${JSON.stringify({
    "@context": "https://schema.org", "@type": "WebApplication",
    "name": "ランダム趣味ジェネレーター",
    "applicationCategory": "EntertainmentApplication",
    "operatingSystem": "Web",
    "description": `全${HOBBIES.length}種の趣味からランダムに1つ選ぶ無料ツール。条件を絞って生成でき、暇つぶし・配信のネタ決め・創作のお題出しに使えます。`,
    "offers": { "@type": "Offer", "price": "0", "priceCurrency": "JPY" },
    "inLanguage": "ja", "url": url
  })}</script>`;

  const faqld = `<script type="application/ld+json">${JSON.stringify({
    "@context":"https://schema.org","@type":"FAQPage","mainEntity":[
      {"@type":"Question","name":"趣味をランダムに決めるメリットは?","acceptedAnswer":{"@type":"Answer","text":"選択肢が多すぎると人はかえって選べなくなります。ランダムに決めてしまうと、迷う時間がなくなり、自分では選ばなかったものに出会えます。合わなければやめていいので、気軽に試せます。"}},
      {"@type":"Question","name":"やることがなくて暇なとき、何をすればいいですか?","acceptedAnswer":{"@type":"Answer","text":"何をするか決められないときは、条件だけ決めて残りを運に任せるのが有効です。予算0円・室内・すきま時間といった条件で絞り、出てきたものをその日は試してみる、という決め方ができます。"}},
      {"@type":"Question","name":"お金をかけずにできる趣味はありますか?","acceptedAnswer":{"@type":"Answer","text":"あります。予算を「ほぼ0円から」に設定すると、道具をほとんど必要としない趣味だけが表示されます。散歩系・観察系・言葉遊び系などが該当します。"}},
      {"@type":"Question","name":"配信や動画で使ってもいいですか?","acceptedAnswer":{"@type":"Answer","text":"自由にお使いいただけます。許可や連絡は不要です。出た趣味について話す、実際にやってみる、といった企画にそのまま使えます。"}}
    ]})}</script>`;
  let s2 = head(
    `ランダム趣味ジェネレーター｜やることが決まらない日に、${HOBBIES.length}種から趣味を1つ引く`,
    `暇なのに何をするか決められないとき、ボタンひとつで${HOBBIES.length}種の趣味からランダムに1つ選びます。予算・室内屋外・かかる時間で絞り込み可能。休日の予定決め、配信のネタ決め、創作のお題出しにも。登録不要・無料。`,
    url, jsonld + faqld);

  s2 += `\n<p class="crumb">全${HOBBIES.length}種からランダムに1つ選びます・登録不要・無料</p>`;
  s2 += `
<div class="gen">
  <h1 class="genh1">ランダム趣味ジェネレーター</h1>
  <div id="slot" class="slot"><span class="slot-idle">ボタンを押してください</span></div>
  <button id="spin" class="spin">🎲 趣味を引く</button>
  <div class="opt">
    <select id="g" class="gsel2"><option value="">ジャンル：すべて</option>${genres.map(g => `<option>${esc(g)}</option>`).join('')}</select>
    <select id="c" class="gsel2"><option value="">予算：こだわらない</option><option value="0">ほぼ0円から</option><option value="1">数千円まで</option><option value="2">1万円くらいまで</option></select>
    <select id="o" class="gsel2"><option value="">場所：こだわらない</option><option value="in">室内でできる</option><option value="out">外でやる</option></select>
    <select id="t" class="gsel2"><option value="">時間：こだわらない</option><option value="0">すきま時間</option><option value="1">1〜2時間</option><option value="2">半日つかう</option><option value="4">何年も育てる</option></select>
    <select id="v" class="gsel2"><option value="">難度：こだわらない</option><option value="easy">初日から楽しめる</option><option value="deep">じっくり極める</option></select>
    <select id="n" class="gsel2"><option value="1">1つ引く</option><option value="3">3つ引く</option><option value="5">5つ引く</option></select>
  </div>
  <p id="hit" class="hit"></p>
  <div id="out" class="out"></div>
  <div id="acts" class="acts" style="display:none">
    <button id="copy" class="mini">結果をコピー</button>
    <a id="xsh" class="mini" href="#" target="_blank" rel="noopener">Xでシェア</a>
  </div>
</div>

<div class="card" style="margin-top:22px">
<h2>やることが決まらない日に</h2>
<p style="font-size:14.5px">
休みなのに、何をするか決められない。時間はあるのに、気づいたら夕方になっている。<br><br>
そういう日は、やる気がないのではなく、<b>選択肢が多すぎて選べなくなっている</b>だけなのかもしれません。人は選べる数が増えるほど、かえって決められなくなると言われています。<br><br>
そんなときは、<b>条件だけ決めて、残りは運に任せてしまう</b>のもひとつの方法です。「今日は0円で、家の中で、すきま時間にできるもの」——それだけ決めて引いてしまえば、迷っている時間はゼロになります。<br><br>
出たものが合わなければ、やめてかまいません。<b>一生の趣味を探すのではなく、今日の数十分を決めるだけ</b>と思うと、気楽に引けます。
</p>
<h2>こんなときに</h2>
<p style="font-size:14.5px">
<b>休みの日、何をするか決まらないとき。</b>選択肢が多すぎると人は選べなくなります。いっそ運に任せてしまうと、案外すんなり動き出せることがあります。<br><br>
<b>配信や動画のネタ決めに。</b>「出た趣味について語る」「出た趣味を実際にやってみる」など、そのまま企画になります。配信・動画でのご利用は自由です（許可・連絡は不要）。<br><br>
<b>創作のお題出しに。</b>キャラクターの趣味を決める、物語の設定を転がす。実在する${HOBBIES.length}種から出るので、リアリティのある設定になります。<br><br>
<b>友達や家族と。</b>「今月はこれをやってみる」と決めてしまう遊び方も。ひとりで選ぶより、案外続きます。
</p>
<h2>使い方</h2>
<p style="font-size:14.5px">ボタンを押すだけです。条件を絞りたいときは、ジャンル・予算・場所・時間・難度から選んでください。出てきた趣味の名前をタップすると、その趣味の図鑑ページ（道具・費用・始め方の動画・相性のいい趣味）が開きます。</p>
<h2>よくある質問</h2>
<dl class="faq2">
<dt>趣味をランダムに決めて、意味があるの?</dt>
<dd>自分で選ぶと、どうしても知っているものの中から選んでしまいます。ランダムなら、自分では絶対に選ばなかったものに当たります。合わなければやめていいので、試す回数を増やせるのが利点です。</dd>
<dt>お金をかけずにできる趣味を探したい</dt>
<dd>予算を「ほぼ0円から」にして引いてみてください。道具をほとんど必要としない趣味だけが出てきます。散歩系・観察系・言葉遊び系などが該当します。</dd>
<dt>家の中でできるものだけ出したい</dt>
<dd>場所を「室内でできる」にしてください。天気や季節に関係なく、家の中で完結する趣味だけに絞られます。</dd>
<dt>すぐ楽しめるものがいい／じっくり極めたい</dt>
<dd>難度から選べます。「初日から楽しめる」は始めたその日から面白いもの、「じっくり極める」は上達に時間がかかるぶん長く付き合えるものが出ます。</dd>
<dt>配信や動画で使ってもいい?</dt>
<dd>自由にお使いください。許可も連絡も不要です。出た趣味について話す、実際にやってみる、リスナーさんと一緒に引く——そのまま企画にしていただけます。</dd>
<dt>もっとちゃんと自分に合うものを知りたい</dt>
<dd>質問に答えていく<a href="${SITE}/?p=315">趣味診断</a>のほうが向いています。3分ほどで、${HOBBIES.length}種の中からあなたに合う一つを見抜きます。全部を眺めたい方は<a href="${SITE}/zukan.html">趣味図鑑</a>へどうぞ。</dd>
</dl>
</div>

<a class="cta" href="${SITE}/?p=311">▶ ランダムじゃなく、自分に合う趣味を知りたい方はこちら<small>質問に答えるだけ・3分・神様が${HOBBIES.length}種から見抜きます</small></a>
<p style="text-align:center;margin:8px 0 0"><a href="${SITE}/zukan.html" style="color:var(--sakura);font-size:14px">▶ ${HOBBIES.length}種すべてを眺める（趣味図鑑）</a></p>
<footer>このツールは趣味診断ゲーム「<a href="${SITE}/">シュミネーター</a>」が提供しています。<br>監修:導師真ショウ(国家資格キャリアコンサルタント)</footer>`;

  s2 += `
<script>
var DATA=${JSON.stringify(data)};
(function(){
  var slot=document.getElementById('slot'),out=document.getElementById('out'),hit=document.getElementById('hit'),
      acts=document.getElementById('acts'),btn=document.getElementById('spin'),
      g=document.getElementById('g'),c=document.getElementById('c'),o=document.getElementById('o'),
      t=document.getElementById('t'),v=document.getElementById('v'),n=document.getElementById('n');
  var last=[];
  function pool(){
    return DATA.filter(function(d){
      if(g.value && d[2]!==g.value) return false;
      if(c.value!=='' && d[3]>parseInt(c.value,10)) return false;
      if(o.value==='in' && d[4]>1) return false;
      if(o.value==='out' && d[4]<3) return false;
      if(t.value!=='' && d[5]!==parseInt(t.value,10)) return false;
      if(v.value==='easy' && d[6]>1) return false;
      if(v.value==='deep' && d[6]<3) return false;
      return true;
    });
  }
  function refresh(){
    var p=pool();
    hit.textContent = p.length ? ('この条件で '+p.length+' 種') : '条件が厳しすぎるようです。どれかを「こだわらない」に戻してみてください';
    btn.disabled=p.length===0;
  }
  [g,c,o,t,v].forEach(function(e){e.addEventListener('change',refresh);});
  refresh();

  var GAIN=['体験が残る','からだが変わる','技が身につく','記録が集まる','かたちに残る'];
  var SPAN=['すきま時間','1〜2時間','半日〜1日','数日がかり','何年もかけて'];
  var CURVE=['初日から楽しい','わりとすぐ楽しい','ほどよく練習','じっくり練習','極めるほど深い'];
  var COST=['ほぼ0円から','数千円から','1万円前後から','数万円から','しっかり投資'];
  var PLACE=['室内でできる','ほぼ室内','室内でも外でも','外が主役','がっつり屋外'];
  function card(d){
    var chips = d[9].map(function(c){return '<i class="rchip">'+c+'</i>';}).join('');
    var spec = [
      ['予算', COST[d[3]]],
      ['場所', PLACE[d[4]]],
      ['時間', SPAN[d[5]]],
      ['上達', CURVE[d[6]]],
      ['のこるもの', GAIN[d[11]]]
    ].map(function(x){return '<div class="rspec"><span class="rk">'+x[0]+'</span><span class="rv">'+x[1]+'</span></div>';}).join('');
    return '<div class="rcard">'
      + '<p class="rcat">'+d[2]+' ／ '+d[10]+'</p>'
      + '<h3 class="rname">'+d[0]+'</h3>'
      + '<div class="rchips">'+chips+'</div>'
      + '<p class="rdesc">'+d[8]+'</p>'
      + '<div class="rspecs">'+spec+'</div>'
      + '<a class="rmore" href="${SITE}/hobby/'+d[1]+'.html?p=312">道具・動画・相性のいい趣味を見る →</a>'
      + '</div>';
  }
  btn.addEventListener('click',function(){
    var p=pool(); if(!p.length) return;
    var cnt=parseInt(n.value,10), i=0, spins=14;
    acts.style.display='none'; out.innerHTML='';
    slot.classList.add('spinning');
    var iv=setInterval(function(){
      slot.innerHTML='<span class="slot-run">'+p[Math.floor(Math.random()*p.length)][0]+'</span>';
      if(++i>=spins){
        clearInterval(iv);
        slot.classList.remove('spinning');
        var picked=[],copy=p.slice();
        for(var k=0;k<cnt&&copy.length;k++){ picked.push(copy.splice(Math.floor(Math.random()*copy.length),1)[0]); }
        last=picked;
        slot.innerHTML='<span class="slot-hit">'+picked[0][0]+'</span>';
        out.innerHTML=picked.map(card).join('');
        acts.style.display='flex';
        var txt=picked.length>1
          ? 'ランダムに引いた趣味は【'+picked.map(function(x){return x[0];}).join('】【')+'】でした。'
          : 'ランダムに引いた趣味は【'+picked[0][0]+'】でした。';
        document.getElementById('xsh').href='https://twitter.com/intent/tweet?text='+encodeURIComponent(txt+'\\n#シュミネーター #ランダム趣味\\n${SITE}/random.html?p=313');
        if(window.goatcounter&&window.goatcounter.count){try{window.goatcounter.count({path:'random-spin',event:true});}catch(e){}}
      }
    },55);
  });
  document.getElementById('copy').addEventListener('click',function(){
    var txt=last.map(function(x){return x[0];}).join('、');
    if(navigator.clipboard){navigator.clipboard.writeText(txt);}
    this.textContent='コピーしました'; var b=this;
    setTimeout(function(){b.textContent='結果をコピー';},1400);
  });
})();
</script>`;
  s2 += `\n</div><a class="fab" href="${SITE}/?p=314">🔮 趣味を診断する</a></body></html>`;
  return s2;
}

// ---------- 出力 ----------`;
fs.mkdirSync('hobby', { recursive: true });
HOBBIES.forEach((h, i) => {
  fs.writeFileSync(path.join('hobby', (i + 1) + '.html'), hobbyPage(h, i));
});
fs.writeFileSync('zukan.html', zukanPage());
fs.writeFileSync('random.html', randomPage());

const urls = [
  [`${SITE}/`, '1.0'],
  [`${SITE}/zukan.html`, '0.9'],
  [`${SITE}/random.html`, '0.9'],
  [`${SITE}/hobby-finder.html`, '0.8'],
  [`${SITE}/solo-hobbies.html`, '0.7'],
  [`${SITE}/indoor-hobbies.html`, '0.7'],
  [`${SITE}/money-free-hobbies.html`, '0.7'],
  [`${SITE}/easy-hobbies.html`, '0.7'],
  [`${SITE}/lifelong-hobbies.html`, '0.7'],
  [`${SITE}/japanese-hobbies.html`, '0.7'],
  ...HOBBIES.map((h, i) => [`${SITE}/hobby/${i + 1}.html`, '0.6'])
];
fs.writeFileSync('sitemap.xml',
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  urls.map(([u, p]) => `  <url><loc>${u}</loc><priority>${p}</priority></url>`).join('\n') +
  `\n</urlset>\n`);

console.log('生成完了: hobby/1.html〜' + HOBBIES.length + '.html / zukan.html / sitemap.xml');
