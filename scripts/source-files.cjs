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

## ライセンス

[PolyForm Shield License 1.0.0](LICENSE.md) です。正式な条件は英語の原文で、次はその要約です。

- だれでも無料で使え、直して使えます。書いた原稿は書いた人のものです。
- この拡張機能や、お鋳成（OINARI）がこのソースコードを使って出す製品と競合するものは、出せません。無料でも、直したものでも同じです。
- 書体（クレー One、よもぎ）はSIL Open Font License 1.1、見本の作品は青空文庫の取り扱い規準に従い、このライセンスは及びません。
`,
  // The licence is PolyForm Shield 1.0.0, word for word, after the two lines it asks
  // the licensor to add. The site's 「ご利用について」 (legal.html) sums it up in Japanese.
  'LICENSE.md': `Required Notice: Copyright 2026 お鋳成（OINARI） (https://tategaki-genko.pages.dev/)

Licensor Line of Business: Software for writing Japanese vertically on genko yoshi manuscript paper (https://tategaki-genko.pages.dev/)

These terms do not cover the fonts in assets/fonts (SIL Open Font License 1.1, see each OFL.txt) or the sample literary works in data/literature (public domain in Japan, from Aozora Bunko).

` + fs.readFileSync(path.join(root, 'assets/licenses/PolyForm-Shield-1.0.0.md'), 'utf8'),
  'package.json': JSON.stringify({ name: 'tategaki-genko', version, private: true, scripts: { build: 'node scripts/build-chrome-extension.cjs' } }, null, 2) + '\n',
  '.gitignore': 'chrome-extension/\nsite/public/\n',
  // Check files out byte for byte, so they match the SHA-256 list on the site.
  '.gitattributes': '* -text\n'
};

// The site's own source, for the GitHub repository only (not in the ZIP).
const siteFiles = () => [
  'scripts/build-site.cjs', 'scripts/highlight.cjs', 'scripts/source-files.cjs', 'assets/licenses/PolyForm-Shield-1.0.0.md', 'site/style.css', 'site/demo/demo.js',
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
