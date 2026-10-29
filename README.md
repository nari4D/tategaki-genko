# 縦書き原稿用紙

パソコン版Chromeブラウザの拡張機能「縦書き原稿用紙」のプログラム一式です（1.0.0）。

## 拡張機能を作る

Node.js 22以降で次のコマンドを実行すると、`chrome-extension` フォルダーに拡張機能が作られます。

    node scripts/build-chrome-extension.cjs

## 紹介サイト

このリポジトリには、紹介サイト（https://tategaki-genko.pages.dev）の元ファイル（`site/`）も入っています。`node scripts/build-site.cjs` を実行すると、`site/public` フォルダーにサイトが書き出されます。

## ライセンス

[PolyForm Shield License 1.0.0](LICENSE.md) です。正式な条件は英語の原文で、次はその要約です。

- だれでも無料で使え、直して使えます。書いた原稿は書いた人のものです。
- この拡張機能や、お鋳成（OINARI）がこのソースコードを使って出す製品と競合するものは、出せません。無料でも、直したものでも同じです。
- 書体（クレー One、よもぎ）はSIL Open Font License 1.1、見本の作品は青空文庫の取り扱い規準に従い、このライセンスは及びません。
