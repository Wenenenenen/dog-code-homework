// 状态管理
const RecordingState = {
    IDLE: 'idle',
    RECORDING: 'recording',
    PAUSED: 'paused',
    STOPPED: 'stopped'
};

let currentState = RecordingState.IDLE;
let mediaStream = null;
let mediaRecorder = null;
let audioContext = null;
let analyser = null;
let dataArray = null;
let animationId = null;
let recordedChunks = [];
let recordings = [];
let recordingStartTime = null;
let pausedTime = 0;
let totalPausedDuration = 0;
let recordingCounter = 0;

// DOM 元素
const canvas = document.getElementById('visualizer');
const ctx = canvas.getContext('2d');
const btnRecord = document.getElementById('btn-record');
const btnPause = document.getElementById('btn-pause');
const btnStop = document.getElementById('btn-stop');
const statusElement = document.getElementById('status');
const recordingsContainer = document.getElementById('recordings-container');
const recordingsList = document.getElementById('recordings-list');

// 格式化时间
function formatDuration(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// 设置 Canvas 尺寸
function setupCanvas() {
    const container = canvas.parentElement;
    const rect = container.getBoundingClientRect();
    canvas.width = rect.width - 40;
    canvas.height = 300;
}

// 绘制初始状态
function drawInitialState() {
    ctx.fillStyle = '#0f0f23';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.strokeStyle = '#2a2a4a';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2, 0);
    ctx.lineTo(canvas.width / 2, canvas.height);
    ctx.stroke();
    
    ctx.fillStyle = '#4a4a6a';
    ctx.font = '16px "Segoe UI"';
    ctx.textAlign = 'center';
    ctx.fillText('点击「开始录音」开始', canvas.width / 2, canvas.height / 2);
}

// 更新 UI 状态
function updateUIState() {
    switch (currentState) {
        case RecordingState.IDLE:
            btnRecord.disabled = false;
            btnPause.disabled = true;
            btnStop.disabled = true;
            statusElement.textContent = '准备就绪';
            break;
            
        case RecordingState.RECORDING:
            btnRecord.disabled = true;
            btnPause.disabled = false;
            btnStop.disabled = false;
            statusElement.innerHTML = '<span class="recording-indicator"></span>正在录音...';
            break;
            
        case RecordingState.PAUSED:
            btnRecord.disabled = false;
            btnPause.disabled = true;
            btnStop.disabled = false;
            btnRecord.textContent = '继续录音';
            statusElement.innerHTML = '<span class="paused-indicator"></span>录音已暂停';
            break;
            
        case RecordingState.STOPPED:
            btnRecord.disabled = false;
            btnPause.disabled = true;
            btnStop.disabled = true;
            btnRecord.textContent = '开始录音';
            statusElement.textContent = recordings.length > 0 ? `已录制 ${recordings.length} 条录音` : '准备就绪';
            break;
    }
}

// 初始化音频上下文
async function initAudioContext() {
    try {
        mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 2048;
        
        const source = audioContext.createMediaStreamSource(mediaStream);
        source.connect(analyser);
        
        dataArray = new Uint8Array(analyser.frequencyBinCount);
        
        return true;
    } catch (error) {
        console.error('无法访问麦克风:', error);
        statusElement.textContent = '无法访问麦克风，请检查权限设置';
        return false;
    }
}

// 开始录音
async function startRecording() {
    if (!mediaStream) {
        const success = await initAudioContext();
        if (!success) return;
    }

    if (audioContext.state === 'suspended') {
        await audioContext.resume();
    }

    if (currentState === RecordingState.PAUSED) {
        totalPausedDuration += (Date.now() - pausedTime);
        mediaRecorder.resume();
    } else {
        recordedChunks = [];
        recordingStartTime = Date.now();
        totalPausedDuration = 0;
        recordingCounter++;
        
        const options = { mimeType: 'audio/webm' };
        try {
            mediaRecorder = new MediaRecorder(mediaStream, options);
        } catch (e) {
            mediaRecorder = new MediaRecorder(mediaStream);
        }

        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                recordedChunks.push(event.data);
            }
        };

        mediaRecorder.onstop = () => {
            const blob = new Blob(recordedChunks, { type: 'audio/webm' });
            const duration = (Date.now() - recordingStartTime - totalPausedDuration) / 1000;
            
            const recording = {
                id: Date.now(),
                name: `录音 ${recordingCounter}`,
                blob: blob,
                duration: duration,
                url: URL.createObjectURL(blob)
            };
            
            recordings.push(recording);
            renderRecordings();
            updateUIState();
        };

        mediaRecorder.start();
    }

    currentState = RecordingState.RECORDING;
    updateUIState();
    startVisualization();
}

// 暂停录音
function pauseRecording() {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.pause();
        pausedTime = Date.now();
        currentState = RecordingState.PAUSED;
        updateUIState();
        stopVisualization();
    }
}

// 停止录音
function stopRecording() {
    if (currentState === RecordingState.PAUSED) {
        totalPausedDuration += (Date.now() - pausedTime);
    }
    
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
    }
    
    if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
        mediaStream = null;
    }
    
    currentState = RecordingState.STOPPED;
    stopVisualization();
}

// 播放录音
function playRecording(recordingId) {
    const audioElement = document.getElementById(`audio-${recordingId}`);
    if (audioElement) {
        audioElement.play();
    }
}

// 删除录音
function deleteRecording(recordingId) {
    const index = recordings.findIndex(r => r.id === recordingId);
    if (index !== -1) {
        const recording = recordings[index];
        URL.revokeObjectURL(recording.url);
        recordings.splice(index, 1);
        renderRecordings();
        updateUIState();
    }
}

// 渲染录音列表
function renderRecordings() {
    if (recordings.length === 0) {
        recordingsContainer.classList.remove('visible');
        recordingsList.innerHTML = '<div class="empty-recordings">暂无录音</div>';
        return;
    }

    recordingsContainer.classList.add('visible');
    recordingsList.innerHTML = '';

    recordings.forEach((recording, index) => {
        const item = document.createElement('div');
        item.className = 'recording-item';
        item.innerHTML = `
            <div class="recording-info">
                <div class="recording-name">${recording.name}</div>
                <div class="recording-duration">时长: ${formatDuration(recording.duration)}</div>
            </div>
            <div class="recording-controls">
                <audio id="audio-${recording.id}" controls src="${recording.url}"></audio>
                <div class="recording-actions">
                    <button class="btn btn-play-small btn-play" onclick="playRecording(${recording.id})">播放</button>
                    <button class="btn btn-delete" onclick="deleteRecording(${recording.id})">删除</button>
                </div>
            </div>
        `;
        recordingsList.appendChild(item);
    });
}

// 开始可视化
function startVisualization() {
    if (animationId) {
        cancelAnimationFrame(animationId);
    }
    visualize();
}

// 停止可视化
function stopVisualization() {
    if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
    }
    drawInitialState();
}

// 可视化绘制
function visualize() {
    animationId = requestAnimationFrame(visualize);
    
    if (!analyser) {
        drawInitialState();
        return;
    }
    
    analyser.getByteTimeDomainData(dataArray);
    
    ctx.fillStyle = '#0f0f23';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // 计算音量
    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
        const v = (dataArray[i] - 128) / 128;
        sum += v * v;
    }
    const rms = Math.sqrt(sum / dataArray.length);
    const volume = Math.min(1, rms * 3);
    
    // 绘制网格线
    ctx.strokeStyle = `rgba(42, 42, 74, ${0.5 + volume * 0.3})`;
    ctx.lineWidth = 1;
    
    // 水平网格线
    const gridLines = 5;
    for (let i = 0; i <= gridLines; i++) {
        const y = (canvas.height / gridLines) * i;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }
    
    // 绘制波形
    const lineWidth = 3 + volume * 5;
    ctx.lineWidth = lineWidth;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    
    // 创建渐变
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
    const hue = 340 + volume * 40; // 从红色到紫色
    gradient.addColorStop(0, `hsla(${hue}, 80%, 60%, ${0.7 + volume * 0.3})`);
    gradient.addColorStop(0.5, `hsla(${hue + 20}, 80%, 70%, ${0.8 + volume * 0.2})`);
    gradient.addColorStop(1, `hsla(${hue}, 80%, 60%, ${0.7 + volume * 0.3})`);
    
    ctx.strokeStyle = gradient;
    
    ctx.beginPath();
    
    const sliceWidth = canvas.width / dataArray.length;
    let x = 0;
    
    for (let i = 0; i < dataArray.length; i++) {
        const v = dataArray[i] / 128.0;
        const y = v * canvas.height / 2;
        
        if (i === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
        
        x += sliceWidth;
    }
    
    ctx.lineTo(canvas.width, canvas.height / 2);
    ctx.stroke();
    
    // 绘制发光效果
    if (volume > 0.1) {
        ctx.save();
        ctx.globalAlpha = volume * 0.3;
        ctx.shadowBlur = 20 + volume * 30;
        ctx.shadowColor = `hsl(${hue}, 80%, 60%)`;
        ctx.stroke();
        ctx.restore();
    }
}

// 事件监听
btnRecord.addEventListener('click', startRecording);
btnPause.addEventListener('click', pauseRecording);
btnStop.addEventListener('click', stopRecording);

// 窗口大小调整
window.addEventListener('resize', () => {
    setupCanvas();
    if (currentState !== RecordingState.RECORDING) {
        drawInitialState();
    }
});

// 初始化
setupCanvas();
drawInitialState();
renderRecordings();
updateUIState();
