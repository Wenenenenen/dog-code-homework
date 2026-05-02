import { getAllSchedulesWithDetails, openModal, deleteSchedule } from '../store/appStore.js';

// 渲染看板视图
export function renderBoardView(state) {
  const { currentDimension, areas, timeSlots, exhibitors } = state;
  const schedules = getAllSchedulesWithDetails();
  
  let boardContent = '';
  
  switch (currentDimension) {
    case 'area':
      boardContent = renderByArea(schedules, areas);
      break;
    case 'timeSlot':
      boardContent = renderByTimeSlot(schedules, timeSlots);
      break;
    case 'exhibitor':
      boardContent = renderByExhibitor(schedules, exhibitors);
      break;
  }
  
  return `
    <div class="board-view">
      <div class="board-header">
        <h3>📋 看板视图 - ${getDimensionLabel(currentDimension)}</h3>
      </div>
      <div class="board-container">
        ${boardContent}
      </div>
      ${schedules.length === 0 ? renderEmptyState() : ''}
    </div>
  `;
}

// 获取维度标签
function getDimensionLabel(dimension) {
  const labels = {
    area: '按区域分组',
    timeSlot: '按时间段分组',
    exhibitor: '按参展商分组'
  };
  return labels[dimension] || dimension;
}

// 渲染空状态
function renderEmptyState() {
  return `
    <div class="empty-state">
      <div class="empty-icon">📅</div>
      <h4>暂无排期记录</h4>
      <p>点击上方「新增排期」按钮开始创建排期</p>
    </div>
  `;
}

// 按区域分组渲染看板
function renderByArea(schedules, areas) {
  // 按区域分组
  const schedulesByArea = {};
  areas.forEach(area => {
    schedulesByArea[area.id] = {
      area,
      schedules: []
    };
  });
  
  schedules.forEach(schedule => {
    const areaId = schedule.booth?.areaId;
    if (areaId && schedulesByArea[areaId]) {
      schedulesByArea[areaId].schedules.push(schedule);
    }
  });
  
  let html = '<div class="board-columns">';
  
  for (const [areaId, data] of Object.entries(schedulesByArea)) {
    const { area, schedules: areaSchedules } = data;
    
    // 按时间段排序
    const sortedSchedules = [...areaSchedules].sort((a, b) => {
      return (a.timeSlot?.order || 0) - (b.timeSlot?.order || 0);
    });
    
    html += `
      <div class="board-column" style="background-color: ${area.color};">
        <div class="column-header">
          <h4 class="column-title">${area.name}</h4>
          <span class="column-count">${sortedSchedules.length} 个排期</span>
        </div>
        <div class="column-cards">
          ${sortedSchedules.map(schedule => renderScheduleCard(schedule)).join('')}
          ${sortedSchedules.length === 0 ? `
            <div class="empty-card">
              <span>暂无排期</span>
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }
  
  html += '</div>';
  return html;
}

// 按时间段分组渲染看板
function renderByTimeSlot(schedules, timeSlots) {
  // 按时间段分组
  const schedulesByTimeSlot = {};
  timeSlots.forEach(slot => {
    schedulesByTimeSlot[slot.id] = {
      timeSlot: slot,
      schedules: []
    };
  });
  
  schedules.forEach(schedule => {
    const timeSlotId = schedule.timeSlotId;
    if (timeSlotId && schedulesByTimeSlot[timeSlotId]) {
      schedulesByTimeSlot[timeSlotId].schedules.push(schedule);
    }
  });
  
  let html = '<div class="board-columns">';
  
  // 按时间段顺序排序
  const sortedTimeSlots = timeSlots.sort((a, b) => a.order - b.order);
  
  for (const slot of sortedTimeSlots) {
    const data = schedulesByTimeSlot[slot.id];
    if (!data) continue;
    
    const { timeSlot, schedules: slotSchedules } = data;
    
    // 按区域排序
    const sortedSchedules = [...slotSchedules].sort((a, b) => {
      return (a.booth?.number || '').localeCompare(b.booth?.number || '');
    });
    
    html += `
      <div class="board-column">
        <div class="column-header">
          <h4 class="column-title">${timeSlot.name}</h4>
          <span class="column-count">${sortedSchedules.length} 个排期</span>
          <small class="column-time">${timeSlot.date} ${timeSlot.startTime}-${timeSlot.endTime}</small>
        </div>
        <div class="column-cards">
          ${sortedSchedules.map(schedule => renderScheduleCard(schedule)).join('')}
          ${sortedSchedules.length === 0 ? `
            <div class="empty-card">
              <span>暂无排期</span>
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }
  
  html += '</div>';
  return html;
}

// 按参展商分组渲染看板
function renderByExhibitor(schedules, exhibitors) {
  // 按参展商分组
  const schedulesByExhibitor = {};
  exhibitors.forEach(exhibitor => {
    schedulesByExhibitor[exhibitor.id] = {
      exhibitor,
      schedules: []
    };
  });
  
  schedules.forEach(schedule => {
    const exhibitorId = schedule.exhibitorId;
    if (exhibitorId && schedulesByExhibitor[exhibitorId]) {
      schedulesByExhibitor[exhibitorId].schedules.push(schedule);
    }
  });
  
  let html = '<div class="board-columns">';
  
  for (const [exhibitorId, data] of Object.entries(schedulesByExhibitor)) {
    const { exhibitor, schedules: exhibitorSchedules } = data;
    
    // 只显示有排期的参展商，或者全部显示？这里只显示有排期的
    if (exhibitorSchedules.length === 0) continue;
    
    // 按时间段排序
    const sortedSchedules = [...exhibitorSchedules].sort((a, b) => {
      return (a.timeSlot?.order || 0) - (b.timeSlot?.order || 0);
    });
    
    html += `
      <div class="board-column">
        <div class="column-header">
          <h4 class="column-title">${exhibitor.name}</h4>
          <span class="column-count">${sortedSchedules.length} 个排期</span>
          <small class="column-industry">${exhibitor.industry}</small>
        </div>
        <div class="column-cards">
          ${sortedSchedules.map(schedule => renderScheduleCard(schedule)).join('')}
        </div>
      </div>
    `;
  }
  
  html += '</div>';
  return html;
}

// 渲染排期卡片
function renderScheduleCard(schedule) {
  const hasConflict = schedule.hasConflict;
  const conflictClass = hasConflict ? 'card-conflict' : '';
  
  return `
    <div class="schedule-card ${conflictClass}" data-schedule-id="${schedule.id}">
      ${hasConflict ? `<div class="card-conflict-badge">⚠️ 冲突</div>` : ''}
      <div class="card-header">
        <span class="card-booth">📍 ${schedule.booth?.number || 'N/A'}</span>
        <span class="card-timeslot">⏰ ${schedule.timeSlot?.name || 'N/A'}</span>
      </div>
      <div class="card-body">
        <div class="card-exhibitor">
          <strong>${schedule.exhibitor?.name || 'N/A'}</strong>
        </div>
        ${schedule.booth?.description ? `
          <div class="card-detail">
            <small>摊位: ${schedule.booth.description}</small>
          </div>
        ` : ''}
        ${schedule.notes ? `
          <div class="card-notes">
            <small>备注: ${schedule.notes}</small>
          </div>
        ` : ''}
      </div>
      <div class="card-actions">
        <button class="btn btn-sm btn-secondary card-edit-btn" data-id="${schedule.id}">编辑</button>
        <button class="btn btn-sm btn-danger card-delete-btn" data-id="${schedule.id}">删除</button>
      </div>
    </div>
  `;
}

// 绑定看板视图事件监听器
export function bindBoardViewEvents() {
  // 编辑按钮
  document.querySelectorAll('.card-edit-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const scheduleId = e.target.dataset.id;
      openModal('edit', scheduleId);
    });
  });
  
  // 删除按钮
  document.querySelectorAll('.card-delete-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const scheduleId = e.target.dataset.id;
      if (confirm('确定要删除这个排期吗？')) {
        deleteSchedule(scheduleId);
      }
    });
  });
}
