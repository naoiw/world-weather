# 開発・検証手順

## 必要環境

- Node.js 22以上
- npm（Node.js付属）
- WebGL対応ブラウザ（Chrome / Firefox / Edge / Safariの新しいバージョン）

## ローカル起動

```bash
git clone https://github.com/naoiw/world-weather.git
cd world-weather
git switch develop
npm install
npm run dev
```

Viteが表示するURLを開きます。現在、APIキーや環境変数は不要です。

```bash
npm run build
npm run build:pages:develop
npm run build:pages:main
npm run preview
```

`dist/` は生成物でありコミットしません。`npm install` は現段階ではロックファイルなしで実行しています。依存更新を確実に再現したい場合は、ロックファイルを生成・コミットしCIを `npm ci` に切り替えてください。

## 手動確認チェックリスト

- デスクトップで地球儀が表示され、横ドラッグで回転する。
- 上下ドラッグで地球儀の傾きが変わらない。
- スマートフォンでスワイプ・ピンチが動く。
- マウスホイール、`+` / `−`、`RESET`、`AUTO ROTATE` が動く。
- 小型画面でUIが画面外にはみ出さない。
- 画像URLへの通信を遮断しても単色の地球儀が残る。
- WebGL未対応時にはエラーが表示される。
- `/world-weather/develop/` のCSS/JSが404にならない。

CIではTypeScript型チェックとビルドを検証します。GPU・タッチ・ブラウザ表示の実機検証は手動で実施してください。

## 運用

通常は作業ブランチ→`develop`へのPR→プレビュー確認→`main`へのPR。初期セットアップのみ`develop`に直接追加しています。

## 外部リソース

地球の地表と凹凸テクスチャは `unpkg.com/three-globe/example/img/` から読み込みます。読み込み失敗時は単色球と基本ライティングが残る設計です。将来、画像の再配布条件を確認した上でローカル配信に移すことも検討します。
