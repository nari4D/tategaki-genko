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
  'data/literature/kumo-no-ito.json', 'data/literature/chumon-no-oi-ryoriten.json',
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

著作権はお鋳成（OINARI）にあります。だれでも無料で使え、書いた原稿は書いた人のものです。ソースコードは読むことも、自分や自分の組織の中で直して使うこともできます。複製を公開する・組織の外の人に渡す・販売することはできません。全文は [LICENSE.md](LICENSE.md) にあります。
`,
  // In the same order as the site's 「ご利用について」 (legal.html), which sums it up.
  'LICENSE.md': `# 縦書き原稿用紙 ライセンス

© 2026 お鋳成（OINARI）

このライセンスは、拡張機能「縦書き原稿用紙」（ソースコード・画像・文章を含みます。以下「このプログラム」）と、紹介サイトの文章・画像を使うことを、次の範囲で認めるものです。著作権を譲るものではありません。

## 1. 自由にできること

- だれでも無料で使うこと。個人・学校・会社など、使う人や目的は問いません。
- このプログラムで書いた原稿を、提出・応募・出版・販売・公開すること。
- 人に勧めること。使い方の説明や紹介のために、画面の写しを載せること（授業の資料、ブログ、SNSなど）。
- ソースコードを読むこと。著作権法で認められた範囲で、その一部を引用すること。
- 自分や自分の組織の中で使うために、ソースコードを直すこと。
- GitHubの機能で複製（フォーク）すること。GitHubの利用規約で認められた範囲に限ります。

## 2. できないこと（直したものも同じです）

- このプログラムの全部または一部の複製を、ネットやストア（Chromeウェブストアなど）で公開したり、組織の外の人に渡したりすること
- このプログラムを販売すること、有料のサービスや製品に組み込むこと

ここに書いていない使い方は、著作権法に従います。

## 3. 著作権

- このプログラムと、紹介サイトの文章・画像：お鋳成（OINARI）
- 直した部分：直した人。ただし、直したものにもこのライセンスが及びます。
- このプログラムで書いた原稿と、保存したファイル（JSON・TXT・PDF）：書いた人。このライセンスの制限は及びません。
- 書体（クレー One、よもぎ）：それぞれの作者。SIL Open Font License 1.1に従い、原稿やPDFにも自由に使えます。
- 見本の作品：日本で著作権の保護期間が満了した作品で、青空文庫の取り扱い規準に従います。

書体と見本の作品には、このライセンスは及びません。

## 4. 保証

このプログラムは、いまある姿のまま提供します。不具合がないことはお約束できません。故意または重大な過失による場合を除き、使ったことで生じた損害（原稿の消失を含みます）について、お鋳成（OINARI）は責任を負いません。

## 5. 違反したとき

このライセンスを守らない場合、このプログラムを使う許可はなくなります。
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
