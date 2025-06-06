// 鉋スライダー Stage 1: 加速度センサー可視化
// DeviceMotionEvent を使用してリアルタイムグラフを表示

// 設定オブジェクト
const CONFIG = {
    // グラフ設定
    chart: {
        updateInterval: 16, // 約60fps (16ms)
        displayDuration: 10000, // 表示期間: 10秒
        yAxisRange: {
            min: -20,
            max: 20
        }
    },
    // センサー設定
    sensor: {
        throttleMs: 16, // スロットル間隔
        smoothingFactor: 0.1 // スムージング係数（0.1 = 10%の新データを混合）
    }
};

// グローバル変数
let chart = null;
let isPermissionGranted = false;
let isChartActive = false;
let lastUpdateTime = 0;
let smoothedAcceleration = { x: 0, y: 0, z: 0 };

// DOM要素
const elements = {
    permissionSection: document.getElementById('permissionSection'),
    chartSection: document.getElementById('chartSection'),
    requestPermissionBtn: document.getElementById('requestPermissionBtn'),
    permissionStatus: document.getElementById('permissionStatus'),
    sensorInfo: document.getElementById('sensorInfo'),
    resetBtn: document.getElementById('resetBtn'),
    pauseBtn: document.getElementById('pauseBtn')
};

// 初期化
document.addEventListener('DOMContentLoaded', init);

function init() {
    setupEventListeners();
    checkDeviceMotionSupport();
}

function setupEventListeners() {
    elements.requestPermissionBtn.addEventListener('click', requestPermission);
    elements.resetBtn.addEventListener('click', resetChart);
    elements.pauseBtn.addEventListener('click', toggleChart);
}

// デバイスモーションサポートチェック
function checkDeviceMotionSupport() {
    if (!window.DeviceMotionEvent) {
        showStatus('error', 'このデバイスは加速度センサーをサポートしていません。');
        elements.requestPermissionBtn.disabled = true;
        return;
    }
    
    showStatus('loading', 'デバイスモーションAPIが利用可能です。');
}

// 許可リクエスト
async function requestPermission() {
    elements.requestPermissionBtn.disabled = true;
    showStatus('loading', '許可を要求中...');

    try {
        // iOS 13+ の許可リクエスト
        if (typeof DeviceMotionEvent.requestPermission === 'function') {
            const permission = await DeviceMotionEvent.requestPermission();
            
            if (permission === 'granted') {
                isPermissionGranted = true;
                showStatus('success', '許可されました！センサーを開始しています...');
                startAccelerationMonitoring();
            } else {
                showStatus('error', 'センサーの許可が拒否されました。');
                elements.requestPermissionBtn.disabled = false;
            }
        } else {
            // Android等、自動許可の場合
            isPermissionGranted = true;
            showStatus('success', 'センサーを開始しています...');
            startAccelerationMonitoring();
        }
    } catch (error) {
        console.error('Permission request failed:', error);
        showStatus('error', 'エラーが発生しました: ' + error.message);
        elements.requestPermissionBtn.disabled = false;
    }
}

// 加速度監視開始
function startAccelerationMonitoring() {
    // グラフ初期化
    initChart();
    
    // UI切り替え
    elements.permissionSection.style.display = 'none';
    elements.chartSection.style.display = 'flex';
    
    // センサーイベント登録
    window.addEventListener('devicemotion', handleDeviceMotion);
    
    isChartActive = true;
    elements.pauseBtn.textContent = '⏸️ 一時停止';
    updateSensorInfo('センサー動作中 - 端末を動かしてください');
}

// Chart.js 初期化
function initChart() {
    const ctx = document.getElementById('accelerationChart').getContext('2d');
    
    chart = new Chart(ctx, {
        type: 'line',
        data: {
            datasets: [
                {
                    label: 'X軸 (左右)',
                    borderColor: '#FF4444',
                    backgroundColor: 'rgba(255, 68, 68, 0.1)',
                    data: [],
                    tension: 0.4,
                    pointRadius: 0,
                    borderWidth: 2
                },
                {
                    label: 'Y軸 (前後)',
                    borderColor: '#44FF44',
                    backgroundColor: 'rgba(68, 255, 68, 0.1)',
                    data: [],
                    tension: 0.4,
                    pointRadius: 0,
                    borderWidth: 2
                },
                {
                    label: 'Z軸 (上下)',
                    borderColor: '#4444FF',
                    backgroundColor: 'rgba(68, 68, 255, 0.1)',
                    data: [],
                    tension: 0.4,
                    pointRadius: 0,
                    borderWidth: 2
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                intersect: false,
                mode: 'index'
            },
            plugins: {
                legend: {
                    display: false // 軸説明は別途表示
                }
            },
            scales: {
                x: {
                    type: 'realtime',
                    realtime: {
                        duration: CONFIG.chart.displayDuration,
                        refresh: CONFIG.chart.updateInterval,
                        delay: 0,
                        pause: false,
                        ttl: undefined
                    },
                    title: {
                        display: true,
                        text: '時間'
                    }
                },
                y: {
                    min: CONFIG.chart.yAxisRange.min,
                    max: CONFIG.chart.yAxisRange.max,
                    title: {
                        display: true,
                        text: '加速度 (m/s²)'
                    },
                    grid: {
                        color: 'rgba(0, 0, 0, 0.1)'
                    }
                }
            },
            elements: {
                point: {
                    radius: 0
                }
            }
        }
    });
}

// デバイスモーションイベントハンドラ
function handleDeviceMotion(event) {
    if (!isChartActive) return;
    
    const now = Date.now();
    
    // スロットル制御
    if (now - lastUpdateTime < CONFIG.sensor.throttleMs) {
        return;
    }
    lastUpdateTime = now;
    
    // 加速度データ取得（重力除去を優先）
    const acceleration = event.acceleration || event.accelerationIncludingGravity;
    
    if (!acceleration) {
        updateSensorInfo('センサーデータを取得できません');
        return;
    }
    
    // データスムージング
    smoothedAcceleration.x = smoothAcceleration(smoothedAcceleration.x, acceleration.x || 0);
    smoothedAcceleration.y = smoothAcceleration(smoothedAcceleration.y, acceleration.y || 0);
    smoothedAcceleration.z = smoothAcceleration(smoothedAcceleration.z, acceleration.z || 0);
    
    // チャートにデータ追加
    if (chart) {
        chart.data.datasets[0].data.push({
            x: now,
            y: smoothedAcceleration.x
        });
        chart.data.datasets[1].data.push({
            x: now,
            y: smoothedAcceleration.y
        });
        chart.data.datasets[2].data.push({
            x: now,
            y: smoothedAcceleration.z
        });
        
        chart.update('none'); // アニメーションなしで更新
    }
    
    // センサー情報更新
    updateSensorInfo(`X: ${smoothedAcceleration.x.toFixed(2)} | Y: ${smoothedAcceleration.y.toFixed(2)} | Z: ${smoothedAcceleration.z.toFixed(2)} m/s²`);
}

// 加速度データのスムージング
function smoothAcceleration(currentValue, newValue) {
    return currentValue + (newValue - currentValue) * CONFIG.sensor.smoothingFactor;
}

// チャートリセット
function resetChart() {
    if (chart) {
        chart.data.datasets.forEach(dataset => {
            dataset.data = [];
        });
        chart.update();
    }
    
    // スムージング値もリセット
    smoothedAcceleration = { x: 0, y: 0, z: 0 };
    updateSensorInfo('チャートをリセットしました');
}

// チャート一時停止/再開
function toggleChart() {
    isChartActive = !isChartActive;
    
    if (isChartActive) {
        elements.pauseBtn.textContent = '⏸️ 一時停止';
        updateSensorInfo('センサー動作中 - 端末を動かしてください');
    } else {
        elements.pauseBtn.textContent = '▶️ 再開';
        updateSensorInfo('一時停止中');
    }
}

// ステータス表示
function showStatus(type, message) {
    elements.permissionStatus.textContent = message;
    elements.permissionStatus.className = `status ${type}`;
}

// センサー情報更新
function updateSensorInfo(message) {
    elements.sensorInfo.textContent = message;
}

// エラーハンドリング
window.addEventListener('error', (event) => {
    console.error('JavaScript Error:', event.error);
    showStatus('error', 'エラーが発生しました。ページを再読み込みしてください。');
});

// ページ離脱時のクリーンアップ
window.addEventListener('beforeunload', () => {
    if (chart) {
        chart.destroy();
    }
    window.removeEventListener('devicemotion', handleDeviceMotion);
});