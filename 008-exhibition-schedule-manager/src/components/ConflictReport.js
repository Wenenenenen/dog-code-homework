// 渲染冲突报告
export function renderConflictReport(report) {
  if (!report.hasConflicts) {
    return `
      <div class="conflict-report">
        <div class="report-header">
          <h2>📋 冲突检查报告</h2>
          <button class="btn btn-secondary close-report-btn">关闭</button>
        </div>
        <div class="report-summary report-success">
          <div class="summary-icon">✅</div>
          <div class="summary-content">
            <h3>一切正常！</h3>
            <p>${report.summary}</p>
          </div>
        </div>
      </div>
    `;
  }
  
  return `
    <div class="conflict-report">
      <div class="report-header">
        <h2>📋 冲突检查报告</h2>
        <button class="btn btn-secondary close-report-btn">关闭</button>
      </div>
      
      <div class="report-summary report-warning">
        <div class="summary-icon">⚠️</div>
        <div class="summary-content">
          <h3>检测到冲突</h3>
          <p>${report.summary}</p>
          <div class="summary-stats">
            <div class="stat-item">
              <span class="stat-number">${report.boothConflicts}</span>
              <span class="stat-label">摊位冲突</span>
            </div>
            <div class="stat-item">
              <span class="stat-number">${report.exhibitorConflicts}</span>
              <span class="stat-label">参展商冲突</span>
            </div>
          </div>
        </div>
      </div>
      
      <div class="report-details">
        <h3>冲突详情</h3>
        <div class="conflict-list">
          ${report.conflicts.map((conflict, index) => renderConflictItem(conflict, index + 1)).join('')}
        </div>
      </div>
    </div>
  `;
}

// 渲染单个冲突项
function renderConflictItem(conflict, index) {
  const isBoothConflict = conflict.type === 'booth_time_conflict';
  const conflictTypeLabel = isBoothConflict ? '摊位冲突' : '参展商冲突';
  const conflictTypeClass = isBoothConflict ? 'conflict-booth' : 'conflict-exhibitor';
  
  const schedule1 = conflict.schedule1Details;
  const schedule2 = conflict.schedule2Details;
  
  return `
    <div class="conflict-item ${conflictTypeClass}">
      <div class="conflict-header">
        <span class="conflict-number">#${index}</span>
        <span class="conflict-type-badge ${conflictTypeClass}">${conflictTypeLabel}</span>
      </div>
      
      <div class="conflict-message">
        <p><strong>冲突描述：</strong>${conflict.message}</p>
      </div>
      
      <div class="conflict-schedules">
        <h4>涉及的排期记录：</h4>
        <div class="schedule-pair">
          ${renderConflictSchedule(schedule1, '排期 1')}
          <div class="vs-divider">VS</div>
          ${renderConflictSchedule(schedule2, '排期 2')}
        </div>
      </div>
      
      <div class="conflict-suggestions">
        <h4>💡 建议处理方向：</h4>
        <ul class="suggestions-list">
          ${conflict.suggestions.map(suggestion => `
            <li class="suggestion-item">
              <strong>${suggestion.title}</strong>
              <p>${suggestion.description}</p>
            </li>
          `).join('')}
        </ul>
      </div>
    </div>
  `;
}

// 渲染冲突中的排期信息
function renderConflictSchedule(schedule, label) {
  if (!schedule) return '<div class="schedule-card-mini">-</div>';
  
  return `
    <div class="schedule-card-mini">
      <div class="card-mini-header">
        <span class="card-label">${label}</span>
        ${schedule.hasConflict ? '<span class="card-conflict">⚠️</span>' : ''}
      </div>
      <div class="card-mini-body">
        <div class="mini-row">
          <span class="mini-label">参展商：</span>
          <span class="mini-value">${schedule.exhibitor?.name || 'N/A'}</span>
        </div>
        <div class="mini-row">
          <span class="mini-label">摊位：</span>
          <span class="mini-value">${schedule.booth?.number || 'N/A'}</span>
        </div>
        <div class="mini-row">
          <span class="mini-label">时间段：</span>
          <span class="mini-value">${schedule.timeSlot?.name || 'N/A'}</span>
        </div>
        ${schedule.notes ? `
          <div class="mini-row">
            <span class="mini-label">备注：</span>
            <span class="mini-value">${schedule.notes}</span>
          </div>
        ` : ''}
      </div>
    </div>
  `;
}

// 导出报告为文本
export function exportReportAsText(report) {
  let text = '='.repeat(60) + '\n';
  text += '           展会摊位排期冲突检查报告\n';
  text += '='.repeat(60) + '\n\n';
  text += `生成时间: ${new Date().toLocaleString('zh-CN')}\n\n`;
  
  if (!report.hasConflicts) {
    text += '✅ 检查结果：无冲突\n';
    text += report.summary + '\n';
    return text;
  }
  
  text += `⚠️ 检查结果：发现 ${report.totalConflicts} 个冲突\n`;
  text += `   - 摊位冲突: ${report.boothConflicts} 个\n`;
  text += `   - 参展商冲突: ${report.exhibitorConflicts} 个\n\n`;
  text += '-'.repeat(60) + '\n\n';
  
  report.conflicts.forEach((conflict, index) => {
    const isBoothConflict = conflict.type === 'booth_time_conflict';
    const conflictType = isBoothConflict ? '摊位冲突' : '参展商冲突';
    
    text += `【冲突 #${index + 1}】${conflictType}\n`;
    text += `描述: ${conflict.message}\n\n`;
    
    text += `涉及的排期记录：\n`;
    text += `  排期 1:\n`;
    text += `    参展商: ${conflict.schedule1Details?.exhibitor?.name || 'N/A'}\n`;
    text += `    摊位: ${conflict.schedule1Details?.booth?.number || 'N/A'}\n`;
    text += `    时间段: ${conflict.schedule1Details?.timeSlot?.name || 'N/A'}\n`;
    
    text += `  排期 2:\n`;
    text += `    参展商: ${conflict.schedule2Details?.exhibitor?.name || 'N/A'}\n`;
    text += `    摊位: ${conflict.schedule2Details?.booth?.number || 'N/A'}\n`;
    text += `    时间段: ${conflict.schedule2Details?.timeSlot?.name || 'N/A'}\n\n`;
    
    text += `建议处理方向：\n`;
    conflict.suggestions.forEach((suggestion, i) => {
      text += `  ${i + 1}. ${suggestion.title}\n`;
      text += `     ${suggestion.description}\n`;
    });
    
    text += '\n' + '-'.repeat(60) + '\n\n';
  });
  
  text += '='.repeat(60) + '\n';
  text += '报告结束\n';
  text += '='.repeat(60) + '\n';
  
  return text;
}

// 下载报告
export function downloadReport(report) {
  const text = exportReportAsText(report);
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = `conflict-report-${new Date().toISOString().slice(0, 10)}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
