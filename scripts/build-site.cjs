// Build the product site: site/pages/*.html (page bodies) into site/public/ with
// the shared header, navigation and footer. The source code lives on GitHub only.
// No scripts, external fonts or trackers are added. Cloudflare Pages publishes it.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '..'), site = path.join(root, 'site'), out = path.join(site, 'public');
// The menu lists pages, never sections of a page; the footer repeats it.
// The contact address is on ご利用について (policy.html); there is no contact form.
const nav = [['index', 'トップ'], ['schools', '学校の方へ'], ['try', 'ためし書き'], ['policy', 'ご利用について']];
const footer = nav;

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(path.join(out, 'images'), { recursive: true });
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
// Browsers keep a stylesheet or script for hours; the content's fingerprint in its
// address makes a changed page load its own files, never yesterday's.
function fingerprint(file) { return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').slice(0, 10); }
const fresh = file => `${file}?v=${fingerprint(path.join(demo, file))}`;
// ためし書き is already on the site, so its panel leaves out the link to it.
const siteLink = /　<a id="site-link"[^>]*>[^<]*<\/a>/;
if (!siteLink.test(editorPage)) throw Error('editor.html: site link not found');
fs.writeFileSync(path.join(demo, 'editor.html'), editorPage
  .replace(siteLink, '')
  .replace('<link rel="stylesheet" href="editor.css">', `<link rel="stylesheet" href="${fresh('editor.css')}">`)
  .replace('<script src="editor.js"></script>', `<script src="${fresh('editor.js')}"></script>`)
  .replace('<script src="startup.js"></script>', `<script src="${fresh('startup.js')}"></script>\n<script src="${fresh('demo.js')}"></script>`)
  .replace('<title>縦書き原稿用紙</title>', '<title>ためし書き — 縦書き原稿用紙</title>\n<meta name="robots" content="noindex">\n' + favicon('../')));
// The favicon is the extension's own icon, as built above.
for (const size of [16, 32]) fs.copyFileSync(path.join(built, 'icons', `genko-${size}.png`), path.join(out, `favicon-${size}.png`));
fs.writeFileSync(path.join(out, '_headers'), `/try/*
  Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'self'
`);
// The site's own address: search engines are pointed here, not to tategaki-genko.pages.dev.
const SITE_URL = 'https://genko.page/';
const SOURCE_URL = 'https://github.com/nari4D/tategaki-genko';
// The extension's page in the Chrome Web Store (published 2026-10-31).
const STORE_ID = 'ajkpkapkhmhflkcfjmicbdbnboaihjep', STORE_URL = 'https://chromewebstore.google.com/detail/' + STORE_ID;
// The copyright and privacy page was legal.html while it also listed the terms;
// the source code moved from /source/ to GitHub.
fs.writeFileSync(path.join(out, '_redirects'), `/legal.html /policy.html 301\n/legal /policy 301\n/source/* ${SOURCE_URL} 301\n/source ${SOURCE_URL} 301\n`);
const styleVersion = crypto.createHash('sha256').update(fs.readFileSync(path.join(out, 'style.css'))).digest('hex').slice(0, 10);
function favicon(up) {
  return [16, 32].map(size => `<link rel="icon" type="image/png" sizes="${size}x${size}" href="${up}favicon-${size}.png">`).join('\n');
}
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
${up ? '' : `<link rel="canonical" href="${SITE_URL}${name === 'index' ? '' : name}">\n`}${favicon(up)}
<link rel="stylesheet" href="${up}style.css?v=${styleVersion}">
</head>
<body>
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
  // Pictures carry their fingerprint too, so a replaced image is never served from yesterday's cache.
  const withImages = body.replace(/(src|poster)="images\/([^"?]+)"/g, (_, attr, image) =>
    `${attr}="images/${image}?v=${crypto.createHash('sha256').update(fs.readFileSync(path.join(out, 'images', image))).digest('hex').slice(0, 10)}"`);
  fs.writeFileSync(path.join(out, file), render({ name, title, description, body: withImages.replaceAll('{{SOURCE_URL}}', SOURCE_URL).replaceAll('{{STORE_URL}}', STORE_URL).replaceAll('{{STORE_ID}}', STORE_ID) }));
}

console.log('サイトを生成: ' + out + '（公開は push で）');
