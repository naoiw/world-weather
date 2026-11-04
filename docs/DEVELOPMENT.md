# 開発・検証手順

## 必要環境

- Node.js 22以降、npm
- WebGL対応ブラウザ（Chrome / Edge / Firefox / Safariなど）

## ローカル起動・テスト

```bash
git clone https://github.com/naoiw/world-weather.git
cd world-weather
git switch develop
npm install
npm run dev
npm test
npm run build
npm run build:pages:develop
npm run build:pages:main
```

`npm test` はNode.js 22の型削除機能（`--experimental-strip-types`）と組み込みテストランナーでテストを実行します。`dist/` はGit管理しません。

## コード構成・責務

- `src/lib/cities.ts`：緯度経度・タイムゾーンを持つ都市マスターデータ。
- `src/lib/weather.ts`：Open-Meteoの要求パラメーターと応答検証、天気コード変換。
- `src/hooks/useWeather.ts`：セッションキャッシュ、30分再取得、失敗時の旧データ保持。
- `src/lib/astronomy.ts`：球面座標とUTCベースの太陽直下点。
- `src/components/EarthGlobe.tsx`：WebGL描画・昼夜Shader・視野判定・都市ラベル。
- `src/App.tsx`：都市選択と操作パネル・取得状態の表示。

新しい都市は`cities.ts`に追加してください。天気取得・表示・日時計算は自動的にその都市へ適用されます。ラベルの最大表示数はパフォーマンスと重なりのため限定しています。

## 手動確認

1. PCで地球が見え、左右にドラッグして都市ラベルと引き出し線が追従する。
2. 地球の裏側に回った都市ラベルが非表示になり、別の地域が見えると入れ替わる。
3. 都市ラベルを押すと右の選択都市詳細が変わる。プルダウンも同様。
4. 気温・湿度・天気コードがAPIの実データに基づき、失敗時に未取得と表示される。
5. 連続リロードで毎回APIを呼ばず、20分以内は保存データを利用する。
6. 現地日時が日本と欧米等で異なり、DSTも正しく処理される。
7. UTC時刻と一致した昼夜の境界が回転中も地表上の正しい場所に見える。
8. スマートフォンでスワイプ・ピンチ、各操作ボタン、ラベルのタップが使える。
9. WebGLが使えない場合は説明が表示される。画像URLへの通信に失敗した場合も単色球が残る。
10. `/world-weather/develop/`のJS/CSSが404にならない。

CIは自動テストと型チェック・ビルドを行います。実機でのWebGL描画とタッチ操作は別途目視確認が必要です。

## 運用

作業ブランチ→`develop`へのPR→プレビュー動作確認→`main`へのPR。マージ後も`develop`は保持します。

## 外部データ・画像

- 天気：`https://api.open-meteo.com/v1/forecast`、ブラウザからアクセス。利用条件とレート制限に注意。
- 地球画像：`https://unpkg.com/three-globe@2.45.2/example/img/`。画像取得失敗時は色だけの球が残ります。
- ランタイムに秘密鍵や個人データは必要ありません。
