// Build the static product site draft: site/pages/*.html (page bodies) into
// site/public/ with the shared header, navigation and footer, plus the source
// pages (site/public/source/: one coloured page per file and a ZIP of the set).
// No scripts, external fonts or trackers are added. Not published; preview locally.
const fs = require('node:fs'), path = require('node:path'), zlib = require('node:zlib'), crypto = require('node:crypto'), { execFileSync } = require('node:child_process');
const { entries, version } = require('./source-files.cjs');
const { highlight, languageOf } = require('./highlight.cjs');
const root = path.resolve(__dirname, '..'), site = path.join(root, 'site'), out = path.join(site, 'public');
// The menu lists pages, never sections of a page; the footer repeats it.
// There is no contact page: the address is given in the store only.
const nav = [['index', 'トップ'], ['schools', '学校・教育機関の方へ'], ['try', 'ためし書き'], ['legal', 'ご利用について']];
const footer = nav;

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(path.join(out, 'images'), { recursive: true });
fs.mkdirSync(path.join(out, 'source'));
fs.copyFileSync(path.join(site, 'style.css'), path.join(out, 'style.css'));
for (const image of fs.readdirSync(path.join(site, 'images'))) fs.copyFileSync(path.join(site, 'images', image), path.join(out, 'images', image));

// ためし書き: the extension's editor as built from the published source, with
// site/demo/demo.js loaded before it (memory instead of browser storage, opens
// on a blank manuscript). The page may not connect anywhere.
execFileSync(process.execPath, [path.join(root, 'scripts', 'build-chrome-extension.cjs')], { stdio: 'ignore' });
const built = path.join(root, 'chrome-extension'), demo = path.join(out, 'try');
fs.mkdirSync(demo);
for (const file of ['editor.css', 'editor.js', 'startup.js', 'notices.txt']) fs.copyFileSync(path.join(built, file), path.join(demo, file));
fs.cpSync(path.join(built, 'fonts'), path.join(demo, 'fonts'), { recursive: true });
fs.copyFileSync(path.join(site, 'demo', 'demo.js'), path.join(demo, 'demo.js'));
const editorPage = fs.readFileSync(path.join(built, 'editor.html'), 'utf8');
if (editorPage.split('<script src="startup.js"></script>').length !== 2) throw Error('editor.html: startup.js script tag not found once');
// ためし書き is already on the site, so its panel leaves out the link to it.
const siteLink = /　<a id="site-link"[^>]*>[^<]*<\/a>/;
if (!siteLink.test(editorPage)) throw Error('editor.html: site link not found');
fs.writeFileSync(path.join(demo, 'editor.html'), editorPage
  .replace(siteLink, '')
  .replace('<script src="startup.js"></script>', '<script src="startup.js"></script>\n<script src="demo.js"></script>')
  .replace('<title>縦書き原稿用紙</title>', '<title>ためし書き — 縦書き原稿用紙</title>\n<meta name="robots" content="noindex">'));
fs.writeFileSync(path.join(out, '_headers'), `/try/*
  Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'self'
`);

// `up` is '' for top-level pages and '../' for pages under source/.
function render({ name, title, description, body, up = '' }) {
  const link = ([target, label]) => {
    const [page, hash] = target.split('#');
    return `<a href="${up}${page}.html${hash ? '#' + hash : ''}"${!up && page === name && !hash ? ' aria-current="page"' : ''}>${label}</a>`;
  };
  return `<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${name === 'index' && !up ? '縦書き原稿用紙 — パソコン版Chromeブラウザの拡張機能' : title + ' — 縦書き原稿用紙'}</title>
<meta name="description" content="${description}">
<meta name="robots" content="noindex">
<link rel="stylesheet" href="${up}style.css">
</head>
<body>
<div class="draft-banner">下書き（未公開）</div>
<header class="rail">
<a class="brand" href="${up}index.html"><span class="brand-mark" aria-hidden="true"></span>縦書き原稿用紙</a>
<nav aria-label="サイト内">${nav.map(link).join('')}</nav>
</header>
<main>
${body.trim()}
</main>
${name === 'try' && !up ? '' /* ためし書き ends with the demo */ : `<footer><div class="colophon"><span class="title">縦書き原稿用紙</span><span class="sub">PC版Chromeブラウザの拡張機能</span>${footer.map(link).join('')}<span class="copy">© 2026 お鋳成（OINARI）</span></div></footer>
`}</body>
</html>
`;
}

for (const file of fs.readdirSync(path.join(site, 'pages')).filter(name => name.endsWith('.html'))) {
  const name = file.replace(/\.html$/, '');
  const source = fs.readFileSync(path.join(site, 'pages', file), 'utf8');
  const meta = source.match(/^<!--\s*title:\s*(.+?)\s*\|\s*description:\s*(.+?)\s*-->\n/);
  if (!meta) throw Error(file + ': missing title/description comment');
  const [, title, description] = meta;
  // A genko title becomes one square per character; '／' starts a new column.
  const body = source.slice(meta[0].length).replace(/<h1 class="genko-title">([^<]+)<\/h1>/g, (_, text) =>
    '<h1 class="genko-title" aria-label="' + text.replaceAll('／', '') + '">' + text.split('／').map(column => '<span class="col" aria-hidden="true">' + [...column].map(ch => '<span>' + ch + '</span>').join('') + '</span>').join('') + '</h1>');
  fs.writeFileSync(path.join(out, file), render({ name, title, description, body }));
}

// Source pages: a list with SHA-256 fingerprints, one coloured page per text file,
// and the whole set as a ZIP (fixed timestamps, so the same set gives the same ZIP).
const set = entries(), zipName = `tategaki-genko-source-${version}.zip`;
const pageOf = file => file.replaceAll('/', '_') + '.html';
const isText = file => !file.endsWith('.woff2');
const rows = set.map(([file, data]) => {
  const sha = crypto.createHash('sha256').update(data).digest('hex');
  const lines = isText(file) ? data.toString('utf8').split('\n').length : null;
  return `<tr><td>${isText(file) ? `<a href="${pageOf(file)}">${file}</a>` : file}</td><td class="num">${lines ?? '—'}</td><td class="sha">${sha}</td></tr>`;
});
fs.writeFileSync(path.join(out, 'source', zipName), zip(set));
const zipSize = (fs.statSync(path.join(out, 'source', zipName)).size / 1048576).toFixed(1);
fs.writeFileSync(path.join(out, 'source', 'index.html'), render({
  name: 'source', up: '../', title: 'ソースコード', description: '縦書き原稿用紙のソースコード一式。',
  body: `<article class="code-page">
<h1>ソースコード（${version}）</h1>
<p>Chromeウェブストアで公開する拡張機能は、この一式から作ります。Node.js 22以降で <code>node scripts/build-chrome-extension.cjs</code> を実行すると、<code>chrome-extension</code> フォルダーに拡張機能が作られます。</p>
<p><a class="download" href="${zipName}" download>一式をダウンロード（ZIP、${zipSize}MB）</a>　<a href="LICENSE.md.html">ライセンス</a></p>
<div class="table-wrap"><table class="files"><thead><tr><th>ファイル</th><th>行数</th><th>SHA-256</th></tr></thead><tbody>
${rows.join('\n')}
</tbody></table></div>
</article>`
}));
for (const [file, data] of set.filter(([file]) => isText(file))) {
  const lines = highlight(data.toString('utf8').replace(/\r\n/g, '\n'), file);
  fs.writeFileSync(path.join(out, 'source', pageOf(file)), render({
    name: 'source', up: '../', title: file, description: `縦書き原稿用紙のソースコード：${file}`,
    body: `<article class="code-page">
<p class="crumb"><a href="index.html">ソースコード</a> ／ ${file}</p>
<h1>${file}</h1>
<pre class="code${languageOf(file) ? '' : ' plain'}"><code>${lines.map(line => `<span class="l">${line}</span>`).join('')}</code></pre>
</article>`
  }));
}

// A plain ZIP writer (deflate), so the build needs no packages.
function zip(items) {
  const local = [], central = [];
  let offset = 0;
  const time = 0, date = ((2026 - 1980) << 9) | (1 << 5) | 1;
  for (const [name, data] of items) {
    const packed = zlib.deflateRawSync(data, { level: 9 }), crc = zlib.crc32(data), nameBuf = Buffer.from(name);
    const head = Buffer.alloc(30);
    head.writeUInt32LE(0x04034b50, 0); head.writeUInt16LE(20, 4); head.writeUInt16LE(0x0800, 6); head.writeUInt16LE(8, 8);
    head.writeUInt16LE(time, 10); head.writeUInt16LE(date, 12); head.writeUInt32LE(crc, 14);
    head.writeUInt32LE(packed.length, 18); head.writeUInt32LE(data.length, 22); head.writeUInt16LE(nameBuf.length, 26);
    const dir = Buffer.alloc(46);
    dir.writeUInt32LE(0x02014b50, 0); dir.writeUInt16LE(20, 4); dir.writeUInt16LE(20, 6); dir.writeUInt16LE(0x0800, 8); dir.writeUInt16LE(8, 10);
    dir.writeUInt16LE(time, 12); dir.writeUInt16LE(date, 14); dir.writeUInt32LE(crc, 16);
    dir.writeUInt32LE(packed.length, 20); dir.writeUInt32LE(data.length, 24); dir.writeUInt16LE(nameBuf.length, 28); dir.writeUInt32LE(offset, 42);
    local.push(head, nameBuf, packed); central.push(dir, nameBuf);
    offset += head.length + nameBuf.length + packed.length;
  }
  const dirSize = central.reduce((sum, b) => sum + b.length, 0), end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(items.length, 8); end.writeUInt16LE(items.length, 10);
  end.writeUInt32LE(dirSize, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...local, ...central, end]);
}

console.log('サイトの下書きを生成: ' + out + '（公開はしていません）');
