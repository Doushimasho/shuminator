/* =====================================================
   シュミネーター 動画焼き込みスクリプト(APIキー不要版)
   使い方(手動):  node bake_videos.js --max 100
   使い方(自動):  GitHub Actions(bake-videos.yml)が毎日実行
   仕組み:
   ・YouTubeの検索結果ページを直接読み、上位3本の動画ID・タイトルを
     videos.js に書き込む(スクレイピング方式=上限なし・キー不要)
   ・環境変数 YT_API_KEY があれば公式API方式に自動切替(より安定)
   ・更新が古い趣味から順に処理。失敗した趣味は検索リンク表示に
     自動フォールバックするだけなので実害なし
===================================================== */
const fs = require("fs");

const argIdx = process.argv.indexOf("--max");
const MAX = argIdx > -1 ? Number(process.argv[argIdx + 1]) : 100;
const KEY = process.env.YT_API_KEY || "";

const hj = fs.readFileSync("hobbies.js", "utf8");
const HOBBIES = eval("[" + hj.match(/const HOBBIES=\[([\s\S]*?)\n\];/)[1] + "]");

let BAKED = {};
try {
  const vj = fs.readFileSync("videos.js", "utf8");
  BAKED = eval("(" + vj.match(/const BAKED_VIDEOS = (\{[\s\S]*?\});?\s*$/m)[1] + ")") || {};
} catch (e) { BAKED = {}; }

const targets = HOBBIES.map(h => h[0])
  .sort((a, b) => ((BAKED[a] && BAKED[a].u) || 0) - ((BAKED[b] && BAKED[b].u) || 0))
  .slice(0, MAX);

// 検索結果HTMLから動画ID+タイトルを抜き出す
function parseResults(html) {
  const out = []; const seen = new Set();
  const re = /"videoRenderer":\{"videoId":"([\w-]{11})".*?"title":\{"runs":\[\{"text":"((?:[^"\\]|\\.)*)"/g;
  let m;
  while ((m = re.exec(html)) && out.length < 3) {
    if (seen.has(m[1])) continue;
    seen.add(m[1]);
    let t = m[2];
    try { t = JSON.parse('"' + m[2] + '"'); } catch (e) {}
    out.push({ id: m[1], t });
  }
  return out;
}

async function fetchScrape(q) {
  const r = await fetch("https://www.youtube.com/results?search_query=" + encodeURIComponent(q) + "&hl=ja&gl=JP", {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36",
      "Accept-Language": "ja-JP,ja;q=0.9"
    }
  });
  if (!r.ok) throw new Error("HTTP " + r.status);
  return parseResults(await r.text());
}

async function fetchApi(q) {
  const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=3&relevanceLanguage=ja&regionCode=JP&videoEmbeddable=true&q=${encodeURIComponent(q)}&key=${KEY}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error("API " + r.status);
  const j = await r.json();
  return (j.items || []).filter(it => it.id && it.id.videoId)
    .map(it => ({ id: it.id.videoId, t: it.snippet.title }));
}

(async () => {
  let done = 0, failed = 0;
  for (const name of targets) {
    try {
      const v = KEY ? await fetchApi(name + " 始め方") : await fetchScrape(name + " 始め方");
      if (v.length) { BAKED[name] = { u: Math.floor(Date.now() / 1000), v }; done++; }
      else failed++;
    } catch (e) {
      failed++;
      if (String(e).includes("API 403")) { console.error("APIクォータ切れ。本日はここまで。"); break; }
    }
    await new Promise(res => setTimeout(res, 400)); // 行儀よく間隔をあける
  }
  fs.writeFileSync("videos.js",
    "/* シュミネーター 焼き込み動画データ(bake_videos.jsが自動生成) */\nconst BAKED_VIDEOS = " +
    JSON.stringify(BAKED, null, 1) + ";\n");
  console.log(`更新 ${done}件 / 失敗 ${failed}件 / 収録合計 ${Object.keys(BAKED).length}件`);
})();
