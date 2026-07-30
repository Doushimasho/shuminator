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
<meta property="og:image" content="${SITE}/ogp.png?v=2">
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
  s += `\n<p class="crumb"><a href="${SITE}/zukan.html">趣味図鑑</a> › ${esc(h[1])} › ${esc(h[2])}</p>\n<div class="card">`;
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
  s += `\n</div></body></html>`;
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
  s += `\n</div></body></html>`;
  return s;
}

// ---------- 出力 ----------
fs.mkdirSync('hobby', { recursive: true });
HOBBIES.forEach((h, i) => {
  fs.writeFileSync(path.join('hobby', (i + 1) + '.html'), hobbyPage(h, i));
});
fs.writeFileSync('zukan.html', zukanPage());

const urls = [
  [`${SITE}/`, '1.0'],
  [`${SITE}/zukan.html`, '0.9'],
  [`${SITE}/hobby-finder.html`, '0.8'],
  [`${SITE}/solo-hobbies.html`, '0.7'],
  [`${SITE}/indoor-hobbies.html`, '0.7'],
  ...HOBBIES.map((h, i) => [`${SITE}/hobby/${i + 1}.html`, '0.6'])
];
fs.writeFileSync('sitemap.xml',
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  urls.map(([u, p]) => `  <url><loc>${u}</loc><priority>${p}</priority></url>`).join('\n') +
  `\n</urlset>\n`);

console.log('生成完了: hobby/1.html〜' + HOBBIES.length + '.html / zukan.html / sitemap.xml');
