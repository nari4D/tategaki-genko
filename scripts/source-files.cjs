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
  'data/manuscript-check.cjs', 'data/guide.cjs', 'data/chrome/legacy-samples.json',
  'data/literature/kyonen-no-ki.json', 'data/literature/kumo-no-ito.json', 'data/literature/chumon-no-oi-ryoriten.json',
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

著作権は〔作者名〕にあります。使う・読む・自分や自分の組織の中で直すのは自由です。配る・公開する・ストアに出す・販売することはできません。全文は [LICENSE.md](LICENSE.md) にあります。
`,
  'LICENSE.md': `# 縦書き原稿用紙 ライセンス

© 2026 〔作者名〕

1. 著作権：このプログラム（ソースコード・画像・文章を含みます）と、紹介サイトの文章・画像の著作権は、〔作者名〕にあります。このライセンスは、次に書く範囲で使うことを認めるもので、著作権を譲るものではありません。ここに書いていない使い方は、著作権法に従います。
2. 使う：だれでも無料で使えます。個人・会社・学校など、使う人や目的は問いません。
3. 読む・直す：プログラムを読むこと、自分や自分の組織の中で使うために直すことは自由です。直した部分の著作権は直した人にありますが、直したものにも、このライセンスが及びます。
4. できないこと（直したものも同じです）：
   - プログラムの全部または一部を、組織の外へ配ったり、公開したりすること
   - Chromeウェブストアなど、拡張機能やアプリを配る場所に出すこと
   - 販売すること、有料のサービスや製品に組み込むこと
5. 紹介と引用：使い方の説明や紹介のために、画面の写しを載せることは自由です。プログラムの一部を、著作権法で認められた範囲で引用することもできます。
6. 複製（フォーク）：GitHubの機能で複製することは、GitHubの利用規約で認められた範囲でできます。
7. 書いた原稿：このプログラムで書いた原稿と、保存したファイル（JSON・TXT・PDF）の著作権は、書いた人にあります。このライセンスの制限は及びません。
8. 同梱のもの：書体（クレー One、よもぎ）はSIL Open Font License 1.1に、見本の作品は青空文庫の取り扱い規準に従います。このライセンスは、それらには及びません。
9. 保証：このプログラムは、いまある姿のまま提供します。不具合がないことはお約束できません。故意または重大な過失による場合を除き、使ったことで生じた損害（原稿の消失を含みます）について、〔作者名〕は責任を負いません。
10. 違反したとき：このライセンスを守らない場合、このプログラムを使う許可はなくなります。
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
