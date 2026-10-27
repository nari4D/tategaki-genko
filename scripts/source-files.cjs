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

使う・読む・自分や自分の組織の中で直すのは自由です。配る・公開する・ストアに出す・販売することはできません。全文は [LICENSE.md](LICENSE.md) にあります。
`,
  'LICENSE.md': `# 縦書き原稿用紙 ライセンス

著作権者：〔作者名〕

1. このプログラムは、だれでも無料で使えます。個人・会社・学校など、使う人や目的は問いません。
2. プログラムを読むこと、自分や自分の組織の中で使うために直すことは自由です。
3. 次のことはできません。直したものについても同じです。
   - プログラムの全部または一部を、組織の外へ配ったり、公開したりすること
   - Chromeウェブストアなど、拡張機能やアプリを配る場所に出すこと
   - 販売すること、有料のサービスや製品に組み込むこと
4. GitHubの機能で複製（フォーク）することは、GitHubの利用規約で認められた範囲でできます。
5. このプログラムで書いた原稿や、保存したファイル（JSON・TXT・PDF）は、書いた人のものです。このライセンスの制限は及びません。
6. このプログラムは、いまある姿のまま提供します。不具合がないことはお約束できません。故意または重大な過失による場合を除き、使ったことで生じた損害（原稿の消失を含みます）について、著作権者は責任を負いません。
7. 同梱の書体（クレー One、よもぎ）はSIL Open Font License 1.1に、見本の作品は青空文庫の取り扱い規準に従います。このライセンスは、それらには及びません。
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
