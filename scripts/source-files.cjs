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
  'data/guide.cjs', 'data/chrome/legacy-samples.json',
  'data/literature/sangetsuki.json', 'data/literature/chumon-no-oi-ryoriten.json',
  'assets/fonts/klee-one/KleeOne-Regular.woff2', 'assets/fonts/klee-one/OFL.txt',
  'assets/fonts/yomogi/Yomogi-Regular.woff2', 'assets/fonts/yomogi/OFL.txt'
];

const version = fs.readFileSync(path.join(root, 'scripts', 'build-chrome-extension.cjs'), 'utf8').match(/extensionVersion = '([^']+)'/)[1];

// Files written for the published set only.
const generated = {
  'README.md': `# 縦書き原稿用紙

パソコン版Chromeブラウザの拡張機能「縦書き原稿用紙」のプログラム一式です（${version}）。

## 拡張機能を作る

Node.js 22以降で次のコマンドを実行すると、\`chrome-extension\` フォルダーに拡張機能が作られます。

    node scripts/build-chrome-extension.cjs

## 紹介サイト

このリポジトリには、紹介サイト（https://tategaki-genko.pages.dev）の元ファイル（\`site/\`）も入っています。\`node scripts/build-site.cjs\` を実行すると、\`site/public\` フォルダーにサイトが書き出されます。

## 著作権

© 2026 お鋳成（OINARI）All rights reserved. 自由に使ってよいことは [COPYRIGHT.md](COPYRIGHT.md) にあります。
`,
  // No licence: all rights reserved, with only what anyone may do spelled out, as the
  // site's top page (「ご自由にどうぞ」) does.
  'COPYRIGHT.md': `# 著作権について

© 2026 お鋳成（OINARI）All rights reserved.

拡張機能「縦書き原稿用紙」と、このリポジトリのソースコード・画像・文章の著作権は、お鋳成（OINARI）にあります。

## ご自由にどうぞ

- 使う：だれでも無料で、目的を問わず使えます。個人でも、学校や会社でも使えます。
- 原稿：書いた原稿は書いた人のものです。提出も応募も、出版や販売も自由です。
- 紹介：人に勧めたり、画面の写しを資料やブログ、SNSに載せたりできます。
- 直す：ソースコードを読み、自分用に直して使えます。

## 書体と見本の作品

- 書体（クレー One、よもぎ）は、それぞれの作者のものです。SIL Open Font License 1.1 に従い（\`assets/fonts/*/OFL.txt\`）、原稿やPDFにも自由に使えます。
- 見本の作品（注文の多い料理店、山月記）は、日本で著作権の保護期間が満了した作品で、青空文庫から収めています。
`,
  'package.json': JSON.stringify({ name: 'tategaki-genko', version, private: true, scripts: { build: 'node scripts/build-chrome-extension.cjs' } }, null, 2) + '\n',
  '.gitignore': 'chrome-extension/\nsite/public/\n',
  // Check files out byte for byte, so they match the SHA-256 list on the site.
  '.gitattributes': '* -text\n'
};

// The site's own source, for the GitHub repository only (not in the ZIP).
const siteFiles = () => [
  'scripts/build-site.cjs', 'scripts/highlight.cjs', 'scripts/source-files.cjs', 'site/style.css', 'site/demo/demo.js',
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
