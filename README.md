# 縦書き原稿用紙

パソコン版Chromeブラウザの拡張機能「縦書き原稿用紙」のプログラム一式です（1.0.3）。

## 拡張機能を作る

Node.js 22以降で次のコマンドを実行すると、`chrome-extension` フォルダーに拡張機能が作られます。

    node scripts/build-chrome-extension.cjs

## 紹介サイト

このリポジトリには、紹介サイト（https://tategaki-genko.pages.dev）の元ファイル（`site/`）も入っています。`node scripts/build-site.cjs` を実行すると、`site/public` フォルダーにサイトが書き出されます。

## ライセンス

著作権は〔作者名〕にあります。使う・読む・自分や自分の組織の中で直すのは自由です。配る・公開する・ストアに出す・販売することはできません。全文は [LICENSE.md](LICENSE.md) にあります。
