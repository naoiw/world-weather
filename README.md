# WORLD WEATHER

3D地球儀を操作しながら世界各地の天気を確認できるダッシュボードを目指す、GitHub Pages向けWebアプリです。

現在は**第1段階：3D地球儀の表示と操作**まで実装しています。**天気取得、都市ラベル、現地時刻、実際の太陽位置と連動する昼夜表現は未実装**です。

## 公開先

| 環境 | ブランチ | URL |
| --- | --- | --- |
| 本番 | `main` | https://naoiw.github.io/world-weather/ |
| 開発プレビュー | `develop` | https://naoiw.github.io/world-weather/develop/ |

本番は現段階で準備中ページです。地球儀の動作確認は開発プレビューを使用してください。GitHub Pages の Source を **GitHub Actions** に設定する必要があります。

## 実装済み機能

- 地表テクスチャを使った3D地球儀（画像取得失敗時は単色で表示）
- PCのドラッグ・スマホのスワイプによる**横方向だけ**の回転
- マウスホイール・ピンチによるズーム、拡大／縮小ボタン
- 初期視点へのリセット、自動回転ON／OFF
- ライティング・大気の発光表現・星空とダーク系のレスポンシブUI
- UTC時刻表示（天気情報ではなくブラウザ時刻から算出）

## 操作方法

1. 地球儀をドラッグまたはスワイプして左右に回転します。上下方向には回転しません。
2. ホイールや2本指のピンチ、右側の `+` / `−` ボタンで拡大・縮小します。
3. `RESET` で視点を戻し、`AUTO ROTATE` で自動回転を切り替えます。

## 技術スタック

- React 19 / TypeScript 5 / Vite 7
- Three.js / OrbitControls（WebGL）
- GitHub Actions / GitHub Pages
- 地表画像・地形画像はthree-globeの公開サンプルを外部URLから取得（表示時に通信が必要）

## ローカル開発

Node.js 22以降を推奨します。

```bash
git clone https://github.com/naoiw/world-weather.git
cd world-weather
git switch develop
npm install
npm run dev
npm run build
```

プレビュー用ビルド：`npm run build:pages:develop`。本番用ビルド：`npm run build:pages:main`。

## ブランチ・デプロイ運用

1. 通常の開発は `develop` を対象とします。必要に応じて作業ブランチからPRを作成します。
2. `develop` のpushでCIを実行。成功後、単一のGitHub Pagesサイト内の `/develop/` を更新します。
3. 確認後 `develop` → `main` のPRをマージし、本番を更新します。
4. `main` と `develop` は維持し、一時作業ブランチはマージ後に削除します。

詳細は [デプロイ](docs/DEPLOYMENT.md) を参照してください。

## ディレクトリ構成

| パス | 役割 |
| --- | --- |
| `src/App.tsx` | 画面レイアウト・操作ボタン・表示状態 |
| `src/components/EarthGlobe.tsx` | 地球儀のレンダリング、回転、ズーム、WebGLリソース管理 |
| `src/styles.css` | 専用デザインとレスポンシブレイアウト |
| `public/` | ファビコンなど静的アセット |
| `.github/workflows/` | CIとGitHub Pagesの本番・プレビュー公開 |
| `docs/` | 仕様・開発・デプロイ資料 |

## ドキュメント

- [機能仕様と今後の実装](docs/SPEC.md)
- [開発・検証手順](docs/DEVELOPMENT.md)
- [GitHub Pages デプロイ](docs/DEPLOYMENT.md)
- [UI方針](docs/UI.md)

## ライセンス

自作コードは [MIT License](LICENSE)。Three.jsと外部画像の著作権・利用条件は各提供元に帰属します。地表画像の提供元は [three-globe example](https://github.com/vasturiano/three-globe) です。画像はこのリポジトリには再配布していません。
