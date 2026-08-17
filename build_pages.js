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

// ---------- 文章生成用の語彙 ----------
const CORE_TXT = {
  '上達':'できなかったことが少しずつできるようになる手応え',
  '攻略':'仕組みを読み解いて攻略していく面白さ',
  '達成':'やり遂げたときの充実感',
  '競う':'誰かと競り合う緊張感',
  '組む':'手を動かして組み上げていく時間',
  '表現':'自分の内側にあるものを外に出す感覚',
  '模倣':'お手本をなぞって型を身につける過程',
  '発見':'知らなかったものに出会う驚き',
  '深掘':'一つのことをどこまでも掘り下げる没入',
  '繋がる':'同じものを好きな人とつながる楽しさ',
  '披露':'誰かに見てもらう手ごたえ',
  '育てる':'手をかけたぶんだけ育っていく実感',
  '推す':'好きなものを応援する熱',
  '収集':'少しずつ集まっていく満足感',
  '愛でる':'ただ眺めているだけで満たされる時間',
  '記録':'続けた分だけ積み上がっていく記録',
  '高揚':'胸が高鳴る瞬間',
  '静穏':'静かに心が整っていく時間',
  '躍動':'体を動かす爽快感',
  '物語':'物語に浸り込む感覚'
};
const COST_TXT = [
  '道具をほとんど必要としないので、思い立った日に始められます。',
  '数千円あれば一通り揃うので、試しに始めてみるハードルは低めです。',
  '入門用の道具で1万円前後を見ておくと、無理なく始められます。',
  '数万円ほどの初期投資が必要になりますが、そのぶん長く使える道具が手に入ります。',
  'それなりの投資が必要な世界です。まずは体験やレンタルから入る方法もあります。'
];
const SPAN_TXT = [
  '5分10分のすきま時間でも成立するので、忙しい時期でも続けやすいのが特徴です。',
  '1〜2時間あればひと区切りつくので、平日の夜にも組み込みやすい趣味です。',
  '半日ほどまとまった時間を取ると、じっくり楽しめます。休日向きの趣味です。',
  '数日がかりで取り組むタイプなので、連休や旅程に組み込むと満喫できます。',
  '年単位で育てていくタイプです。すぐに結果は出ませんが、そのぶん長く付き合えます。'
];
const CURVE_TXT = [
  '特別な技術は要らず、始めたその日から楽しめます。',
  '簡単なコツを覚えれば、わりとすぐに面白さがわかってきます。',
  'ほどよく練習が要りますが、上達の実感を得やすい部類です。',
  '形になるまでにある程度の練習が必要です。そのぶん、できたときの喜びは大きいものになります。',
  '極めようとすると果てしない世界です。長く付き合う覚悟がある人ほど深く楽しめます。'
];
const OUT_TXT = [
  '完全に室内で完結するので、天気や季節に左右されません。',
  'ほぼ室内でできるので、気候を気にせず続けられます。',
  '室内でも屋外でも楽しめるので、その日の気分や天気で選べます。',
  '屋外が主役になる趣味です。外に出るきっかけとしても機能します。',
  'しっかり外に出る趣味です。自然や街の中で過ごす時間そのものが目的になります。'
];
const GAIN_TXT = [
  'あとに形は残りませんが、その時間の体験そのものが目的になる趣味です。',
  '続けるうちに体の状態が変わっていくのを実感できます。',
  '身につけた技術が自分のものとして残ります。',
  '続けた記録やコレクションが少しずつ積み上がっていきます。',
  '手を動かした結果が、形のあるものとして残ります。'
];
const CULT_TXT = ['日本の伝統や文化に根ざした趣味です。','アジアやエスニックの文化圏から生まれた趣味です。','欧米の文化圏から広まった趣味です。',''];

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
.qa dt{font-weight:700;color:#7a4a86;margin-top:14px;font-size:14.5px}
.qa dd{margin:4px 0 0;font-size:14px;color:#5c5148;line-height:1.85}
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
.deep{list-style:none;margin:0;padding:0;counter-reset:d}
.deep li{display:flex;gap:11px;align-items:flex-start;padding:11px 0;border-bottom:1px dashed #e5d9bd}
.deep li:last-child{border-bottom:none}
.dnum{flex:0 0 26px;height:26px;border-radius:50%;background:#7a4a86;color:#fff;font-size:13px;font-weight:700;display:flex;align-items:center;justify-content:center;margin-top:2px}
.dtxt{font-size:14px;line-height:1.85;color:#4c443c}
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
.zpicks{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:9px;margin:10px 0 6px}
.zpick{display:block;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.1);border-radius:11px;overflow:hidden;text-decoration:none;color:var(--ink)}
.zpick img{width:100%;aspect-ratio:16/9;object-fit:cover;display:block;background:#2c1e52}
.zpn{display:block;font-size:13.5px;font-weight:700;padding:7px 9px 2px;color:var(--gold)}
.zpd{display:block;font-size:11.5px;line-height:1.6;padding:0 9px 9px;color:#c2b5dc}
.picks{display:flex;flex-wrap:wrap;gap:7px}
.picks a{background:#f2ebda;border:1.5px solid #e0d3b4;border-radius:999px;padding:7px 15px;font-size:13.5px;text-decoration:none;color:#7a4a86;font-weight:700}
.llist{display:grid;gap:10px}
.litem{display:block;background:#f2ebda;border:1px solid #e5d9bd;border-radius:12px;padding:12px 13px;text-decoration:none;color:var(--sumi)}
.lrow{display:flex;gap:11px;align-items:flex-start}
.lthumb{width:112px;height:63px;flex:0 0 112px;border-radius:8px;object-fit:cover;background:#ded3bd;display:block}
.lnoimg{display:flex;align-items:center;justify-content:center;font-size:24px;color:#b9a3c4}
.lbody{min-width:0;flex:1}
.litem b{font-size:16px;color:#453058;display:block;line-height:1.4}
.lchips{display:block;margin:4px 0 5px}
.lchips i{display:inline-block;background:#7a4a86;color:#fff;font-style:normal;font-size:11px;font-weight:700;border-radius:999px;padding:2px 9px;margin-right:4px}
.ldesc{display:block;font-size:13px;line-height:1.75;color:#5c5148}
@media(max-width:420px){
  .lthumb{width:88px;height:50px;flex:0 0 88px}
  .litem b{font-size:15px}
  .ldesc{font-size:12.5px}
  .lchips i{font-size:10.5px;padding:2px 7px}
}
.ldeep{display:block;margin-top:7px;font-size:12.5px;color:#b9557d;border-top:1px dashed #ddd0b4;padding-top:7px}
.gensub{color:#c9bce0;font-size:13.5px;margin:-8px 0 14px}
.rdeep{margin-top:11px;border-top:1px solid #e5d9bd;padding-top:10px}
.rdt{margin:0 0 6px;font-size:11.5px;color:#b9557d;font-weight:700}
.rdeep ol{margin:0;padding:0;list-style:none;counter-reset:rd}
.rdeep li{position:relative;padding:5px 0 5px 26px;font-size:12.5px;line-height:1.75;color:#5c5148}
.rdeep li::before{counter-increment:rd;content:counter(rd);position:absolute;left:0;top:7px;width:18px;height:18px;border-radius:50%;background:#b9a3c4;color:#fff;font-size:10.5px;font-weight:700;display:flex;align-items:center;justify-content:center}
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

  const faqJson = `<script type="application/ld+json">${JSON.stringify({
    "@context":"https://schema.org","@type":"FAQPage","mainEntity":[
      {"@type":"Question","name":`${h[0]}はお金がかかりますか?`,"acceptedAnswer":{"@type":"Answer","text":COST_TXT[h[8]]}},
      {"@type":"Question","name":`${h[0]}は一人でもできますか?`,"acceptedAnswer":{"@type":"Answer","text":(h[9][1]>=1&&h[9][0]<=0)?"ひとりで完結する趣味なので、一人でも問題なく楽しめます。":"一人でも、誰かと一緒でも楽しめます。"}},
      {"@type":"Question","name":`${h[0]}は初心者でも始められますか?`,"acceptedAnswer":{"@type":"Answer","text":CURVE_TXT[(h[13]!==undefined?h[13]:2)]}}
    ]})}</script>`;
  const jsonld = `<script type="application/ld+json">${JSON.stringify({
    "@context": "https://schema.org", "@type": "Article",
    "headline": `${h[0]}｜趣味図鑑`,
    "about": h[0],
    "description": h[5],
    "author": { "@type": "Person", "name": "導師真ショウ", "jobTitle": "国家資格キャリアコンサルタント" },
    "publisher": { "@type": "Organization", "name": "シュミネーター" },
    "inLanguage": "ja", "mainEntityOfPage": url
  })}</script>`;

  let s = head(`${h[0]}とは｜趣味図鑑｜シュミネーター`, desc, url, jsonld + faqJson);
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

  const deep = h[15];
  if (deep && deep.length === 3) {
    s += `\n<h2>この趣味は、こう深くなっていきます</h2>\n<ol class="deep">`;
    deep.forEach((d, k) => { s += `<li><span class="dnum">${k + 1}</span><span class="dtxt">${esc(d)}</span></li>`; });
    s += `</ol>`;
  }

  if (mt.length) {
    s += `\n<h2>相性のいい趣味</h2>\n<div class="mates">`;
    mt.forEach(j => { s += `<a class="mate" href="${SITE}/hobby/${j + 1}.html">${esc(HOBBIES[j][0])}</a>`; });
    s += `</div>`;
  }

  // ===== ページ固有の解説文(データから生成) =====
  const c1 = cores[0], c2 = cores[1] || cores[0];
  const solo = h[9][1];   // 単独志向
  const soc  = h[9][0];   // 対人
  let intro = `${h[0]}は、${CORE_TXT[c1] || 'その趣味ならではの手応え'}を求める人に向いている趣味です。`;
  if (c2 !== c1) intro += `あわせて${CORE_TXT[c2] || ''}も味わえるので、そのあたりに心が動く人ほど相性が良さそうです。`;
  const style = (solo >= 1 && soc <= 0) ? 'ひとりの時間に向いていて、自分のペースで進められます。'
              : (soc >= 1) ? '人と一緒に楽しむ場面が多く、仲間ができやすい趣味でもあります。'
              : 'ひとりでも、誰かと一緒でも成立します。';
  const body = [
    intro,
    style,
    CURVE_TXT[cv],
    COST_TXT[h[8]],
    SPAN_TXT[sp],
    OUT_TXT[h[7]],
    GAIN_TXT[g],
    CULT_TXT[cl]
  ].filter(Boolean).join('');

  s += `\n<h2>${esc(h[0])}はどんな趣味か</h2>\n<p class="desc" style="margin-bottom:6px">${esc(body)}</p>`;

  // ===== 似た趣味との違い =====
  if (mt.length) {
    const m0 = HOBBIES[mt[0]];
    const diff = (m0[8] !== h[8])
      ? `${esc(m0[0])}は${COST_TXT[m0[8]].replace('。','')}という点が違います。`
      : (m0[13] !== cv)
        ? `${esc(m0[0])}は${CURVE_TXT[m0[13]].replace('。','')}という違いがあります。`
        : `${esc(m0[0])}は${esc(m0[1])}の分野なので、雰囲気が少し変わります。`;
    s += `\n<p class="desc" style="font-size:14px">${esc(h[0])}に惹かれる人は、<a href="${SITE}/hobby/${mt[0]+1}.html">${esc(m0[0])}</a>も候補になりやすい趣味です。ただし${diff}</p>`;
  }

  // ===== よくある質問(ページ固有) =====
  const q1a = COST_TXT[h[8]] + (h[6] && h[6].length ? `まずは「${esc(h[6][0][0])}」から揃えるのが一般的です。` : '');
  const q2a = (solo >= 1 && soc <= 0) ? `ひとりで完結する趣味なので、一人でも問題なく楽しめます。むしろ一人の時間に向いています。`
            : (soc >= 1) ? `人と関わる場面が多い趣味ですが、一人で始めてから輪に入っていく人も少なくありません。`
            : `一人でも、誰かと一緒でも楽しめます。`;
  const q3a = CURVE_TXT[cv] + SPAN_TXT[sp];
  s += `\n<h2>よくある質問</h2>\n<dl class="qa">
<dt>${esc(h[0])}はお金がかかりますか?</dt><dd>${esc(q1a)}</dd>
<dt>${esc(h[0])}は一人でもできますか?</dt><dd>${esc(q2a)}</dd>
<dt>${esc(h[0])}は初心者でも始められますか?</dt><dd>${esc(q3a)}</dd>
</dl>`;

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
  s += `\n<div class="card" style="margin-bottom:16px"><h2 style="margin-top:4px">目的から探す</h2><div class="picks">`
    + [["indoor-list","室内でできる"],["outdoor-list","外でやる"],["solo-list","一人で"],["social-list","仲間と"],
       ["collect-list","集める"],["create-list","作る"],["grow-list","育てる"],["quiet-list","静かに"],
       ["short-time-list","すきま時間"],["cheap-list","お金をかけない"],["easy-hobbies","すぐ始められる"],
       ["lifelong-hobbies","一生続けられる"],["japanese-hobbies","和のもの"]]
      .map(x=>`<a href="${SITE}/${x[0]}.html">${x[1]}</a>`).join("")
    + `</div></div>`;
  s += `\n<a class="cta-top" href="${SITE}/?p=305">▶ あなたに眠る趣味を診断してもらう<small>どれが自分に合うか、神様に見抜いてもらえます(無料・3分)</small></a>`;
  s += `\n<div class="tools-bar"><input id="q" type="search" placeholder="趣味名で検索（例：苔、ボード、和）" aria-label="趣味名で検索">
<select class="gsel" id="gsel"><option value="">すべてのジャンル</option>${Object.keys(byGenre).map(g => `<option>${esc(g)}</option>`).join('')}</select></div>`;
  s += `\n<p class="count" id="cnt"></p>`;
  Object.entries(byGenre).forEach(([g, arr]) => {
    const gp = LIST_PAGES.find(p => p.genre === g);
    s += `\n<section data-genre="${esc(g)}"><h3 class="genre">${esc(g)}<span style="color:#b7a6d6;font-size:13px;font-weight:400"> ${arr.length}種</span>`
      + (gp ? `<a href="${SITE}/${gp.slug}.html" style="float:right;font-size:12.5px;color:var(--sakura);font-weight:400">解説を読む →</a>` : "")
      + `</h3><div class="list">`;
    arr.forEach(([n, id]) => { s += `<a class="item" href="${SITE}/hobby/${id}.html">${esc(n)}</a>`; });
    s += `</div>`;
    // ジャンルの代表3件はサムネイル付きで見せる(眺めて楽しいページにするため)
    const picks = arr.slice(0, 3).map(([n, id]) => ({ n, id, h: HOBBIES[id - 1] }))
      .filter(x => VIDEOS[x.n] && VIDEOS[x.n].v && VIDEOS[x.n].v[0]);
    if (picks.length) {
      s += `<div class="zpicks">`;
      picks.forEach(x => {
        s += `<a class="zpick" href="${SITE}/hobby/${x.id}.html">`
          + `<img loading="lazy" src="https://i.ytimg.com/vi/${esc(VIDEOS[x.n].v[0].id)}/mqdefault.jpg" alt="${esc(x.n)}">`
          + `<span class="zpn">${esc(x.n)}</span>`
          + `<span class="zpd">${esc(x.h[5].slice(0, 34))}…</span>`
          + `</a>`;
      });
      s += `</div>`;
    }
    s += `</section>`;
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
    (h[11] !== undefined ? h[11] : 2),                      // 成果のかたち
    (h[15] || null)                                         // 深まり3段階
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
    `ランダム趣味ジェネレーター｜全${HOBBIES.length}種から新しい趣味を1つ選ぶ【趣味診断つき】`,
    `新しい趣味を探している人へ。全${HOBBIES.length}種の趣味からランダムに1つ提案します。予算・室内屋外・かかる時間・上達の道のりで絞り込み可能。それぞれの趣味の始め方と「どう深くなっていくか」も掲載。自分に合うものを知りたい方には趣味診断（無料・3分）もあります。`,
    url, jsonld + faqld);

  s2 += `\n<p class="crumb">新しい趣味を探すための、ランダム提案ツール・登録不要・無料</p>`;
  s2 += `
<div class="gen">
  <h1 class="genh1">ランダム趣味ジェネレーター</h1>
  <p class="gensub">全${HOBBIES.length}種から、新しい趣味をひとつ選びます</p>
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
<h2>新しい趣味は、自分では選べない</h2>
<p style="font-size:14.5px">
趣味を探そうとしたとき、頭に浮かぶ選択肢はせいぜい20〜30個ではないでしょうか。そのどれもピンとこないと、人は「自分に合う趣味はない」と結論してしまいます。<br><br>
でも世の中には、${HOBBIES.length}種を超える趣味があります。<b>知らないものは、そもそも検討されていない</b>だけなのかもしれません。<br><br>
このツールは、その<b>「知らない」を埋めるため</b>のものです。自分では絶対に選ばなかったものが出てくるので、選択肢が一気に広がります。<br><br>
出てきた趣味には、<b>始め方・必要な道具・費用</b>に加えて、<b>「その趣味がどう深くなっていくか」</b>も書いてあります。合わなければ、また引けばいい。試す回数を増やすための道具だと思ってください。
</p>
<h2>こんな使い方ができます</h2>
<p style="font-size:14.5px">
<b>新しい趣味を探しているとき。</b>条件を絞って引けば、自分の生活に無理なく入るものだけが出てきます。ピンときたものを、その場で調べはじめられます。<br><br>
<b>何をするか決まらない休日に。</b>選択肢が多すぎると人は選べなくなります。運に任せてしまうと、案外すんなり動き出せることがあります。<br><br>
<b>配信や動画のネタ決めに。</b>「出た趣味について語る」「出た趣味を実際にやってみる」がそのまま企画になります。配信・動画でのご利用は自由です（許可・連絡は不要）。<br><br>
<b>創作のお題出しに。</b>キャラクターの趣味を決める、物語の設定を転がす。実在する${HOBBIES.length}種から出るので、リアリティのある設定になります。
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
      + (d[12] ? '<div class="rdeep"><p class="rdt">この趣味は、こう深くなっていきます</p><ol>'+d[12].map(function(t){return '<li>'+t+'</li>';}).join('')+'</ol></div>' : '')
      + '<a class="rmore" href="${SITE}/hobby/'+d[1]+'.html?p=312">道具・動画・始め方を見る →</a>'
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

// ---------- 一覧ページ(ジャンル別・条件別) ----------
/* 各ページに固有の導入文とテーマを持たせる。中身の薄い量産ページにしないため、
   説明文・見出し・並び順をページごとに変える。 */
const LIST_PAGES = [
  // --- ジャンル別 ---
  {slug:"active-hobbies", genre:"体を動かす", title:"体を動かす趣味96選", h1:"体を動かす趣味96選｜運動不足の解消から本格競技まで",
   kw:"体を動かす趣味", lead:"体を動かしたいけれど、何から始めればいいか分からない——そんな人へ。ジムやランニング以外にも、身体を使う趣味は驚くほどたくさんあります。",
   intro:"「運動しなきゃ」と思っても続かないのは、<b>その運動が面白くないから</b>かもしれません。目的が「健康」だけだと、やる理由が義務になってしまう。<br><br>ここで紹介するのは、<b>楽しいから続いてしまう</b>身体の使い方です。競技として本気で戦うものから、笑いながら汗をかくもの、静かに体を整えるものまで。運動が苦手な人でも勝てる競技もあります。"},
  {slug:"food-hobbies", genre:"食", title:"食に関する趣味83選", h1:"食の趣味83選｜作る・味わう・探しにいく",
   kw:"食 趣味", lead:"毎日必ずすることだからこそ、深く潜れる。作る趣味、味わう趣味、探しに行く趣味を集めました。",
   intro:"食は、誰でも毎日していることです。だからこそ<b>少し掘るだけで、日常がまるごと変わります</b>。<br><br>作る側に回るのか、味の違いを知る側に回るのか、あるいは食べに行く旅をするのか。同じ「食が好き」でも、向かう方向はまったく違います。"},
  {slug:"nature-hobbies", genre:"自然", title:"自然を楽しむ趣味82選", h1:"自然の趣味82選｜観察・採集・育てる",
   kw:"自然 趣味", lead:"外に出るだけが自然の趣味ではありません。観察する、集める、育てる——関わり方はいくつもあります。",
   intro:"自然の趣味の面白さは、<b>相手が自分の思い通りにならない</b>ことです。天気も、生き物も、季節も、こちらの都合では動かない。<br><br>だからこそ、うまくいった日の喜びが濃い。そして続けるうちに、<b>自然の側のリズムが体に入ってきます</b>。"},
  {slug:"making-hobbies", genre:"ものづくり", title:"ものづくりの趣味72選", h1:"ものづくりの趣味72選｜手を動かして、かたちに残す",
   kw:"ものづくり 趣味", lead:"手を動かして何かを作りたい人へ。木、布、金属、紙、ガラス——素材ごとに世界が違います。",
   intro:"ものづくりの最大の特徴は、<b>終わったあとに「もの」が残る</b>ことです。時間が形になって手元にある。この手応えは、他の趣味では得にくいものです。<br><br>そしてもう一つ。作っている最中は<b>他のことを考えられません</b>。手が忙しいと、頭が静かになる。無心になれる時間を求めている人にも向いています。"},
  {slug:"watching-hobbies", genre:"観る", title:"観る趣味59選", h1:"観る趣味59選｜スポーツ・舞台・映像・美",
   kw:"観る 趣味", lead:"自分でやらなくても、観るだけで十分に深い趣味があります。",
   intro:"「観るだけ」と言われることがありますが、<b>観ることにも技術があります</b>。ルールを知り、背景を知り、系譜を辿ると、同じものがまったく違って見えてくる。<br><br>体力も道具も要らないので、<b>いつからでも始められて、いつまでも続けられる</b>のも強みです。"},
  {slug:"music-hobbies", genre:"音楽", title:"音楽の趣味57選", h1:"音楽の趣味57選｜奏でる・うたう・聴く・つくる",
   kw:"音楽 趣味", lead:"楽器を弾く、歌う、聴き込む、作る。音楽との関わり方は一つではありません。",
   intro:"楽器は難しそう、と思われがちですが、<b>数日で一曲吹ける楽器もあります</b>。逆に、音が出るまで一週間かかる楽器もある。どちらが良いという話ではなく、<b>いまの自分がどちらを求めているか</b>です。<br><br>演奏しない選択肢もあります。聴き込む、集める、通う。それも立派な音楽の趣味です。"},
  {slug:"travel-hobbies", genre:"旅・まち", title:"旅・まち歩きの趣味51選", h1:"旅とまち歩きの趣味51選｜遠くへも、近所にも",
   kw:"旅 趣味", lead:"遠くに行かなくても、旅の趣味は成立します。近所を歩くだけで始まるものもあります。",
   intro:"旅の趣味には<b>「目的を持つと面白くなる」</b>という法則があります。ただ歩くより、何かを探しながら歩くほうが、街は情報量を増やして返してくれる。<br><br>坂を探す、看板を探す、印を集める。<b>目的が一つあるだけで、通い慣れた道が別の場所になります</b>。"},
  {slug:"home-hobbies", genre:"暮らし", title:"暮らしまわりの趣味49選", h1:"暮らしの趣味49選｜毎日を少しずつ良くする",
   kw:"暮らし 趣味", lead:"特別なことをしなくても、毎日の中に趣味は作れます。",
   intro:"暮らしの趣味の良さは、<b>やらなければいけないことが、楽しみに変わる</b>点です。掃除も洗濯も料理も、極めはじめると別のものになる。<br><br>しかも<b>成果が生活に直接返ってきます</b>。趣味の時間が、そのまま暮らしの質になる。"},
  {slug:"game-hobbies", genre:"ゲーム", title:"ゲームの趣味48選", h1:"ゲームの趣味48選｜ジャンルで選ぶ",
   kw:"ゲーム 趣味", lead:"ひとくちにゲームと言っても、ジャンルによって面白さの種類がまったく違います。",
   intro:"「ゲームが好き」と言っても、<b>対戦で競うのが好きな人と、静かに世界に浸りたい人は別</b>です。集めるのが好きな人、組み立てるのが好きな人、物語に泣きたい人。<br><br>合わないジャンルで「自分はゲームが下手だ」と思っている人ほど、<b>別のジャンルを試す価値があります</b>。"},
  {slug:"learning-hobbies", genre:"知・学び", title:"学びの趣味46選", h1:"学びの趣味46選｜大人になってからの勉強は面白い",
   kw:"学び 趣味", lead:"テストのない勉強は、こんなに面白かったのかと気づきます。",
   intro:"大人の学びが楽しいのは、<b>役に立たなくていいから</b>です。評価されないし、締切もない。純粋に知りたいから知る。<br><br>そして知識が増えると、<b>同じニュースも同じ景色も、違って見えはじめます</b>。世界の解像度が上がる感覚は、他では得にくいものです。"},
  {slug:"tabletop-hobbies", genre:"盤上・卓上", title:"盤上・卓上の趣味41選", h1:"盤上・卓上の趣味41選｜机の上で深く潜る",
   kw:"ボードゲーム 趣味", lead:"机ひとつあれば始まる、思考と駆け引きの世界です。",
   intro:"卓上の趣味の魅力は、<b>ルールは単純なのに底が見えない</b>ことです。覚えるのに数分、極めるのに一生かかるものが揃っています。<br><br>一人で解くものもあれば、人と囲むものもある。<b>同じ卓上でも、求めているものが正反対</b>だったりします。"},
  {slug:"art-hobbies", genre:"アート・美", title:"アート・美の趣味39選", h1:"アートの趣味39選｜描く・撮る・味わう",
   kw:"アート 趣味", lead:"絵が下手でも大丈夫。表現の方法は一つではありません。",
   intro:"「絵心がないから」と諦める人は多いのですが、<b>アートの趣味は描くだけではありません</b>。撮る、彫る、切る、貼る、そして観る。<br><br>それに、上手さを競わない表現もあります。<b>無心になるために描く</b>という選び方も、立派な入り口です。"},
  {slug:"words-hobbies", genre:"言葉・物語", title:"言葉と物語の趣味37選", h1:"言葉の趣味37選｜読む・書く・遊ぶ",
   kw:"読書 趣味", lead:"読むだけでなく、書く、遊ぶ、集める。言葉との付き合い方はいろいろあります。",
   intro:"言葉の趣味は<b>元手がほとんどかかりません</b>。紙とペン、あるいは本が一冊あれば始まる。<br><br>そして書くという行為には、<b>自分が何を考えていたかを発見する</b>という副産物があります。読むだけでなく書く側に回ると、見える景色が変わります。"},
  {slug:"fashion-hobbies", genre:"装う", title:"装う趣味36選", h1:"装いの趣味36選｜服・小物・身だしなみ",
   kw:"ファッション 趣味", lead:"毎日必ず着るものだからこそ、こだわると日常が変わります。",
   intro:"装いの趣味の面白さは、<b>効果がその日のうちに出る</b>ことです。一枚変えるだけで、鏡の中の印象が変わる。<br><br>そして掘っていくと、<b>服の背景にある文化や歴史</b>に辿り着きます。機能から生まれた形、時代が求めた形。ただの服が資料になります。"},
  {slug:"tech-hobbies", genre:"テック", title:"技術系の趣味35選", h1:"テックの趣味35選｜つくる・組む・動かす",
   kw:"技術 趣味", lead:"プログラミングだけではありません。組む、飛ばす、光らせる、鳴らす。",
   intro:"技術系の趣味の魅力は、<b>自分が作ったものが動く</b>という一点に尽きます。画面の中でも、机の上でも、空の上でも。<br><br>そして<b>作れるものが年々増えています</b>。数年前なら専門知識が要ったことが、いまは初日からできる。始めるなら今が最も楽な時期かもしれません。"},
  {slug:"stage-hobbies", genre:"舞台・演芸", title:"舞台・演芸の趣味35選", h1:"舞台・演芸の趣味35選｜演じる・踊る・語る",
   kw:"演劇 趣味", lead:"人前に立つのは特別な人だけ、ということはありません。",
   intro:"舞台の趣味には<b>日常では絶対に得られない体験</b>があります。拍手を浴びる、別人になる、大勢と呼吸を合わせる。<br><br>そして意外なことに、<b>始めるハードルは思ったより低い</b>。市民劇団も、社会人チームも、初心者を歓迎しているところが多くあります。"},
  {slug:"wellness-hobbies", genre:"整える", title:"心と体を整える趣味34選", h1:"整える趣味34選｜疲れを抜く・調子を上げる",
   kw:"リラックス 趣味", lead:"何もしないだけが休息ではありません。整えるための方法はいくつもあります。",
   intro:"休日に寝て過ごしても疲れが取れない——そんな経験はないでしょうか。<b>休むことにも技術があります</b>。<br><br>体を温める、呼吸を整える、何もしない練習をする。そして意外にも、<b>何かに取り組むこと自体が回復になる</b>という考え方もあります。"},
  {slug:"vehicle-hobbies", genre:"乗り物", title:"乗り物の趣味34選", h1:"乗り物の趣味34選｜乗る・眺める・整備する",
   kw:"乗り物 趣味", lead:"運転しなくても、乗り物の趣味は成立します。",
   intro:"乗り物の趣味には<b>三つの入り口</b>があります。自分で操る、乗って旅する、そして眺める・調べる。<br><br>免許も車も要らないものが多く、<b>駅や空港や港に行くだけで始まる</b>ものもあります。"},
  {slug:"community-hobbies", genre:"人・まち・貢献", title:"人と関わる趣味34選", h1:"人と関わる趣味34選｜つながる・支える・伝える",
   kw:"ボランティア 趣味", lead:"誰かの役に立つことが、自分の楽しみにもなる。そういう趣味があります。",
   intro:"この分野の趣味には<b>「ありがとう」が返ってくる</b>という特徴があります。趣味でありながら、誰かの助けになっている。<br><br>そして続けるうちに<b>顔なじみが増えます</b>。地域に居場所ができることが、実は一番の効果かもしれません。"},
  {slug:"mystery-hobbies", genre:"ふしぎ", title:"ふしぎを楽しむ趣味32選", h1:"ふしぎの趣味32選｜占い・伝承・謎",
   kw:"占い 趣味", lead:"答えが出ないからこそ、面白い。そういう世界があります。",
   intro:"この分野の趣味は<b>「信じるかどうか」を保留したまま楽しめます</b>。信じる人も、体系として面白がる人も、歴史として辿る人もいる。<br><br>共通しているのは、<b>人が何を信じ、何を怖れてきたか</b>という問いに触れられることです。"},
];

// 条件で絞るページ
const COND_PAGES = [
  {slug:"indoor-list", title:"室内でできる趣味40選", h1:"室内でできる趣味40選｜天気に左右されない",
   kw:"室内 趣味", lead:"雨の日も、寒い日も、外に出たくない日も。家の中で完結する趣味を集めました。",
   intro:"室内の趣味の強みは<b>続けやすさ</b>です。天気にも季節にも予定にも左右されないので、習慣にしやすい。<br><br>移動時間もゼロなので、<b>思い立った瞬間に始められる</b>のも大きな利点です。",
   filter:(h)=>h[7]<=1, sort:(a,b)=>(b[3]["静穏"]||0)-(a[3]["静穏"]||0), n:40},
  {slug:"outdoor-list", title:"外でやる趣味40選", h1:"外でやる趣味40選｜自然と街へ出かける",
   kw:"アウトドア 趣味", lead:"外に出る理由が欲しい人へ。目的があると、出かけるのが楽しみになります。",
   intro:"外の趣味には<b>「行く理由ができる」</b>という効果があります。散歩そのものより、何かを探しながら歩くほうが足が向く。<br><br>そして<b>季節と天気が味方になります</b>。同じ場所が、時期によってまったく違う顔を見せる。",
   filter:(h)=>h[7]>=3, sort:(a,b)=>(b[3]["発見"]||0)-(a[3]["発見"]||0), n:40},
  {slug:"solo-list", title:"一人で楽しむ趣味40選", h1:"一人で楽しめる趣味40選｜誰にも気を遣わない時間",
   kw:"一人 趣味", lead:"誰かを誘わなくても始められて、自分のペースで続けられる趣味です。",
   intro:"一人の趣味の良さは<b>スケジュールが自分だけで決まる</b>ことです。誘う手間も、合わせる気遣いもいらない。<br><br>そして<b>やめるのも自由</b>です。合わなければ静かに離れられる。この気軽さが、実は続けやすさにつながります。",
   filter:(h)=>(h[3]["繋がる"]||0)<=1 && (h[3]["静穏"]||0)>=2, sort:(a,b)=>(b[3]["静穏"]||0)-(a[3]["静穏"]||0), n:40},
  {slug:"social-list", title:"仲間とやる趣味30選", h1:"仲間とできる趣味30選｜人とつながる時間",
   kw:"仲間 趣味", lead:"社会人になってから友達を作るのは難しい——その解決策のひとつが趣味です。",
   intro:"大人になると、<b>共通の目的がないと関係が生まれにくく</b>なります。趣味はその目的になります。<br><br>しかも<b>年齢も職業も関係ありません</b>。同じものを面白がっているという一点だけで、話が通じてしまう。",
   filter:(h)=>(h[3]["繋がる"]||0)>=3, sort:(a,b)=>(b[3]["繋がる"]||0)-(a[3]["繋がる"]||0), n:30},
  {slug:"collect-list", title:"集める趣味30選", h1:"集める趣味30選｜コレクションの世界",
   kw:"集める 趣味", lead:"並べたときの満足感は、集めた人にしか分かりません。",
   intro:"集める趣味には<b>終わりがありません</b>。それが欠点ではなく、最大の魅力です。<br><br>そして集めるうちに<b>目利きになります</b>。最初は違いが分からなかったものが、少しずつ見分けられるようになる。この成長が楽しい。",
   filter:(h)=>(h[3]["収集"]||0)>=3, sort:(a,b)=>(b[3]["収集"]||0)-(a[3]["収集"]||0), n:30},
  {slug:"create-list", title:"作る趣味30選", h1:"作る趣味30選｜手を動かして形にする",
   kw:"作る 趣味", lead:"完成したものが手元に残る。それだけで、時間の使い方に納得できます。",
   intro:"作る趣味の魅力は<b>「終わったあとに残る」</b>ことです。使った時間が、目に見える形になる。<br><br>そしてもう一つ。<b>手が忙しいと、頭が静かになります</b>。考えごとから離れたい人にも向いています。",
   filter:(h)=>(h[3]["組む"]||0)>=3, sort:(a,b)=>(b[3]["組む"]||0)-(a[3]["組む"]||0), n:30},
  {slug:"grow-list", title:"育てる趣味30選", h1:"育てる趣味30選｜植物・生き物と暮らす",
   kw:"育てる 趣味", lead:"毎日少しずつ変わっていくものが、生活の中にある心地よさ。",
   intro:"育てる趣味の特徴は<b>時間が味方になる</b>ことです。昨日と今日で少しだけ違う。その小さな変化が、飽きを防いでくれます。<br><br>そして<b>世話をする対象があると、生活にリズムが生まれます</b>。水をやる時間、様子を見る時間が、一日の句読点になる。",
   filter:(h)=>(h[3]["育てる"]||0)>=3, sort:(a,b)=>(b[3]["育てる"]||0)-(a[3]["育てる"]||0), n:30},
  {slug:"quiet-list", title:"静かに楽しむ趣味30選", h1:"静かにできる趣味30選｜無心になれる時間",
   kw:"静か 趣味", lead:"賑やかなものが苦手な人へ。ひとりで静かに没頭できる趣味を集めました。",
   intro:"静かな趣味には<b>頭の中が静まる</b>という共通点があります。手や目を使っていると、考えごとが止まる。<br><br>瞑想が苦手な人でも、<b>何かに集中しているうちに勝手に無心になれる</b>——そういう入り口です。",
   filter:(h)=>(h[3]["静穏"]||0)>=3, sort:(a,b)=>(b[3]["静穏"]||0)-(a[3]["静穏"]||0), n:30},
  {slug:"short-time-list", title:"すきま時間の趣味30選", h1:"すきま時間でできる趣味30選｜5分から始められる",
   kw:"すきま時間 趣味", lead:"まとまった時間が取れなくても、始められる趣味はあります。",
   intro:"忙しい人が趣味を諦める理由の多くは<b>「時間がない」</b>です。でも実際には、5分10分でできるものもたくさんあります。<br><br>そして<b>短い時間の趣味は習慣になりやすい</b>。毎日少しずつのほうが、月に一度の大きな時間より続きます。",
   filter:(h)=>h[12]<=1 && h[8]<=2, sort:(a,b)=>a[12]-b[12], n:30},
  {slug:"cheap-list", title:"お金をかけない趣味30選", h1:"お金がかからない趣味30選｜0円から始める",
   kw:"お金かからない 趣味", lead:"道具をほとんど必要としない趣味を集めました。",
   intro:"お金をかけない趣味には<b>「やめやすい」</b>という隠れた利点があります。高い道具を買うと「元を取らなきゃ」という義務感が生まれますが、0円で始めたものは楽しいから続く。<br><br><b>まず0円で試して、面白かったらお金をかける</b>。この順番が最も失敗しにくいと思います。",
   filter:(h)=>h[8]===0, sort:(a,b)=>(b[3]["発見"]||0)-(a[3]["発見"]||0), n:30},
];

function listPage(cfg, items) {
  const url = `${SITE}/${cfg.slug}.html`;
  const faq = [
    [`${cfg.kw}にはどんなものがありますか?`, `${items.length}種類を紹介しています。全${HOBBIES.length}種の趣味データベースから、${cfg.kw}に該当するものを選びました。それぞれに始め方と「どう深くなっていくか」も掲載しています。`],
    ["初心者でも始められますか?", "はい。それぞれの趣味ページに、必要な道具・だいたいの費用・始め方の動画を載せています。初日から楽しめるものも多く含まれています。"],
    ["自分に合うものが分かりません", "質問に答えるだけの趣味診断があります。全1000種の中から、あなたに合う一つを3分ほどで見抜きます。無料・登録不要です。"]
  ];
  const faqld = `<script type="application/ld+json">${JSON.stringify({
    "@context":"https://schema.org","@type":"FAQPage","mainEntity":faq.map(q=>({"@type":"Question","name":q[0],"acceptedAnswer":{"@type":"Answer","text":q[1]}}))})}</script>`;
  const artld = `<script type="application/ld+json">${JSON.stringify({
    "@context":"https://schema.org","@type":"Article","headline":cfg.h1,
    "author":{"@type":"Person","name":"導師真ショウ","jobTitle":"国家資格キャリアコンサルタント"},
    "publisher":{"@type":"Organization","name":"シュミネーター"},
    "description":cfg.lead,"inLanguage":"ja","mainEntityOfPage":url})}</script>`;

  let s = head(`${cfg.title}｜シュミネーター`,
    `${cfg.lead} 全${HOBBIES.length}種の趣味データベースから厳選。それぞれの始め方・道具・費用・どう深くなっていくかも紹介します。`,
    url, artld + faqld);
  s += `\n<p class="crumb"><a href="${SITE}/zukan.html">趣味図鑑</a> › ${esc(cfg.title)}</p>`;
  s += `\n<a class="cta-top" href="${SITE}/?p=330">▶ どれが自分に合うか、診断してもらう<small>質問に答えるだけ・3分・無料・全${HOBBIES.length}種から</small></a>`;
  s += `\n<div class="card">`;
  s += `\n<h1>${esc(cfg.h1)}</h1>`;
  s += `\n<div class="rule"></div>`;
  s += `\n<p class="desc">${cfg.lead}</p>`;
  s += `\n<p style="font-size:14.5px">${cfg.intro}</p>`;
  s += `\n<h2>${esc(cfg.title)}</h2>`;
  s += `\n<div class="llist">`;
  items.forEach((h) => {
    const i = HOBBIES.indexOf(h);
    const cores = Object.entries(h[3]).sort((a,b)=>b[1]-a[1]).slice(0,3).map(x=>x[0]);
    const vd = (VIDEOS[h[0]] && VIDEOS[h[0]].v && VIDEOS[h[0]].v[0]) ? VIDEOS[h[0]].v[0] : null;
    s += `<a class="litem" href="${SITE}/hobby/${i+1}.html?p=331">`
      + `<div class="lrow">`
      + (vd ? `<img class="lthumb" loading="lazy" src="https://i.ytimg.com/vi/${esc(vd.id)}/mqdefault.jpg" alt="${esc(h[0])}の動画">` : `<div class="lthumb lnoimg">🔮</div>`)
      + `<div class="lbody">`
      + `<b>${esc(h[0])}</b>`
      + `<span class="lchips">${cores.map(c=>`<i>${esc(c)}</i>`).join("")}</span>`
      + `<span class="ldesc">${esc(h[5])}</span>`
      + `</div></div>`
      + (h[15] ? `<span class="ldeep">▸ ${esc(h[15][2])}</span>` : "")
      + `</a>`;
  });
  s += `</div>`;
  s += `\n<h2>よくある質問</h2>\n<dl class="faq2">`;
  faq.forEach(q => { s += `<dt>${esc(q[0])}</dt><dd>${esc(q[1])}</dd>`; });
  s += `</dl>`;
  s += `\n</div>`;
  s += `\n<a class="cta" href="${SITE}/?p=332">▶ あなたに眠っている趣味を診断する<small>全${HOBBIES.length}種から、神様が見抜きます(無料・3分)</small></a>`;
  s += `\n<p style="text-align:center;margin:10px 0 0"><a href="${SITE}/random.html?p=333" style="color:var(--sakura);font-size:14px">🎲 ランダムに1つ引いてみる</a> ・ <a href="${SITE}/zukan.html" style="color:var(--sakura);font-size:14px">趣味図鑑(全${HOBBIES.length}種)</a></p>`;
  s += `\n<footer>監修:導師真ショウ(国家資格キャリアコンサルタント)<br><a href="${SITE}/">シュミネーター</a>は、全${HOBBIES.length}種からあなたに眠る趣味を見抜く無料の診断ゲームです。</footer>`;
  s += `\n</div><a class="fab" href="${SITE}/?p=334">🔮 趣味を診断する</a></body></html>`;
  return s;
}

// ---------- 出力 ----------`;
fs.mkdirSync('hobby', { recursive: true });
HOBBIES.forEach((h, i) => {
  fs.writeFileSync(path.join('hobby', (i + 1) + '.html'), hobbyPage(h, i));
});
fs.writeFileSync('zukan.html', zukanPage());
fs.writeFileSync('random.html', randomPage());

// 一覧ページ(ジャンル別 + 条件別)
const listUrls = [];
LIST_PAGES.forEach(cfg => {
  const items = HOBBIES.filter(h => h[1] === cfg.genre)
    .sort((a,b) => (b[10]!==undefined?b[10]:2) - (a[10]!==undefined?a[10]:2));
  fs.writeFileSync(cfg.slug + '.html', listPage(cfg, items));
  listUrls.push(cfg.slug + '.html');
});
COND_PAGES.forEach(cfg => {
  const items = HOBBIES.filter(cfg.filter).sort(cfg.sort).slice(0, cfg.n);
  fs.writeFileSync(cfg.slug + '.html', listPage(cfg, items));
  listUrls.push(cfg.slug + '.html');
});
console.log('一覧ページ:', listUrls.length, '枚');

const urls = [
  [`${SITE}/`, '1.0'],
  [`${SITE}/zukan.html`, '0.9'],
  [`${SITE}/random.html`, '0.9'],
  ...listUrls.map(u => [`${SITE}/${u}`, '0.8']),
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
