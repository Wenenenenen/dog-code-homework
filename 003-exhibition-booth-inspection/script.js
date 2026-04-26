
const STATUS = {
  NOT_INSPECTED: '未巡检',
  NORMAL: '正常',
  HAS_ISSUE: '有问题',
  REVIEWED: '已复查'
};

const INITIAL_BOOTHS = [
  { id: 1, number: 'A01', company: '科技未来有限公司', status: STATUS.NOT_INSPECTED, inspection: null },
  { id: 2, number: 'A02', company: '创新科技集团', status: STATUS.NOT_INSPECTED, inspection: null },
  { id: 3, number: 'A03', company: '数字解决方案公司', status: STATUS.NOT_INSPECTED, inspection: null },
  { id: 4, number: 'B01', company: '智能系统有限公司', status: STATUS.NOT_INSPECTED, inspection: null },
  { id: 5, number: 'B02', company: '云端技术服务', status: STATUS.NOT_INSPECTED, inspection: null },
  { id: 6, number: 'B03', company: '数据分析中心', status: STATUS.NOT_INSPECTED, inspection: null },
  { id: 7, number: 'C01', company: '网络安全公司', status: STATUS.NOT_INSPECTED, inspection: null },
  { id: 8, number: 'C02', company: '人工智能研究院', status: STATUS.NOT_INSPECTED, inspection: null },
  { id: 9, number: 'C03', company: '物联网科技', status: STATUS.NOT_INSPECTED, inspection: null },
  { id: 10, number: 'D01', company: '虚拟现实工作室', status: STATUS.NOT_INSPECTED, inspection: null }
];

let booths = JSON.parse(localStorage.getItem('exhibitionBooths')) || [...INITIAL_BOOTHS];
let selectedBoothId = null;
let currentInspectionData = null;
let originalInspectionData = null;

function saveData() {
  localStorage.setItem('exhibitionBooths', JSON.stringify(booths));
}

function getStatistics() {
  const total = booths.length;
  const inspected = booths.filter(b => b.status !== STATUS.NOT_INSPECTED).length;
  const hasIssue = booths.filter(b => b.status === STATUS.HAS_ISSUE).length;
  const normal = booths.filter(b => b.status === STATUS.NORMAL || b.status === STATUS.REVIEWED).length;
  
  return { total, inspected, hasIssue, normal };
}

function selectBooth(boothId) {
  selectedBoothId = boothId;
  renderBoothList();
  renderInspectionForm();
}

function renderStatistics() {
  const stats = getStatistics();
  document.getElementById('total-booths').textContent = stats.total;
  document.getElementById('inspected-booths').textContent = stats.inspected;
  document.getElementById('has-issue-booths').textContent = stats.hasIssue;
  document.getElementById('normal-booths').textContent = stats.normal;
}

function renderBoothList() {
  const listContainer = document.getElementById('booth-list');
  listContainer.innerHTML = '';
  
  booths.forEach(booth => {
    const boothItem = document.createElement('div');
    const statusClass = getStatusClass(booth.status);
    const selectedClass = selectedBoothId === booth.id ? 'selected' : '';
    
    boothItem.className = `booth-item ${statusClass} ${selectedClass}`;
    boothItem.onclick = () => selectBooth(booth.id);
    
    boothItem.innerHTML = `
      <div class="booth-number">${booth.number}</div>
      <div class="booth-company">${booth.company}</div>
      <div class="booth-status">${booth.status}</div>
    `;
    
    listContainer.appendChild(boothItem);
  });
}

function getStatusClass(status) {
  switch (status) {
    case STATUS.NOT_INSPECTED:
      return 'status-not-inspected';
    case STATUS.NORMAL:
      return 'status-normal';
    case STATUS.HAS_ISSUE:
      return 'status-has-issue';
    case STATUS.REVIEWED:
      return 'status-reviewed';
    default:
      return '';
  }
}

function renderInspectionForm() {
  const formContainer = document.getElementById('inspection-form-container');
  
  if (!selectedBoothId) {
    formContainer.innerHTML = '<div class="empty-state">请从左侧列表选择一个摊位</div>';
    return;
  }
  
  const booth = booths.find(b => b.id === selectedBoothId);
  
  currentInspectionData = booth.inspection ? 
    JSON.parse(JSON.stringify(booth.inspection)) : 
    {
      lighting: { status: 'normal', remark: '' },
      exhibits: { status: 'normal', remark: '' },
      personnel: { status: 'normal', remark: '' },
      materials: { status: 'normal', remark: '' },
      hygiene: { status: 'normal', remark: '' }
    };
  
  originalInspectionData = JSON.parse(JSON.stringify(currentInspectionData));
  
  const currentStatus = booth.status;
  const isReInspection = currentStatus !== STATUS.NOT_INSPECTED;
  const isIssueStatus = currentStatus === STATUS.HAS_ISSUE;
  
  let statusInfoHtml = '';
  let submitBtnText = '提交巡检';
  
  if (isReInspection) {
    if (isIssueStatus) {
      statusInfoHtml = '<div class="status-info status-info-issue">当前状态：有问题，请复查后提交</div>';
      submitBtnText = '提交复查';
    } else if (currentStatus === STATUS.REVIEWED) {
      statusInfoHtml = '<div class="status-info status-info-reviewed">当前状态：已复查</div>';
    } else {
      statusInfoHtml = '<div class="status-info status-info-normal">当前状态：正常</div>';
    }
  }
  
  formContainer.innerHTML = `
    <div class="form-header">
      <h2>摊位 ${booth.number} - 巡检记录</h2>
      <div class="form-company">${booth.company}</div>
      ${statusInfoHtml}
    </div>
    
    <form id="inspection-form">
      <div class="check-items-container">
        ${renderCheckItem('lighting', '灯光', currentInspectionData.lighting)}
        ${renderCheckItem('exhibits', '展品', currentInspectionData.exhibits)}
        ${renderCheckItem('personnel', '人员', currentInspectionData.personnel)}
        ${renderCheckItem('materials', '物料', currentInspectionData.materials)}
        ${renderCheckItem('hygiene', '卫生', currentInspectionData.hygiene)}
      </div>
      
      <div class="form-actions">
        <button type="submit" class="submit-btn">${submitBtnText}</button>
      </div>
    </form>
  `;
  
  setupFormEventListeners();
}

function renderCheckItem(itemKey, label, data) {
  const isAbnormal = data.status === 'abnormal';
  const normalBtnClass = data.status === 'normal' ? 'selected-normal' : '';
  const abnormalBtnClass = data.status === 'abnormal' ? 'selected-abnormal' : '';
  const remarkDisplay = isAbnormal ? 'block' : 'none';
  
  return `
    <div class="check-item" data-item="${itemKey}">
      <div class="check-item-header">
        <label>${label}</label>
        <div class="status-options">
          <button type="button" class="status-btn ${normalBtnClass}" data-item="${itemKey}" data-status="normal">正常</button>
          <button type="button" class="status-btn ${abnormalBtnClass}" data-item="${itemKey}" data-status="abnormal">异常</button>
        </div>
      </div>
      <div class="remark-container" id="${itemKey}-remark-container" style="display: ${remarkDisplay}">
        <label>问题描述：</label>
        <input type="text" id="${itemKey}-remark" class="remark-input" value="${data.remark}" placeholder="请填写具体问题...">
      </div>
    </div>
  `;
}

function setupFormEventListeners() {
  const statusBtns = document.querySelectorAll('.status-btn');
  
  statusBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const itemKey = e.target.dataset.item;
      const status = e.target.dataset.status;
      
      updateStatusSelection(itemKey, status);
    });
  });
  
  const remarkInputs = document.querySelectorAll('.remark-input');
  remarkInputs.forEach(input => {
    input.addEventListener('input', (e) => {
      const itemKey = e.target.id.replace('-remark', '');
      if (currentInspectionData && currentInspectionData[itemKey]) {
        currentInspectionData[itemKey].remark = e.target.value;
      }
    });
  });
  
  const form = document.getElementById('inspection-form');
  if (form) {
    form.addEventListener('submit', handleSubmit);
  }
}

function updateStatusSelection(itemKey, status) {
  if (!currentInspectionData) return;
  
  currentInspectionData[itemKey].status = status;
  
  const checkItem = document.querySelector(`.check-item[data-item="${itemKey}"]`);
  if (!checkItem) return;
  
  const buttons = checkItem.querySelectorAll('.status-btn');
  buttons.forEach(btn => {
    btn.classList.remove('selected-normal', 'selected-abnormal');
    if (btn.dataset.status === status) {
      btn.classList.add(status === 'normal' ? 'selected-normal' : 'selected-abnormal');
    }
  });
  
  const remarkContainer = document.getElementById(`${itemKey}-remark-container`);
  if (remarkContainer) {
    remarkContainer.style.display = status === 'abnormal' ? 'block' : 'none';
  }
}

function isInspectionDataChanged() {
  if (!originalInspectionData || !currentInspectionData) {
    return true;
  }
  
  const keys = ['lighting', 'exhibits', 'personnel', 'materials', 'hygiene'];
  
  for (const key of keys) {
    const original = originalInspectionData[key];
    const current = currentInspectionData[key];
    
    if (original.status !== current.status) {
      return true;
    }
    if (original.remark !== current.remark) {
      return true;
    }
  }
  
  return false;
}

function calculateNewStatus(currentStatus, hasAnyIssue) {
  switch (currentStatus) {
    case STATUS.NOT_INSPECTED:
      return hasAnyIssue ? STATUS.HAS_ISSUE : STATUS.NORMAL;
      
    case STATUS.NORMAL:
      return hasAnyIssue ? STATUS.HAS_ISSUE : STATUS.NORMAL;
      
    case STATUS.HAS_ISSUE:
      if (hasAnyIssue) {
        return STATUS.HAS_ISSUE;
      } else {
        return STATUS.REVIEWED;
      }
      
    case STATUS.REVIEWED:
      return hasAnyIssue ? STATUS.HAS_ISSUE : STATUS.REVIEWED;
      
    default:
      return hasAnyIssue ? STATUS.HAS_ISSUE : STATUS.NORMAL;
  }
}

function handleSubmit(e) {
  e.preventDefault();
  
  if (!selectedBoothId || !currentInspectionData) return;
  
  const booth = booths.find(b => b.id === selectedBoothId);
  const currentStatus = booth.status;
  
  const isChanged = isInspectionDataChanged();
  
  if (currentStatus === STATUS.NOT_INSPECTED) {
    // 对于未巡检的摊位，即使用户没有修改任何内容，直接提交也视为有效巡检
    // 因为初始状态就是"正常"，用户确认提交表示认可当前状态
  } else {
    // 对于已巡检的摊位，没有改动则不保存
    if (!isChanged) {
      showNotification('未检测到改动，无需保存', 'warning');
      return;
    }
  }
  
  let hasAnyIssue = false;
  Object.keys(currentInspectionData).forEach(key => {
    if (currentInspectionData[key].status === 'abnormal') {
      hasAnyIssue = true;
    }
  });
  
  const newStatus = calculateNewStatus(currentStatus, hasAnyIssue);
  
  booth.inspection = JSON.parse(JSON.stringify(currentInspectionData));
  booth.status = newStatus;
  
  saveData();
  renderStatistics();
  renderBoothList();
  renderInspectionForm();
  
  let message = '';
  if (currentStatus === STATUS.NOT_INSPECTED) {
    message = hasAnyIssue ? '巡检记录已保存，存在问题' : '巡检记录已保存，一切正常';
  } else if (currentStatus === STATUS.HAS_ISSUE && !hasAnyIssue) {
    message = '复查通过，状态已更新为已复查';
  } else {
    message = hasAnyIssue ? '记录已更新，仍存在问题' : '记录已更新，状态正常';
  }
  
  showNotification(message, 'success');
}

function showNotification(message, type = 'success') {
  const existingNotification = document.querySelector('.notification');
  if (existingNotification) {
    existingNotification.remove();
  }
  
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.textContent = message;
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.remove();
  }, 3000);
}

function init() {
  renderStatistics();
  renderBoothList();
  renderInspectionForm();
}

document.addEventListener('DOMContentLoaded', init);
