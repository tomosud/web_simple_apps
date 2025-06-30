class GameUI {
    constructor() {
        this.statusIndicator = document.getElementById('statusIndicator');
        this.currentStatus = document.getElementById('currentStatus');
        this.historyScroll = document.getElementById('historyScroll');
        this.overlayMessage = document.getElementById('overlayMessage');
        
        // 履歴管理
        this.history = [];
        this.maxHistoryItems = 20;
        this.historyUpdateInterval = null;
        this.historyUpdateRate = 500; // 0.5秒間隔
        
        // 現在の状態
        this.currentDetectionState = null;
        
        // アニメーション設定
        this.animationSpeed = 50; // ピクセル/秒
        
        this.initialize();
    }

    initialize() {
        // 初期メッセージを設定
        this.updateOverlayMessage('システム準備中...');
        this.updateCurrentStatusDisplay('待機中', 'inactive');
        
        // 履歴エリアの初期化
        this.historyScroll.innerHTML = '<div class="history-placeholder">履歴がここに表示されます</div>';
        
        console.log('GameUI を初期化しました');
    }

    // システム全体のステータス表示を更新
    updateStatus(message, type = 'info') {
        if (!this.statusIndicator) return;
        
        const statusClass = `status-${type}`;
        this.statusIndicator.className = `status-indicator ${statusClass}`;
        this.statusIndicator.innerHTML = `<span>${message}</span>`;
        
        console.log(`ステータス更新: ${message} (${type})`);
    }

    // オーバーレイメッセージを更新
    updateOverlayMessage(message, show = true) {
        if (!this.overlayMessage) return;
        
        this.overlayMessage.textContent = message;
        this.overlayMessage.style.display = show ? 'block' : 'none';
    }

    // 現在の検出状態を更新
    updateCurrentStatus(detectionState) {
        this.currentDetectionState = detectionState;
        
        if (!detectionState.faceDetected) {
            this.updateCurrentStatusDisplay('顔を認識できていません', 'no-face');
            this.updateOverlayMessage('顔を認識できていません', true);
        } else {
            const leftOpen = detectionState.leftEyeOpen;
            const rightOpen = detectionState.rightEyeOpen;
            
            let status, statusType;
            
            if (leftOpen && rightOpen) {
                status = '目を開いています';
                statusType = 'eyes-open';
            } else if (!leftOpen && !rightOpen) {
                status = '目を閉じています';
                statusType = 'eyes-closed';
            } else {
                status = '片目を閉じています';
                statusType = 'eyes-partial';
            }
            
            this.updateCurrentStatusDisplay(status, statusType);
            this.updateOverlayMessage('', false);
            
            // デバッグ情報を表示（開発時）
            if (window.location.search.includes('debug=true')) {
                const debugInfo = `左EAR: ${detectionState.leftEAR.toFixed(3)}, 右EAR: ${detectionState.rightEAR.toFixed(3)}`;
                this.updateOverlayMessage(debugInfo, true);
            }
        }
    }

    // 現在の状態表示を更新
    updateCurrentStatusDisplay(statusText, statusType) {
        if (!this.currentStatus) return;
        
        const statusElement = this.currentStatus.querySelector('.status-text');
        if (statusElement) {
            statusElement.textContent = statusText;
            statusElement.className = `status-text ${statusType}`;
        }
    }

    // 履歴更新を開始
    startHistoryUpdates() {
        if (this.historyUpdateInterval) {
            this.stopHistoryUpdates();
        }
        
        this.historyUpdateInterval = setInterval(() => {
            this.addHistoryItem();
        }, this.historyUpdateRate);
        
        console.log('履歴更新を開始しました');
    }

    // 履歴更新を停止
    stopHistoryUpdates() {
        if (this.historyUpdateInterval) {
            clearInterval(this.historyUpdateInterval);
            this.historyUpdateInterval = null;
        }
        
        console.log('履歴更新を停止しました');
    }

    // 手動で履歴アイテムを追加（まばたき検出など）
    addHistory(message) {
        const timestamp = new Date();
        const timeString = timestamp.toLocaleTimeString('ja-JP', {
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
        
        const historyItem = {
            id: Date.now(),
            timestamp: timeString,
            status: message,
            className: 'history-blink',
            detectionState: null
        };
        
        // 履歴に追加
        this.history.unshift(historyItem);
        
        // 最大数を超えた場合は古いものを削除
        if (this.history.length > this.maxHistoryItems) {
            this.history = this.history.slice(0, this.maxHistoryItems);
        }
        
        // 履歴表示を更新
        this.updateHistoryDisplay();
    }

    // 履歴アイテムを追加
    addHistoryItem() {
        if (!this.currentDetectionState) return;
        
        const timestamp = new Date();
        const timeString = timestamp.toLocaleTimeString('ja-JP', {
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
        
        let statusText, statusClass;
        
        if (!this.currentDetectionState.faceDetected) {
            statusText = '顔認識なし';
            statusClass = 'history-no-face';
        } else {
            const leftOpen = this.currentDetectionState.leftEyeOpen;
            const rightOpen = this.currentDetectionState.rightEyeOpen;
            
            if (leftOpen && rightOpen) {
                statusText = '目を開いている';
                statusClass = 'history-eyes-open';
            } else if (!leftOpen && !rightOpen) {
                statusText = '目を閉じている';
                statusClass = 'history-eyes-closed';
            } else {
                statusText = '片目を閉じている';
                statusClass = 'history-eyes-partial';
            }
        }
        
        const historyItem = {
            id: Date.now(),
            timestamp: timeString,
            status: statusText,
            className: statusClass,
            detectionState: { ...this.currentDetectionState }
        };
        
        // 履歴に追加
        this.history.unshift(historyItem);
        
        // 最大数を超えた場合は古いものを削除
        if (this.history.length > this.maxHistoryItems) {
            this.history = this.history.slice(0, this.maxHistoryItems);
        }
        
        // 履歴表示を更新
        this.updateHistoryDisplay();
    }

    // 履歴表示を更新
    updateHistoryDisplay() {
        if (!this.historyScroll) return;
        
        if (this.history.length === 0) {
            this.historyScroll.innerHTML = '<div class="history-placeholder">履歴がここに表示されます</div>';
            return;
        }
        
        // 履歴アイテムのHTMLを生成
        const historyHTML = this.history.map(item => {
            return `
                <div class="history-item ${item.className}" data-id="${item.id}">
                    <span class="history-time">${item.timestamp}</span>
                    <span class="history-status">${item.status}</span>
                </div>
            `;
        }).join('');
        
        this.historyScroll.innerHTML = historyHTML;
        
        // 新しいアイテムのアニメーション
        this.animateNewHistoryItem();
    }

    // 新しい履歴アイテムのアニメーション
    animateNewHistoryItem() {
        const newItem = this.historyScroll.querySelector('.history-item:first-child');
        if (newItem) {
            newItem.style.opacity = '0';
            newItem.style.transform = 'translateY(-20px)';
            
            // アニメーション実行
            requestAnimationFrame(() => {
                newItem.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
                newItem.style.opacity = '1';
                newItem.style.transform = 'translateY(0)';
            });
        }
    }

    // 履歴をクリア
    clearHistory() {
        this.history = [];
        this.updateHistoryDisplay();
        console.log('履歴をクリアしました');
    }

    // 履歴をエクスポート
    exportHistory() {
        if (this.history.length === 0) {
            alert('エクスポートする履歴がありません');
            return;
        }
        
        const csvContent = this.generateHistoryCSV();
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        
        const now = new Date();
        const filename = `eye_detection_history_${now.getFullYear()}${(now.getMonth()+1).toString().padStart(2,'0')}${now.getDate().toString().padStart(2,'0')}_${now.getHours().toString().padStart(2,'0')}${now.getMinutes().toString().padStart(2,'0')}.csv`;
        
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        link.click();
        
        console.log('履歴をエクスポートしました:', filename);
    }

    // 履歴のCSVを生成
    generateHistoryCSV() {
        const headers = ['時刻', 'ステータス', '顔検出', '左目EAR', '右目EAR', '左目状態', '右目状態'];
        const csvRows = [headers.join(',')];
        
        this.history.forEach(item => {
            const state = item.detectionState;
            const row = [
                `"${item.timestamp}"`,
                `"${item.status}"`,
                state.faceDetected ? '検出' : '未検出',
                state.leftEAR.toFixed(4),
                state.rightEAR.toFixed(4),
                state.leftEyeOpen ? '開' : '閉',
                state.rightEyeOpen ? '開' : '閉'
            ];
            csvRows.push(row.join(','));
        });
        
        return csvRows.join('\n');
    }

    // 統計情報を取得
    getStatistics() {
        if (this.history.length === 0) {
            return null;
        }
        
        const stats = {
            totalRecords: this.history.length,
            faceDetectionRate: 0,
            eyesOpenRate: 0,
            eyesClosedRate: 0,
            partialCloseRate: 0,
            avgLeftEAR: 0,
            avgRightEAR: 0
        };
        
        let faceDetectedCount = 0;
        let eyesOpenCount = 0;
        let eyesClosedCount = 0;
        let partialCloseCount = 0;
        let totalLeftEAR = 0;
        let totalRightEAR = 0;
        
        this.history.forEach(item => {
            const state = item.detectionState;
            
            if (state.faceDetected) {
                faceDetectedCount++;
                totalLeftEAR += state.leftEAR;
                totalRightEAR += state.rightEAR;
                
                if (state.leftEyeOpen && state.rightEyeOpen) {
                    eyesOpenCount++;
                } else if (!state.leftEyeOpen && !state.rightEyeOpen) {
                    eyesClosedCount++;
                } else {
                    partialCloseCount++;
                }
            }
        });
        
        stats.faceDetectionRate = (faceDetectedCount / this.history.length * 100).toFixed(1);
        
        if (faceDetectedCount > 0) {
            stats.eyesOpenRate = (eyesOpenCount / faceDetectedCount * 100).toFixed(1);
            stats.eyesClosedRate = (eyesClosedCount / faceDetectedCount * 100).toFixed(1);
            stats.partialCloseRate = (partialCloseCount / faceDetectedCount * 100).toFixed(1);
            stats.avgLeftEAR = (totalLeftEAR / faceDetectedCount).toFixed(4);
            stats.avgRightEAR = (totalRightEAR / faceDetectedCount).toFixed(4);
        }
        
        return stats;
    }

    // 統計情報を表示
    showStatistics() {
        const stats = this.getStatistics();
        
        if (!stats) {
            alert('統計を表示するのに十分なデータがありません');
            return;
        }
        
        const message = `
検出統計情報:
・総レコード数: ${stats.totalRecords}
・顔検出率: ${stats.faceDetectionRate}%
・両目開放率: ${stats.eyesOpenRate}%
・両目閉鎖率: ${stats.eyesClosedRate}%
・片目閉鎖率: ${stats.partialCloseRate}%
・平均左EAR: ${stats.avgLeftEAR}
・平均右EAR: ${stats.avgRightEAR}
        `.trim();
        
        alert(message);
    }

    // 現在の状態を取得
    getCurrentState() {
        return this.currentDetectionState;
    }

    // 履歴を取得
    getHistory() {
        return [...this.history];
    }
}