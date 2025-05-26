# Web Simple Apps

スマートフォンの加速度センサーを使ったシンプルなWebアプリケーション集

## アプリ一覧



https://github.com/user-attachments/assets/b9c0ff08-c6f7-43f6-9789-6f00b819b6f2



### card_game.html
3Dメンコゲーム
- 加速度センサーでカードを投げる
- 床に散らばった50枚のカードを飛ばす
- 投げ速度とカードの角度で飛び散る範囲が変化
- 全カード飛ばしでPerfect演出
- 角度センサーによる視差効果

### card.html
加速度センサーで背景色を変更するアプリ(デバッグ用)
- X/Y/Z軸の加速度値に応じて背景色がリアルタイム変化
- 角度センサーとの切り替え機能
- 最大値記録機能
- 
## 使用技術
- HTML5
- CSS3
- JavaScript
- Three.js (3Dグラフィックス)
- Device Motion API (加速度センサー)
- Device Orientation API (角度センサー)

## 対応デバイス
- iOS Safari (許可要求あり)
- Android Chrome
- その他モバイルブラウザ

## 使い方
1. スマートフォンでHTMLファイルを開く
2. センサー許可を与える
3. デバイスを動かしてゲームを楽しむ

## 注意事項
- HTTPSが必要な場合があります
- センサーアクセス許可が必要です
- デスクトップでは動作しません
