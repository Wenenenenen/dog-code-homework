import { 
  getState, 
  subscribe, 
  toggleView, 
  toggleDimension, 
  openModal,
  generateConflictReport,
  resetToDefault
} from '../store/appStore.js';
import { exportData, importData } from '../utils/storage.js';
import { renderTableView, bindTableViewEvents } from './TableView.js';
import { renderBoardView, bindBoardViewEvents } from './BoardView.js';
import { renderScheduleModal, bindScheduleModalEvents } from './ScheduleModal.js';
import { renderConflictReport } from './ConflictReport.js';
import { renderNotifications, bindNotificationEvents } from './Notifications.js';

let currentState = null;
let unsubscribe = null;

// 渲染应用
export function renderApp() {
  // 首次渲染或重新渲染时清除旧的订阅
  if (unsubscribe) {
    unsubscribe();
  }
  
  // 获取初始状态
  currentState = getState();
  
  // 订阅状态变化
  unsubscribe = subscribe(newState => {
    currentState = newState;
    updateApp();
  });
  
  // 初始渲染
  updateApp();
}

// 更新应用UI
function updateApp() {
  const appElement = document.getElementById('app');
  if (!appElement) return;
  
  const { currentView, isModalOpen, conflicts } = currentState;
  
  appElement.innerHTML = `
    <div class="app-container">
      ${renderHeader()}
      <main class="main-content">
        ${renderToolbar()}
        ${renderConflictSummary()}
        <div class="view-container">
          ${currentView === 'table' ? renderTableView(currentState) : renderBoardView(currentState)}
        </div>
      </main>
      ${isModalOpen ? renderScheduleModal(currentState) : ''}
      ${renderNotifications(currentState)}
    </div>
  `;
  
  // 绑定事件监听器
  bindEventListeners();
}

// 渲染头部
function renderHeader() {
  return `
    <header class="app-header">
      <div class="header-left">
        <h1 class="app-title">🎪 展会摊位排期与冲突检查系统</h1>
      </div>
      <div class="header-right">
        <button id="reset-btn" class="btn btn-secondary btn-sm">
          🔄 重置数据
        </button>
        <button id="import-btn" class="btn btn-secondary btn-sm">
          📥 导入数据
        </button>
        <button id="export-btn" class="btn btn-secondary btn-sm">
          📤 导出数据
        </button>
        <input type="file" id="import-file" accept=".json" style="display: none;">
      </div>
    </header>
  `;
}

// 渲染工具栏
function renderToolbar() {
  const { currentView, currentDimension } = currentState;
  
  return `
    <div class="toolbar">
      <div class="view-toggle">
        <span class="toggle-label">视图：</span>
        <button 
          id="view-table" 
          class="btn ${currentView === 'table' ? 'btn-primary' : 'btn-secondary'} btn-sm"
        >
          📊 表格
        </button>
        <button 
          id="view-board" 
          class="btn ${currentView === 'board' ? 'btn-primary' : 'btn-secondary'} btn-sm"
        >
          📋 看板
        </button>
      </div>
      
      <div class="dimension-toggle">
        <span class="toggle-label">维度：</span>
        <button 
          id="dimension-area" 
          class="btn ${currentDimension === 'area' ? 'btn-primary' : 'btn-secondary'} btn-sm"
        >
          🏢 按区域
        </button>
        <button 
          id="dimension-timeSlot" 
          class="btn ${currentDimension === 'timeSlot' ? 'btn-primary' : 'btn-secondary'} btn-sm"
        >
          ⏰ 按时间段
        </button>
        <button 
          id="dimension-exhibitor" 
          class="btn ${currentDimension === 'exhibitor' ? 'btn-primary' : 'btn-secondary'} btn-sm"
        >
          👥 按参展商
        </button>
      </div>
      
      <div class="actions">
        <button id="add-schedule-btn" class="btn btn-primary">
          ➕ 新增排期
        </button>
        <button id="generate-report-btn" class="btn btn-warning">
          📋 生成冲突报告
        </button>
      </div>
    </div>
  `;
}

// 渲染冲突摘要
function renderConflictSummary() {
  const { conflicts } = currentState;
  const hasConflicts = conflicts.length > 0;
  
  if (!hasConflicts) {
    return `
      <div class="conflict-summary conflict-free">
        <span class="conflict-icon">✅</span>
        <span class="conflict-text">当前没有检测到冲突，所有排期均有效</span>
      </div>
    `;
  }
  
  const boothConflicts = conflicts.filter(c => c.type === 'booth_time_conflict').length;
  const exhibitorConflicts = conflicts.filter(c => c.type === 'exhibitor_time_conflict').length;
  
  return `
    <div class="conflict-summary conflict-exists">
      <span class="conflict-icon">⚠️</span>
      <span class="conflict-text">
        检测到 <strong>${conflicts.length}</strong> 个冲突：
        ${boothConflicts > 0 ? `<span class="conflict-type">摊位冲突: ${boothConflicts}</span>` : ''}
        ${exhibitorConflicts > 0 ? `<span class="conflict-type">参展商冲突: ${exhibitorConflicts}</span>` : ''}
      </span>
    </div>
  `;
}

// 绑定事件监听器
function bindEventListeners() {
  // 视图切换
  document.getElementById('view-table')?.addEventListener('click', () => toggleView('table'));
  document.getElementById('view-board')?.addEventListener('click', () => toggleView('board'));
  
  // 维度切换
  document.getElementById('dimension-area')?.addEventListener('click', () => toggleDimension('area'));
  document.getElementById('dimension-timeSlot')?.addEventListener('click', () => toggleDimension('timeSlot'));
  document.getElementById('dimension-exhibitor')?.addEventListener('click', () => toggleDimension('exhibitor'));
  
  // 新增排期
  document.getElementById('add-schedule-btn')?.addEventListener('click', () => openModal('create'));
  
  // 生成冲突报告
  document.getElementById('generate-report-btn')?.addEventListener('click', showConflictReport);
  
  // 重置数据
  document.getElementById('reset-btn')?.addEventListener('click', handleReset);
  
  // 导出数据
  document.getElementById('export-btn')?.addEventListener('click', exportData);
  
  // 导入数据
  document.getElementById('import-btn')?.addEventListener('click', () => {
    document.getElementById('import-file')?.click();
  });
  document.getElementById('import-file')?.addEventListener('change', handleImport);
  
  // 绑定表格视图事件
  bindTableViewEvents();
  
  // 绑定看板视图事件
  bindBoardViewEvents();
  
  // 绑定模态框事件
  if (currentState.isModalOpen) {
    bindScheduleModalEvents();
  }
  
  // 绑定通知事件
  bindNotificationEvents();
}

// 显示冲突报告
function showConflictReport() {
  const report = generateConflictReport();
  
  // 创建模态框显示报告
  const modal = document.createElement('div');
  modal.className = 'report-modal-overlay';
  modal.innerHTML = `
    <div class="report-modal">
      ${renderConflictReport(report)}
    </div>
  `;
  document.body.appendChild(modal);
  
  // 绑定关闭事件
  modal.querySelector('.close-report-btn')?.addEventListener('click', () => {
    document.body.removeChild(modal);
  });
  
  // 点击外部关闭
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      document.body.removeChild(modal);
    }
  });
}

// 处理重置
function handleReset() {
  if (confirm('确定要重置所有数据吗？此操作不可撤销。')) {
    resetToDefault();
  }
}

// 处理导入
function handleImport(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  importData(file, (error, data) => {
    if (error) {
      alert('导入失败：' + error.message);
    } else {
      alert('导入成功！页面将刷新以应用新数据。');
      location.reload();
    }
  });
  
  // 重置文件输入
  event.target.value = '';
}
