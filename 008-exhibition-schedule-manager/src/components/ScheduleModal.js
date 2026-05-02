import { 
  closeModal, 
  addSchedule, 
  editSchedule,
  getState
} from '../store/appStore.js';

// 渲染排期模态框
export function renderScheduleModal(state) {
  const { modalMode, editingSchedule, booths, exhibitors, timeSlots, areas } = state;
  const isEdit = modalMode === 'edit';
  
  const title = isEdit ? '✏️ 编辑排期' : '➕ 新增排期';
  const boothValue = editingSchedule?.boothId || '';
  const exhibitorValue = editingSchedule?.exhibitorId || '';
  const timeSlotValue = editingSchedule?.timeSlotId || '';
  const notesValue = editingSchedule?.notes || '';
  
  return `
    <div class="modal-overlay" id="schedule-modal">
      <div class="modal-content">
        <div class="modal-header">
          <h3 class="modal-title">${title}</h3>
          <button class="modal-close" id="modal-close-btn">&times;</button>
        </div>
        <form class="modal-form" id="schedule-form">
          <div class="form-row">
            <div class="form-group">
              <label for="booth-select">选择摊位 <span class="required">*</span></label>
              <select id="booth-select" name="boothId" required>
                <option value="">-- 请选择摊位 --</option>
                ${renderBoothOptions(booths, areas, boothValue)}
              </select>
              <small class="form-hint">选择要安排的摊位</small>
            </div>
            
            <div class="form-group">
              <label for="exhibitor-select">选择参展商 <span class="required">*</span></label>
              <select id="exhibitor-select" name="exhibitorId" required>
                <option value="">-- 请选择参展商 --</option>
                ${renderExhibitorOptions(exhibitors, exhibitorValue)}
              </select>
              <small class="form-hint">选择参展的公司</small>
            </div>
          </div>
          
          <div class="form-row">
            <div class="form-group">
              <label for="timeslot-select">选择时间段 <span class="required">*</span></label>
              <select id="timeslot-select" name="timeSlotId" required>
                <option value="">-- 请选择时间段 --</option>
                ${renderTimeSlotOptions(timeSlots, timeSlotValue)}
              </select>
              <small class="form-hint">选择展示的时间段</small>
            </div>
          </div>
          
          <div class="form-group">
            <label for="notes-input">备注</label>
            <textarea 
              id="notes-input" 
              name="notes" 
              rows="3" 
              placeholder="输入备注信息（可选）"
            >${notesValue}</textarea>
            <small class="form-hint">添加额外的说明信息</small>
          </div>
          
          ${isEdit ? `
            <div class="form-info">
              <small>创建时间: ${formatDateTime(editingSchedule?.createdAt)}</small>
              <br>
              <small>最后更新: ${formatDateTime(editingSchedule?.updatedAt)}</small>
            </div>
          ` : ''}
          
          <div class="modal-actions">
            <button type="button" class="btn btn-secondary" id="modal-cancel-btn">取消</button>
            <button type="submit" class="btn btn-primary">
              ${isEdit ? '保存修改' : '创建排期'}
            </button>
          </div>
        </form>
      </div>
    </div>
  `;
}

// 渲染摊位选项（按区域分组）
function renderBoothOptions(booths, areas, selectedValue) {
  // 按区域分组
  const boothsByArea = {};
  areas.forEach(area => {
    boothsByArea[area.id] = {
      area,
      booths: []
    };
  });
  
  booths.forEach(booth => {
    if (boothsByArea[booth.areaId]) {
      boothsByArea[booth.areaId].booths.push(booth);
    }
  });
  
  let html = '';
  
  for (const [areaId, data] of Object.entries(boothsByArea)) {
    const { area, booths: areaBooths } = data;
    
    if (areaBooths.length === 0) continue;
    
    html += `<optgroup label="${area.name}">`;
    
    areaBooths.forEach(booth => {
      const selected = booth.id === selectedValue ? 'selected' : '';
      html += `<option value="${booth.id}" ${selected}>
        ${booth.number} (${booth.size}) - ${booth.description}
      </option>`;
    });
    
    html += `</optgroup>`;
  }
  
  return html;
}

// 渲染参展商选项
function renderExhibitorOptions(exhibitors, selectedValue) {
  return exhibitors.map(exhibitor => {
    const selected = exhibitor.id === selectedValue ? 'selected' : '';
    return `<option value="${exhibitor.id}" ${selected}>
      ${exhibitor.name} - ${exhibitor.industry}
    </option>`;
  }).join('');
}

// 渲染时间段选项
function renderTimeSlotOptions(timeSlots, selectedValue) {
  // 按顺序排序
  const sortedSlots = [...timeSlots].sort((a, b) => a.order - b.order);
  
  return sortedSlots.map(slot => {
    const selected = slot.id === selectedValue ? 'selected' : '';
    return `<option value="${slot.id}" ${selected}>
      ${slot.name} (${slot.date} ${slot.startTime}-${slot.endTime})
    </option>`;
  }).join('');
}

// 格式化日期时间
function formatDateTime(isoString) {
  if (!isoString) return 'N/A';
  try {
    const date = new Date(isoString);
    return date.toLocaleString('zh-CN');
  } catch {
    return isoString;
  }
}

// 绑定模态框事件监听器
export function bindScheduleModalEvents() {
  const state = getState();
  const isEdit = state.modalMode === 'edit';
  const editingId = isEdit ? state.editingSchedule?.id : null;
  
  // 关闭按钮
  document.getElementById('modal-close-btn')?.addEventListener('click', closeModal);
  document.getElementById('modal-cancel-btn')?.addEventListener('click', closeModal);
  
  // 点击遮罩层关闭
  document.querySelector('.modal-overlay')?.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-overlay')) {
      closeModal();
    }
  });
  
  // 表单提交
  document.getElementById('schedule-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const scheduleData = {
      boothId: formData.get('boothId'),
      exhibitorId: formData.get('exhibitorId'),
      timeSlotId: formData.get('timeSlotId'),
      notes: formData.get('notes')
    };
    
    // 验证必填字段
    if (!scheduleData.boothId || !scheduleData.exhibitorId || !scheduleData.timeSlotId) {
      alert('请填写所有必填项');
      return;
    }
    
    let result;
    if (isEdit && editingId) {
      result = editSchedule(editingId, scheduleData);
    } else {
      result = addSchedule(scheduleData);
    }
    
    if (result.success) {
      closeModal();
    }
  });
  
  // 实时冲突预览
  const boothSelect = document.getElementById('booth-select');
  const exhibitorSelect = document.getElementById('exhibitor-select');
  const timeslotSelect = document.getElementById('timeslot-select');
  
  const checkPreviewConflict = () => {
    // 这里可以添加实时冲突预览逻辑
    // 当用户选择摊位、参展商、时间段时，实时检查是否有冲突
  };
  
  boothSelect?.addEventListener('change', checkPreviewConflict);
  exhibitorSelect?.addEventListener('change', checkPreviewConflict);
  timeslotSelect?.addEventListener('change', checkPreviewConflict);
}
