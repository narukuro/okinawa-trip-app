# ギバー診断（Giver / Taker / Matcher 診断アプリ）

設問に答えると、あなたの「人との関わり方タイプ」が
**ギバー・テイカー・マッチャー** の3タイプで診断できる iPhone / Android アプリです。
（アダム・グラント『GIVE & TAKE』の考え方がモチーフ）

[Expo](https://expo.dev/)（React Native）で作られているので、**Mac がなくても**
自分のスマホですぐに動作確認できます。

## 必要なもの

- [Node.js](https://nodejs.org/)（18 以上）
- スマホに **Expo Go** アプリ（[iOS](https://apps.apple.com/app/expo-go/id982107779) / [Android](https://play.google.com/store/apps/details?id=host.exp.exponent)）

## 動かし方

```bash
# 依存関係をインストール
npm install

# 開発サーバーを起動
npx expo start
```

ターミナルに **QR コード** が表示されます。

- **iPhone**: 標準のカメラアプリで QR を読み取り → Expo Go で開く
- **Android**: Expo Go アプリの中で QR を読み取る

これで実機にアプリが表示されます。コードを保存すると自動でリロードされます。

## 構成

| ファイル | 役割 |
|---|---|
| `App.js` | 画面・診断ロジック・設問データすべて（まずはここを編集） |
| `app.json` | アプリ名・アイコンなどの設定 |
| `assets/` | アイコン・スプラッシュ画像 |

### カスタマイズのヒント

- **設問を足す / 変える** → `App.js` 上部の `QUESTIONS` 配列を編集
- **結果の説明文を変える** → `RESULTS` オブジェクトを編集
- 各選択肢の `type`（`giver` / `taker` / `matcher`）が集計に使われます

## タイプ

- 🤝 **ギバー** … 見返りを求めず、まず与える人
- 🎯 **テイカー** … 自分の利益を優先する人
- ⚖️ **マッチャー** … ギブとテイクの釣り合いを大切にする人
