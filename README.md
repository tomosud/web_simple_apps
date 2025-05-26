# iPhone 加速度センサー背景色アプリ

iPhoneの加速度センサーを使用して、リアルタイムで背景色を変更するWebアプリケーションです。

## 機能

- 📱 iPhone/iPadでの加速度センサーアクセス許可要求
- 🎨 センサー値に基づいたリアルタイム背景色変更
- 📊 加速度データの表示（X, Y, Z軸）
- 🌈 RGB値の可視化

## 使用方法

1. iPhoneまたはiPadのSafariブラウザで `card.html` を開く
2. 「センサー許可を求める」ボタンをタップ
3. 許可ダイアログで「許可」を選択
4. デバイスを動かして背景色の変化を確認

## 技術詳細

### 加速度センサーの値から色への変換

- **X軸** → 赤色成分 (Red)
- **Y軸** → 緑色成分 (Green)  
- **Z軸** → 青色成分 (Blue)

各軸の値は -10 から +10 の範囲で正規化され、0-255のRGB値にマッピングされます。

### 対応ブラウザ

- ✅ Safari (iOS 13+)
- ✅ Chrome (Android)
- ✅ Firefox (Android)

**注意**: iOSでは明示的な許可が必要です。デスクトップブラウザでは加速度センサーは利用できません。

## ファイル構成

```
├── card.html          # メインアプリケーション
├── README.md          # このファイル
├── LICENSE            # ライセンス情報
└── .gitattributes     # Git設定
```

## 開発情報

### HTML5 DeviceMotion API

このアプリは HTML5 の `DeviceMotionEvent` API を使用しています：

```javascript
// iOS 13+ での許可要求
DeviceMotionEvent.requestPermission()
  .then(permissionState => {
    if (permissionState === 'granted') {
      window.addEventListener('devicemotion', handleMotion);
    }
  });
```

### 色変換アルゴリズム

```javascript
const normalize = (value, min = -10, max = 10) => {
  const normalized = ((value - min) / (max - min)) * 255;
  return Math.max(0, Math.min(255, Math.round(normalized)));
};
```

## トラブルシューティング

### センサーが動作しない場合

1. **HTTPS接続を確認**: 加速度センサーはHTTPS環境でのみ動作します
2. **ブラウザの確認**: Safari（iOS）またはChrome/Firefox（Android）を使用
3. **許可の確認**: ブラウザの設定でモーションセンサーが許可されているか確認

### 背景色が変化しない場合

1. デバイスを物理的に動かしてください
2. ブラウザのタブがアクティブであることを確認
3. デバイスの向きを変えてみてください

## ライセンス

このプロジェクトはMITライセンスの下で公開されています。詳細は [LICENSE](LICENSE) ファイルを参照してください。

## 貢献

バグレポートや機能改善の提案は歓迎します。

---

**開発者向けメモ**: このアプリは教育目的で作成されており、実際のプロダクション環境での使用前には適切なエラーハンドリングとパフォーマンス最適化を行ってください。