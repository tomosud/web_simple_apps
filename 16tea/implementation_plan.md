# 16茶ゲーム 仕様書

## ゲーム概要

「16茶」は、4色の素材茶を積み重ねて、高さちょうど16の完璧なお茶を作る推理パズルゲームです。各色の素材茶には隠された数値があり、プレイヤーはその数値を推測しながら戦略的にお茶を注いでいきます。

## 基本ルール

### 勝利条件
- 積み重ねの高さがちょうど**16**になること

### 敗北条件  
- 積み重ねの高さが**16を超える**こと（バースト）

### ゲームの流れ
1. ゲーム開始時、容器には既にランダムな高さ（1～15）のお茶が入っている
2. プレイヤーは4色のボタンから1つを選んでお茶を注ぐ
3. 注いだお茶の分だけ高さが上昇する
4. 高さが16ちょうどになるまで繰り返す

## 素材茶システム

### 4色の素材茶
- 🟥 **赤茶**
- 🟩 **緑茶** 
- 🟦 **青茶**
- 🟨 **黄茶**

### 隠された数値システム
- 各色には**1～4**のいずれかの数値が割り当てられている
- この数値は**ゲーム開始時に決定**され、ゲーム中は変わらない
- 同じ色をクリックすると、常に**同じ数値**が追加される
- **数値は画面に表示されない**（プレイヤーが推測する必要がある）

### 推理要素
- プレイヤーは注ぐたびに変化する高さから、各色の数値を推測する
- 例：赤茶を注いで高さが3上がったら、赤茶の数値は3
- この推理がゲームの核心となる戦略要素

## 表示システム

### 積み重ねグラフ
- 縦の容器に色層が積み重ねられて表示される
- 各色は**色ごとにまとめて**1つの層として表示される
- 表示順序：下から**赤→緑→青→黄**の順
- 目標ライン（高さ16）が**赤い線**で表示される

### 情報パネル
- **現在の高さ**：現在の積み重ね高さ
- **目標まで**：16まであとどれくらいか
- **手数**：プレイヤーが注いだ回数
- **ハイスコア**：最少手数での成功記録

### メッセージシステム
- お茶を注いだ時：「○茶を注ぎました」（数値は表示しない）
- 現在の高さと残り高さのみ表示
- 危険時（残り4以下）：警告色で表示
- 成功時：祝福メッセージとアニメーション
- 失敗時：バーストメッセージとアニメーション

## スコアシステム

### 手数カウント
- プレイヤーがボタンを押した回数を記録
- 少ない手数でクリアするほど高得点

### ハイスコア機能
- 最少手数での成功記録を保存
- ブラウザのローカルストレージに永続保存
- 新記録達成時には特別なメッセージを表示

## 戦略要素

### 推理の重要性
- 各色の数値を正確に把握することが勝利の鍵
- 初期状態と1回目の注ぎで、ある程度の推測が可能
- 複数回試すことで確実な数値を把握できる

### リスク管理
- 残り高さが少なくなると、選択肢が限られる
- 大きな数値の色を早めに特定し、適切なタイミングで使用する
- バーストを避けながら、最少手数を目指す

### 初期状態の活用
- ゲーム開始時の初期高さから、使われている色の情報を推測
- 初期状態の色分布が戦略のヒントになる

## 視覚的特徴

### アニメーション効果
- お茶を注ぐ際の滑らかな上昇アニメーション
- 成功時の祝福エフェクト
- 失敗時の警告エフェクト

### 色とデザイン
- 各色は鮮やかで区別しやすいグラデーション
- 直感的で分かりやすいインターフェース
- レスポンシブデザインでモバイル対応

## ゲームの魅力

### シンプルながら奥深い
- ルールは簡単だが、推理要素により戦略性が高い
- 毎回異なる初期状態で新鮮な体験

### 短時間で楽しめる
- 1ゲーム数分で完了
- すぐに再挑戦できる気軽さ

### 論理的思考力を鍛える
- 数値推理により論理的思考力が向上
- リスク管理能力の向上

この仕様により、単純な運ゲームではなく、推理と戦略が重要な思考型パズルゲームとなっています。