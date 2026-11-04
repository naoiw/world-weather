# WORLD WEATHER

Three.jsの3D地球儀を回転させながら、世界各地の天気を眺めるダッシュボードを目指すブラウザアプリです。現在は地球儀の表示・操作を実装しており、都市ごとの天気情報は今後追加します。

## 主な機能

- 地表テクスチャ・地形の凹凸・大気の光・星空を組み合わせた3D地球儀
- マウスのドラッグ・スマートフォンのスワイプによる経度方向の回転（上下方向には回転しません）
- ホイール・ピンチ・画面ボタンによるズーム、初期視点へのリセット
- 自動回転のON／OFF切り替え
- ダーク系のレスポンシブUI、ブラウザ時刻に基づくUTC時刻表示

**開発中：** 都市ラベル、天気・気温・湿度、現地時刻、現実の太陽位置に応じた昼夜表現は未実装です。現在の照明は演出で、実際の昼夜とは連動していません。

## 公開先

| 環境 | ブランチ | URL |
| --- | --- | --- |
| 本番 | `main` | https://naoiw.github.io/world-weather/ |
| 開発プレビュー | `develop` | https://naoiw.github.io/world-weather/develop/ |

本番とプレビューは、1つのGitHub Pagesサイト（`github-pages` 環境）内の別々のパスで公開します。本番は現時点で準備中ページです。公開にはGitHub PagesのSourceを **GitHub Actions** に設定する必要があります。

## 技術スタック

- **TypeScript / React 19** — アプリケーションロジック・画面構成
- **Three.js / OrbitControls（WebGL）** — 3D地球儀の描画・回転・ズーム
- **CSS / Vite 7** — スタイル・開発サーバー・ビルド
- **Node.js 22 / npm** — 開発・ビルド
- **GitHub Actions / GitHub Pages** — ビルド検証・デプロイ

地表画像・地形画像はthree-globeの公開サンプルを外部URLから取得します。画像取得に失敗した場合は単色の地球儀を表示します。

## ローカル開発

```bash
git clone https://github.com/naoiw/world-weather.git
cd world-weather
git switch develop
npm install
npm run dev    # 開発サーバーを起動
npm run build  # 型チェック・本番用ファイルを dist/ に生成
```

`npm run dev` はViteの開発サーバーを起動し、ファイル変更を画面に反映します。生成物（`dist/`）はGit管理対象外です。Pages用ビルドは `npm run build:pages:develop` / `npm run build:pages:main` で確認できます。

## ブランチ運用

1. 通常の実装・修正は `develop` で行い、`main` は本番用として維持します。
2. Pull Requestでは型チェックとビルドを実行し、デプロイは行いません。
3. `develop` へのpushは検証成功後、`main` 側のワークフローから開発プレビューに反映します。
4. 本番反映は **`develop` → `main` のPull Request** で行います。マージ後も `develop` は削除せず、`main` と同期して使い続けます。

## ディレクトリ構成

- `index.html` — 画面のエントリポイント
- `src/App.tsx` — 画面構成・操作パネル・表示状態
- `src/components/EarthGlobe.tsx` — Three.jsの描画・回転・ズーム
- `src/styles.css` — アプリ専用のスタイル・レスポンシブUI
- `public/` — ファビコンなどの静的ファイル
- `.github/workflows/` — ビルド検証・GitHub Pagesデプロイ設定
- `docs/` — 仕様・開発・デプロイ・UI方針のドキュメント

## ドキュメント

- [仕様書](docs/SPEC.md)
- [開発手順](docs/DEVELOPMENT.md)
- [デプロイ構成](docs/DEPLOYMENT.md)
- [UI方針](docs/UI.md)

## ライセンス

[MIT License](LICENSE)。外部ライブラリ・地球画像の権利と利用条件は各提供元に帰属します。地球画像は[three-globeのサンプル](https://github.com/vasturiano/three-globe)を参照しており、本リポジトリには再配布していません。
