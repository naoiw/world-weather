# WORLD WEATHER

3D地球儀をドラッグ・スワイプで回転させ、世界24都市の現在の天気・気温・湿度・現地日時を確認できるブラウザダッシュボードです。現実のUTC日時から太陽の向きを計算し、地球の昼夜と夜側の都市光を表現します。

## 主な機能

- Three.jsで描く3D地球儀。初期選択は東京、AUTO ROTATEはオンで起動し、東京を正面に向けた状態から回転する。左右ドラッグ・スワイプ、ホイール・ピンチでのズーム、右側パネル最上部のAUTO ROTATEボタン（拡大縮小・リセットの画面上ボタンはなし）
- 世界24都市の位置に円形マーカーを常設。地球の手前に見えるマーカーだけを表示し、裏側の都市は回転すると現れる
- 引き出し線と天気カードは表示せず、詳細は右側の選択都市パネルに集約
- マーカーをクリック・タップ、またはプルダウンから都市を選択すると、地球儀が最短の方向で滑らかに回転（手動操作で中断可能）
- 選択中の都市マーカーのみオレンジ色になり、プルダウンの選択とも連動
- 都市を選ぶと詳細情報を表示（対象24都市）。初期表示は東京を選択し、東京方面を向いた状態から自動回転を開始
- 表示都市数の上限は設けず、スマートフォンでも地球の表側に見える全都市のマーカーを表示
- Open-Meteoから24都市の天気を1リクエストで取得。20分のセッションキャッシュ、30分ごとの自動更新と手動更新に対応
- 選択都市の詳細欄に体感温度、風速、風向、降水量、雲量、該当時間帯（1時間）の降水確率を追加
- 降水確率は同じForecast APIの時間別予報から抽出。欠損値は `—` で表示し、地球儀上にはマーカー以外の天気情報を表示しない
- 太陽位置と季節をUTCから計算し、昼夜の境界と夜景テクスチャを描画
- タイムゾーンと夏時間に対応した現地日時、取得時刻・更新失敗の表示
- ダーク系のレスポンシブUIとWebGL未対応・画像通信失敗時のフォールバック

気象値はOpen-Meteoのモデルデータであり、実際の観測所の実測値とは限りません。降水確率は現在の時刻に対応する1時間予報で、現在の降水量とは別の指標です。天気APIが利用できない場合は架空の数値で埋めず、エラーと最後に取得した値（あれば）を表示します。

## 公開先

| 環境 | ブランチ | URL |
| --- | --- | --- |
| 本番 | `main` | https://naoiw.github.io/world-weather/ |
| 開発プレビュー | `develop` | https://naoiw.github.io/world-weather/develop/ |

本番とプレビューは1つのGitHub Pagesサイト内の別々のパスで公開します。`main` は本番アプリ、`develop` はプレビューとして配信します。

## 技術スタック

- **TypeScript / React 19** — UIと状態管理
- **Three.js / OrbitControls** — 地球儀のレンダリングと操作、昼夜のShader
- **Open-Meteo Forecast API** — 現在の天気（APIキー不要の非商用利用）
- **CSS / Vite 7** — レスポンシブスタイル、開発・ビルド
- **Node.js 22 / npm** — 開発・組み込みテスト
- **GitHub Actions / GitHub Pages** — テスト・検証・公開

## ローカル開発

```bash
git clone https://github.com/naoiw/world-weather.git
cd world-weather
git switch develop
npm install
npm run dev    # 開発サーバー
npm test       # 地理・太陽位置・APIデータ形式のテスト
npm run build  # 型チェックと本番ビルド
```

`dist/` はGit管理対象外です。Pages用ビルドは `npm run build:pages:develop` / `npm run build:pages:main` で確認できます。

## ブランチ運用

1. 通常の実装・修正は `develop` で行い、`main` は本番用として維持します。
2. Pull Requestではテストとビルドを実行し、デプロイは行いません。
3. `develop` へのpushは検証成功後、`main` 側のワークフローから開発プレビューに反映します。
4. 本番反映は **`develop` → `main` のPull Request** で行います。マージ後も `develop` は維持します。

## ディレクトリ構成

- `src/App.tsx` — 画面・都市選択・取得状態
- `src/components/EarthGlobe.tsx` — 3D球体・昼夜Shader・都市マーカーの描画とクリック操作
- `src/hooks/useWeather.ts` — 取得・キャッシュ・エラー復旧・定期更新
- `src/lib/cities.ts` — 24都市の座標とIANAタイムゾーン（ホノルル、ハガニア、台北、香港など）
- `src/lib/weather.ts` — Open-Meteo取得URL・型チェック・天気コード
- `src/lib/astronomy.ts` — 太陽直下点・地理座標変換・表裏判定
- `src/lib/globeNavigation.ts` — カメラの最短回転・イージング
- `src/lib/globeMarkers.ts` — 24都市の表裏判定・マーカー座標投影
- `src/styles.css` — 専用デザイン・レスポンシブUI
- `tests/` — Node.js組み込みテスト
- `.github/workflows/` — CI・GitHub Pagesデプロイ設定
- `docs/` — 仕様・開発・デプロイ・UI方針

## ドキュメント

- [仕様書](docs/SPEC.md)
- [開発手順](docs/DEVELOPMENT.md)
- [デプロイ構成](docs/DEPLOYMENT.md)
- [UI方針](docs/UI.md)

## ライセンス

自作コードは[MIT License](LICENSE)。天気データ提供：[Open-Meteo](https://open-meteo.com/)（利用条件・クレジット表示は提供元に従う）。地表画像・夜景テクスチャは[three-globeの公開サンプル](https://github.com/vasturiano/three-globe)から参照し、各画像の権利はそれぞれの提供元に帰属します。
