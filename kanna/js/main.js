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
        },
        maxDataPoints: 600 // 10秒 × 60fps
    },
    // センサー設定
    sensor: {
        throttleMs: 16, // スロットル間隔
        smoothingFactor: 0.1 // スムージング係数（0.1 = 10%の新データを混合）
    }
};

// グローバル変数
let canvas = null;
let ctx = null;
let isPermissionGranted = false;
let isChartActive = false;
let lastUpdateTime = 0;
let smoothedAcceleration = { x: 0, y: 0, z: 0 };
let dataPoints = {
    x: [],
    y: [],
    z: [],
    timestamps: []
};

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
    // Canvas初期化
    initCanvas();
    
    // UI切り替え
    elements.permissionSection.style.display = 'none';
    elements.chartSection.style.display = 'flex';
    
    // センサーイベント登録
    window.addEventListener('devicemotion', handleDeviceMotion);
    
    isChartActive = true;
    elements.pauseBtn.textContent = '⏸️ 一時停止';
    updateSensorInfo('センサー動作中 - 端末を動かしてください');
    
    // 描画ループ開始
    startDrawLoop();
}

// Canvas 初期化
function initCanvas() {
    canvas = document.getElementById('accelerationChart');
    ctx = canvas.getContext('2d');
    
    // 高DPI対応
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';
}

// 描画ループ
function startDrawLoop() {
    function draw() {
        if (isChartActive) {
            drawChart();
        }
        requestAnimationFrame(draw);
    }
    draw();
}

// チャート描画
function drawChart() {
    if (!canvas || !ctx) return;
    
    const width = canvas.width / (window.devicePixelRatio || 1);
    const height = canvas.height / (window.devicePixelRatio || 1);
    
    // 背景クリア
    ctx.clearRect(0, 0, width, height);
    
    // 背景
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    
    // グリッド描画
    drawGrid(width, height);
    
    // データが存在する場合のみ描画
    if (dataPoints.x.length > 0) {
        drawDataLine(dataPoints.x, '#FF4444', width, height);
        drawDataLine(dataPoints.y, '#44FF44', width, height);
        drawDataLine(dataPoints.z, '#4444FF', width, height);
    }
    
    // 軸ラベル
    drawAxisLabels(width, height);
}

// グリッド描画
function drawGrid(width, height) {
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
    ctx.lineWidth = 1;
    
    // 水平線
    for (let i = 0; i <= 10; i++) {
        const y = (height / 10) * i;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
    }
    
    // 垂直線
    for (let i = 0; i <= 10; i++) {
        const x = (width / 10) * i;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
    }
}

// データライン描画
function drawDataLine(data, color, width, height) {
    if (data.length < 2) return;
    
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    for (let i = 0; i < data.length; i++) {
        const x = (i / (data.length - 1)) * width;
        const normalizedY = (data[i] - CONFIG.chart.yAxisRange.min) / 
                           (CONFIG.chart.yAxisRange.max - CONFIG.chart.yAxisRange.min);
        const y = height - (normalizedY * height);
        
        if (i === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    }
    
    ctx.stroke();
}

// 軸ラベル描画
function drawAxisLabels(width, height) {
    ctx.fillStyle = '#666666';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'right';
    
    // Y軸ラベル
    for (let i = 0; i <= 4; i++) {
        const value = CONFIG.chart.yAxisRange.max - 
                     (i * (CONFIG.chart.yAxisRange.max - CONFIG.chart.yAxisRange.min) / 4);
        const y = (height / 4) * i + 4;
        ctx.fillText(value.toFixed(0), width - 5, y);
    }
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
    
    // データ追加
    dataPoints.x.push(smoothedAcceleration.x);
    dataPoints.y.push(smoothedAcceleration.y);
    dataPoints.z.push(smoothedAcceleration.z);
    dataPoints.timestamps.push(now);
    
    // 古いデータを削除
    if (dataPoints.x.length > CONFIG.chart.maxDataPoints) {
        dataPoints.x.shift();
        dataPoints.y.shift();
        dataPoints.z.shift();
        dataPoints.timestamps.shift();
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
    dataPoints.x = [];
    dataPoints.y = [];
    dataPoints.z = [];
    dataPoints.timestamps = [];
    
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

// ウィンドウリサイズ時の処理
window.addEventListener('resize', () => {
    if (canvas) {
        initCanvas();
    }
});

// エラーハンドリング
window.addEventListener('error', (event) => {
    console.error('JavaScript Error:', event.error);
    showStatus('error', 'エラーが発生しました。ページを再読み込みしてください。');
});

// ページ離脱時のクリーンアップ
window.addEventListener('beforeunload', () => {
    cleanup();
});

// クリーンアップ関数
function cleanup() {
    window.removeEventListener('devicemotion', handleDeviceMotion);
    isChartActive = false;
}

// ページ可視性変更時の処理
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        // ページが非表示になった時の処理
        if (isChartActive) {
            isChartActive = false;
            if (elements.pauseBtn) {
                elements.pauseBtn.textContent = '▶️ 再開';
            }
            updateSensorInfo('一時停止中（ページ非表示）');
        }
    }
});