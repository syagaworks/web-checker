# 日本百名道2020 踏破記録

日本百名道2020の踏破状態を端末内に保存し、共有URLを作れる非公式Webサイトです。

## 開発

```bash
npm install
npm run dev
```

## ビルド

```bash
npm run build
```

## GitHub Pages

このリポジトリをGitHubへpushしたあと、Repository SettingsのPagesでSourceを「GitHub Actions」にすると、`.github/workflows/deploy.yml` から `dist` が公開されます。

## データ差し替え

`src/data/hyakumeido2020.ts` と `src/types.ts` の `SpotSet` 形式を使うと、別のスポットセットにも流用できます。
