// 生成唯一ID
export function generateId(prefix = 'id') {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${prefix}-${timestamp}-${random}`;
}

// 验证排期记录
export function validateSchedule(schedule, existingSchedules = []) {
  const errors = [];
  
  // 必填字段验证
  if (!schedule.boothId) {
    errors.push('请选择摊位');
  }
  if (!schedule.exhibitorId) {
    errors.push('请选择参展商');
  }
  if (!schedule.timeSlotId) {
    errors.push('请选择时间段');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

// 创建新的排期记录
export function createSchedule(data) {
  const now = new Date().toISOString();
  return {
    id: generateId('schedule'),
    boothId: data.boothId || '',
    exhibitorId: data.exhibitorId || '',
    timeSlotId: data.timeSlotId || '',
    notes: data.notes || '',
    createdAt: now,
    updatedAt: now
  };
}

// 更新排期记录
export function updateSchedule(existingSchedule, updates) {
  const now = new Date().toISOString();
  return {
    ...existingSchedule,
    ...updates,
    updatedAt: now
  };
}

// 区域模型
export function validateArea(area) {
  const errors = [];
  
  if (!area.name || area.name.trim() === '') {
    errors.push('区域名称不能为空');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

// 摊位模型
export function validateBooth(booth) {
  const errors = [];
  
  if (!booth.number || booth.number.trim() === '') {
    errors.push('摊位编号不能为空');
  }
  if (!booth.areaId) {
    errors.push('请选择所属区域');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

// 参展商模型
export function validateExhibitor(exhibitor) {
  const errors = [];
  
  if (!exhibitor.name || exhibitor.name.trim() === '') {
    errors.push('公司名称不能为空');
  }
  if (!exhibitor.contact || exhibitor.contact.trim() === '') {
    errors.push('联系人不能为空');
  }
  if (!exhibitor.phone || exhibitor.phone.trim() === '') {
    errors.push('联系电话不能为空');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

// 时间段模型
export function validateTimeSlot(timeSlot) {
  const errors = [];
  
  if (!timeSlot.name || timeSlot.name.trim() === '') {
    errors.push('时间段名称不能为空');
  }
  if (!timeSlot.date) {
    errors.push('请选择日期');
  }
  if (!timeSlot.startTime) {
    errors.push('请选择开始时间');
  }
  if (!timeSlot.endTime) {
    errors.push('请选择结束时间');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}
