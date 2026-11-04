# GitHub Pages 公開構成

## 公開先

| 環境 | ブランチ | パス |
| --- | --- | --- |
| 本番 | `main` | https://naoiw.github.io/world-weather/ |
| プレビュー | `develop` | https://naoiw.github.io/world-weather/develop/ |

GitHubの **Settings → Pages → Build and deployment → Source = GitHub Actions** が必要です。

## ワークフロー

- `.github/workflows/validate-develop.yml`: `develop` push／PR時に型チェックとビルド。
- `.github/workflows/deploy-pages.yml`: `main` push、または`develop`のpush CI成功時に、両ブランチをチェックアウトして1つのPagesアーティファクトに合成。
- 本番のビルドはViteの `base=/world-weather/`、開発用ビルドは `base=/world-weather/develop/`。
- `main` は本番用Viteアプリをビルドします。デプロイワークフローには旧準備中ページへのフォールバック処理が残っていますが、通常は使用しません。
- `develop` → `main`でアプリを公開した後は、本番もViteビルドになります。

## 初期セットアップ

1. リポジトリのSettingsでPagesのSourceをGitHub Actionsに設定。
2. Actions画面で `Deploy to GitHub Pages` の実行結果を確認。
3. 公開先 `/develop/` にアクセス。
4. 本番公開前に`develop`から`main`へのPRで検証する。

## トラブルシュート

- ページ全体が404: Pages有効化、Actionsのエラー、公開設定を確認。
- 画像が表示されない: `unpkg.com` への通信状況を確認。地表画像は外部URLです。
- JSやCSSが404: Viteの `base` が公開パスと一致するか確認。
- `/develop/`が古い: `Validate develop` および後続の `Deploy to GitHub Pages` の成功を確認。
- 3D描画が失敗: WebGLの利用可否とブラウザのGPU設定を確認。
