import { getAllSchedulesWithDetails, openModal, deleteSchedule } from '../store/appStore.js';

// 渲染表格视图
export function renderTableView(state) {
  const { currentDimension, areas, timeSlots, exhibitors, booths } = state;
  const schedules = getAllSchedulesWithDetails();
  
  let tableContent = '';
  
  switch (currentDimension) {
    case 'area':
      tableContent = renderByArea(schedules, areas, timeSlots, booths);
      break;
    case 'timeSlot':
      tableContent = renderByTimeSlot(schedules, timeSlots, areas, booths);
      break;
    case 'exhibitor':
      tableContent = renderByExhibitor(schedules, exhibitors, timeSlots, areas, booths);
      break;
  }
  
  return `
    <div class="table-view">
      <div class="table-header">
        <h3>📊 表格视图 - ${getDimensionLabel(currentDimension)}</h3>
      </div>
      <div class="table-container">
        ${tableContent}
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

// 按区域分组渲染
function renderByArea(schedules, areas, timeSlots, booths) {
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
  
  let html = `
    <table class="schedule-table">
      <thead>
        <tr>
          <th>区域</th>
          <th>摊位</th>
          <th>参展商</th>
          <th>时间段</th>
          <th>状态</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
  `;
  
  let hasData = false;
  
  for (const [areaId, data] of Object.entries(schedulesByArea)) {
    const { area, schedules: areaSchedules } = data;
    
    if (areaSchedules.length === 0) continue;
    hasData = true;
    
    // 按时间段排序
    const sortedSchedules = [...areaSchedules].sort((a, b) => {
      return (a.timeSlot?.order || 0) - (b.timeSlot?.order || 0);
    });
    
    sortedSchedules.forEach((schedule, index) => {
      const rowClass = schedule.hasConflict ? 'conflict-row' : '';
      
      html += `
        <tr class="${rowClass}" data-schedule-id="${schedule.id}">
          ${index === 0 ? `<td rowspan="${sortedSchedules.length}" class="area-cell" style="background-color: ${area.color};">
            <div class="area-info">
              <strong>${area.name}</strong>
              <small>${area.description}</small>
            </div>
          </td>` : ''}
          <td>
            <div class="booth-info">
              <span class="booth-number">${schedule.booth?.number || 'N/A'}</span>
              <span class="booth-size">${schedule.booth?.size || ''}</span>
            </div>
          </td>
          <td>
            <div class="exhibitor-info">
              <strong>${schedule.exhibitor?.name || 'N/A'}</strong>
              <small>${schedule.exhibitor?.industry || ''}</small>
            </div>
          </td>
          <td>
            <div class="timeslot-info">
              <span class="timeslot-name">${schedule.timeSlot?.name || 'N/A'}</span>
              <small>${schedule.timeSlot?.startTime || ''} - ${schedule.timeSlot?.endTime || ''}</small>
            </div>
          </td>
          <td>
            ${schedule.hasConflict ? 
              `<span class="status-badge status-conflict">⚠️ 冲突</span>` : 
              `<span class="status-badge status-valid">✅ 有效</span>`
            }
          </td>
          <td>
            <div class="action-buttons">
              <button class="btn btn-sm btn-secondary edit-btn" data-id="${schedule.id}">编辑</button>
              <button class="btn btn-sm btn-danger delete-btn" data-id="${schedule.id}">删除</button>
            </div>
          </td>
        </tr>
      `;
    });
  }
  
  html += `
      </tbody>
    </table>
  `;
  
  if (!hasData) {
    return renderEmptyState();
  }
  
  return html;
}

// 按时间段分组渲染
function renderByTimeSlot(schedules, timeSlots, areas, booths) {
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
  
  let html = `
    <table class="schedule-table">
      <thead>
        <tr>
          <th>时间段</th>
          <th>区域</th>
          <th>摊位</th>
          <th>参展商</th>
          <th>状态</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
  `;
  
  let hasData = false;
  
  // 按时间段顺序排序
  const sortedTimeSlots = timeSlots.sort((a, b) => a.order - b.order);
  
  for (const slot of sortedTimeSlots) {
    const data = schedulesByTimeSlot[slot.id];
    if (!data || data.schedules.length === 0) continue;
    hasData = true;
    
    const { timeSlot, schedules: slotSchedules } = data;
    
    // 按区域排序
    const sortedSchedules = [...slotSchedules].sort((a, b) => {
      return (a.booth?.number || '').localeCompare(b.booth?.number || '');
    });
    
    sortedSchedules.forEach((schedule, index) => {
      const rowClass = schedule.hasConflict ? 'conflict-row' : '';
      const area = areas.find(a => a.id === schedule.booth?.areaId);
      
      html += `
        <tr class="${rowClass}" data-schedule-id="${schedule.id}">
          ${index === 0 ? `<td rowspan="${sortedSchedules.length}" class="timeslot-cell">
            <div class="timeslot-info">
              <strong>${timeSlot.name}</strong>
              <small>${timeSlot.date} ${timeSlot.startTime} - ${timeSlot.endTime}</small>
            </div>
          </td>` : ''}
          <td>
            <div class="area-info" style="background-color: ${area?.color || '#fff'};">
              ${area?.name || 'N/A'}
            </div>
          </td>
          <td>
            <div class="booth-info">
              <span class="booth-number">${schedule.booth?.number || 'N/A'}</span>
              <span class="booth-size">${schedule.booth?.size || ''}</span>
            </div>
          </td>
          <td>
            <div class="exhibitor-info">
              <strong>${schedule.exhibitor?.name || 'N/A'}</strong>
              <small>${schedule.exhibitor?.industry || ''}</small>
            </div>
          </td>
          <td>
            ${schedule.hasConflict ? 
              `<span class="status-badge status-conflict">⚠️ 冲突</span>` : 
              `<span class="status-badge status-valid">✅ 有效</span>`
            }
          </td>
          <td>
            <div class="action-buttons">
              <button class="btn btn-sm btn-secondary edit-btn" data-id="${schedule.id}">编辑</button>
              <button class="btn btn-sm btn-danger delete-btn" data-id="${schedule.id}">删除</button>
            </div>
          </td>
        </tr>
      `;
    });
  }
  
  html += `
      </tbody>
    </table>
  `;
  
  if (!hasData) {
    return renderEmptyState();
  }
  
  return html;
}

// 按参展商分组渲染
function renderByExhibitor(schedules, exhibitors, timeSlots, areas, booths) {
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
  
  let html = `
    <table class="schedule-table">
      <thead>
        <tr>
          <th>参展商</th>
          <th>区域</th>
          <th>摊位</th>
          <th>时间段</th>
          <th>状态</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
  `;
  
  let hasData = false;
  
  for (const [exhibitorId, data] of Object.entries(schedulesByExhibitor)) {
    const { exhibitor, schedules: exhibitorSchedules } = data;
    
    if (exhibitorSchedules.length === 0) continue;
    hasData = true;
    
    // 按时间段排序
    const sortedSchedules = [...exhibitorSchedules].sort((a, b) => {
      return (a.timeSlot?.order || 0) - (b.timeSlot?.order || 0);
    });
    
    sortedSchedules.forEach((schedule, index) => {
      const rowClass = schedule.hasConflict ? 'conflict-row' : '';
      const area = areas.find(a => a.id === schedule.booth?.areaId);
      
      html += `
        <tr class="${rowClass}" data-schedule-id="${schedule.id}">
          ${index === 0 ? `<td rowspan="${sortedSchedules.length}" class="exhibitor-cell">
            <div class="exhibitor-info">
              <strong>${exhibitor.name}</strong>
              <small>联系人: ${exhibitor.contact}</small>
              <small>行业: ${exhibitor.industry}</small>
            </div>
          </td>` : ''}
          <td>
            <div class="area-info" style="background-color: ${area?.color || '#fff'};">
              ${area?.name || 'N/A'}
            </div>
          </td>
          <td>
            <div class="booth-info">
              <span class="booth-number">${schedule.booth?.number || 'N/A'}</span>
              <span class="booth-size">${schedule.booth?.size || ''}</span>
            </div>
          </td>
          <td>
            <div class="timeslot-info">
              <span class="timeslot-name">${schedule.timeSlot?.name || 'N/A'}</span>
              <small>${schedule.timeSlot?.startTime || ''} - ${schedule.timeSlot?.endTime || ''}</small>
            </div>
          </td>
          <td>
            ${schedule.hasConflict ? 
              `<span class="status-badge status-conflict">⚠️ 冲突</span>` : 
              `<span class="status-badge status-valid">✅ 有效</span>`
            }
          </td>
          <td>
            <div class="action-buttons">
              <button class="btn btn-sm btn-secondary edit-btn" data-id="${schedule.id}">编辑</button>
              <button class="btn btn-sm btn-danger delete-btn" data-id="${schedule.id}">删除</button>
            </div>
          </td>
        </tr>
      `;
    });
  }
  
  html += `
      </tbody>
    </table>
  `;
  
  if (!hasData) {
    return renderEmptyState();
  }
  
  return html;
}

// 绑定表格视图事件监听器（在App.js中调用）
export function bindTableViewEvents() {
  // 编辑按钮
  document.querySelectorAll('.edit-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const scheduleId = e.target.dataset.id;
      openModal('edit', scheduleId);
    });
  });
  
  // 删除按钮
  document.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const scheduleId = e.target.dataset.id;
      if (confirm('确定要删除这个排期吗？')) {
        deleteSchedule(scheduleId);
      }
    });
  });
}
