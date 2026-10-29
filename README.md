# 縦書き原稿用紙

パソコン版Chromeブラウザの拡張機能「縦書き原稿用紙」のプログラム一式です（1.0.0）。

## 拡張機能を作る

Node.js 22以降で次のコマンドを実行すると、`chrome-extension` フォルダーに拡張機能が作られます。

    node scripts/build-chrome-extension.cjs

## 紹介サイト

このリポジトリには、紹介サイト（https://tategaki-genko.pages.dev）の元ファイル（`site/`）も入っています。`node scripts/build-site.cjs` を実行すると、`site/public` フォルダーにサイトが書き出されます。

## 著作権

© 2026 お鋳成（OINARI）All rights reserved. 自由に使ってよいことは [COPYRIGHT.md](COPYRIGHT.md) にあります。
