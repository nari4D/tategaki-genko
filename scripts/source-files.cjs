// The published source set: everything needed to build chrome-extension/ with
// `node scripts/build-chrome-extension.cjs`, and nothing else. Used for the
// source pages and ZIP on the site (build-site.cjs). The GitHub repository
// (export-source.cjs) also holds the site's own source, which Cloudflare Pages
// builds on every push. Development history, old versions and tests stay private.
const fs = require('node:fs'), path = require('node:path');
const root = path.resolve(__dirname, '..');

const files = [
  'src/chrome/editor.html', 'src/chrome/editor.css', 'src/chrome/editor.js', 'src/chrome/startup.js',
  'src/chrome/background.js', 'src/chrome/print-geometry.cjs',
  'scripts/build-chrome-extension.cjs', 'scripts/manuscript-samples.cjs', 'scripts/vertical-alternates.json',
  'data/manuscript-check.cjs', 'data/chrome/legacy-samples.json',
  'data/literature/kyonen-no-ki.json', 'data/literature/kumo-no-ito.json', 'data/literature/chumon-no-oi-ryoriten.json',
  'assets/fonts/klee-one/KleeOne-Regular.woff2', 'assets/fonts/klee-one/OFL.txt',
  'assets/fonts/yomogi/Yomogi-Regular.woff2', 'assets/fonts/yomogi/OFL.txt'
];

const version = fs.readFileSync(path.join(root, 'scripts', 'build-chrome-extension.cjs'), 'utf8').match(/extensionVersion = '([^']+)'/)[1];

// Files written for the published set only.
const generated = {
  'README.md': `# 縦書き原稿

パソコン版Chromeブラウザの拡張機能「縦書き原稿」のプログラム一式です（${version}）。

## 拡張機能を作る

Node.js 22以降で次のコマンドを実行すると、\`chrome-extension\` フォルダーに拡張機能が作られます。

    node scripts/build-chrome-extension.cjs

## 紹介サイト

このリポジトリには、紹介サイト（https://tategaki-genko.pages.dev）の元ファイル（\`site/\`）も入っています。\`node scripts/build-site.cjs\` を実行すると、\`site/public\` フォルダーにサイトが書き出されます。

## ライセンス

〔未定〕。同梱の書体（クレー One、よもぎ）はSIL Open Font License 1.1、見本の作品は青空文庫の取り扱い規準に従います。
`,
  'package.json': JSON.stringify({ name: 'tategaki-genko', version, private: true, scripts: { build: 'node scripts/build-chrome-extension.cjs' } }, null, 2) + '\n',
  '.gitignore': 'chrome-extension/\nsite/public/\n',
  // Check files out byte for byte, so they match the SHA-256 list on the site.
  '.gitattributes': '* -text\n'
};

// The site's own source, for the GitHub repository only (not in the ZIP).
const siteFiles = () => [
  'scripts/build-site.cjs', 'scripts/highlight.cjs', 'scripts/source-files.cjs', 'site/style.css',
  ...['pages', 'images'].flatMap(dir => fs.readdirSync(path.join(root, 'site', dir)).map(name => `site/${dir}/${name}`))
];
// Cloudflare Pages builds the site with this Node.js version.
const repositoryOnly = { '.node-version': '22\n' };

const text = list => Object.entries(list).map(([name, value]) => [name, Buffer.from(value)]);
const read = names => names.map(name => [name, fs.readFileSync(path.join(root, name))]);
// [path, Buffer] for every file in the published set, generated files first.
const entries = () => [...text(generated), ...read(files)];
// Everything in the GitHub repository.
const repositoryEntries = () => [...entries(), ...text(repositoryOnly), ...read(siteFiles())];

module.exports = { files, generated, entries, repositoryEntries, version };
