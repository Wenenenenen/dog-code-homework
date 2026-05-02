import { getDefaultData } from '../data/mockData.js';
import { createSchedule, updateSchedule, validateSchedule } from '../models/scheduleModel.js';
import { saveToStorage } from '../utils/storage.js';
import { 
  checkScheduleConflict, 
  checkAllConflicts, 
  getConflictSuggestions,
  isScheduleInConflict,
  getScheduleConflicts
} from '../utils/conflictChecker.js';

// 应用状态
let appState = {
  areas: [],
  booths: [],
  exhibitors: [],
  timeSlots: [],
  schedules: [],
  conflicts: [],
  currentView: 'table', // 'table', 'board'
  currentDimension: 'area', // 'area', 'timeSlot', 'exhibitor'
  isLoading: false,
  notifications: [],
  selectedScheduleId: null,
  isModalOpen: false,
  modalMode: 'create', // 'create', 'edit'
  editingSchedule: null
};

// 状态变更监听器
const listeners = [];

// 订阅状态变更
export function subscribe(listener) {
  listeners.push(listener);
  return () => {
    const index = listeners.indexOf(listener);
    if (index > -1) {
      listeners.splice(index, 1);
    }
  };
}

// 通知所有监听器
function notifyListeners() {
  listeners.forEach(listener => listener(appState));
}

// 获取当前状态
export function getState() {
  return { ...appState };
}

// 初始化应用状态
export function initApp(savedData) {
  const defaultData = getDefaultData();
  
  if (savedData) {
    appState = {
      ...appState,
      areas: savedData.areas || defaultData.areas,
      booths: savedData.booths || defaultData.booths,
      exhibitors: savedData.exhibitors || defaultData.exhibitors,
      timeSlots: savedData.timeSlots || defaultData.timeSlots,
      schedules: savedData.schedules || defaultData.schedules
    };
  } else {
    appState = {
      ...appState,
      ...defaultData
    };
  }
  
  // 初始检查冲突
  updateConflicts();
  
  notifyListeners();
}

// 保存状态到本地存储
function persistState() {
  const dataToSave = {
    areas: appState.areas,
    booths: appState.booths,
    exhibitors: appState.exhibitors,
    timeSlots: appState.timeSlots,
    schedules: appState.schedules
  };
  saveToStorage(dataToSave);
}

// 更新冲突检查
function updateConflicts() {
  appState.conflicts = checkAllConflicts(
    appState.schedules,
    appState.booths,
    appState.exhibitors,
    appState.timeSlots
  );
}

// 添加通知
function addNotification(message, type = 'info') {
  const notification = {
    id: Date.now(),
    message,
    type,
    timestamp: new Date().toISOString()
  };
  appState.notifications = [...appState.notifications, notification];
  
  // 5秒后自动移除
  setTimeout(() => {
    removeNotification(notification.id);
  }, 5000);
  
  notifyListeners();
}

// 移除通知
export function removeNotification(id) {
  appState.notifications = appState.notifications.filter(n => n.id !== id);
  notifyListeners();
}

// 切换视图类型
export function toggleView(viewType) {
  if (['table', 'board'].includes(viewType)) {
    appState.currentView = viewType;
    notifyListeners();
  }
}

// 切换查看维度
export function toggleDimension(dimension) {
  if (['area', 'timeSlot', 'exhibitor'].includes(dimension)) {
    appState.currentDimension = dimension;
    notifyListeners();
  }
}

// 创建新排期
export function addSchedule(scheduleData) {
  const newSchedule = createSchedule(scheduleData);
  
  // 验证数据
  const validation = validateSchedule(newSchedule);
  if (!validation.isValid) {
    addNotification(validation.errors.join(', '), 'error');
    return { success: false, errors: validation.errors };
  }
  
  // 检查冲突
  const conflictCheck = checkScheduleConflict(newSchedule, appState.schedules);
  if (conflictCheck.hasConflict) {
    addNotification('检测到冲突：' + conflictCheck.conflicts.map(c => c.message).join('; '), 'warning');
  }
  
  // 添加排期
  appState.schedules = [...appState.schedules, newSchedule];
  
  // 更新冲突
  updateConflicts();
  
  // 保存到本地存储
  persistState();
  
  addNotification('排期创建成功', 'success');
  notifyListeners();
  
  return { success: true, schedule: newSchedule };
}

// 更新排期
export function editSchedule(scheduleId, updates) {
  const scheduleIndex = appState.schedules.findIndex(s => s.id === scheduleId);
  if (scheduleIndex === -1) {
    addNotification('排期记录不存在', 'error');
    return { success: false, error: '排期记录不存在' };
  }
  
  const existingSchedule = appState.schedules[scheduleIndex];
  const updatedSchedule = updateSchedule(existingSchedule, updates);
  
  // 验证数据
  const validation = validateSchedule(updatedSchedule);
  if (!validation.isValid) {
    addNotification(validation.errors.join(', '), 'error');
    return { success: false, errors: validation.errors };
  }
  
  // 检查冲突（排除自身）
  const conflictCheck = checkScheduleConflict(updatedSchedule, appState.schedules, scheduleId);
  if (conflictCheck.hasConflict) {
    addNotification('检测到冲突：' + conflictCheck.conflicts.map(c => c.message).join('; '), 'warning');
  }
  
  // 更新排期
  appState.schedules = [
    ...appState.schedules.slice(0, scheduleIndex),
    updatedSchedule,
    ...appState.schedules.slice(scheduleIndex + 1)
  ];
  
  // 更新冲突
  updateConflicts();
  
  // 保存到本地存储
  persistState();
  
  addNotification('排期更新成功', 'success');
  notifyListeners();
  
  return { success: true, schedule: updatedSchedule };
}

// 删除排期
export function deleteSchedule(scheduleId) {
  const scheduleIndex = appState.schedules.findIndex(s => s.id === scheduleId);
  if (scheduleIndex === -1) {
    addNotification('排期记录不存在', 'error');
    return { success: false, error: '排期记录不存在' };
  }
  
  // 删除排期
  appState.schedules = appState.schedules.filter(s => s.id !== scheduleId);
  
  // 更新冲突
  updateConflicts();
  
  // 保存到本地存储
  persistState();
  
  addNotification('排期删除成功', 'success');
  notifyListeners();
  
  return { success: true };
}

// 打开模态框
export function openModal(mode = 'create', scheduleId = null) {
  appState.modalMode = mode;
  appState.isModalOpen = true;
  
  if (mode === 'edit' && scheduleId) {
    const schedule = appState.schedules.find(s => s.id === scheduleId);
    appState.editingSchedule = schedule;
    appState.selectedScheduleId = scheduleId;
  } else {
    appState.editingSchedule = null;
    appState.selectedScheduleId = null;
  }
  
  notifyListeners();
}

// 关闭模态框
export function closeModal() {
  appState.isModalOpen = false;
  appState.modalMode = 'create';
  appState.editingSchedule = null;
  appState.selectedScheduleId = null;
  notifyListeners();
}

// 获取区域信息
export function getAreaById(areaId) {
  return appState.areas.find(a => a.id === areaId);
}

// 获取摊位信息
export function getBoothById(boothId) {
  return appState.booths.find(b => b.id === boothId);
}

// 获取参展商信息
export function getExhibitorById(exhibitorId) {
  return appState.exhibitors.find(e => e.id === exhibitorId);
}

// 获取时间段信息
export function getTimeSlotById(timeSlotId) {
  return appState.timeSlots.find(t => t.id === timeSlotId);
}

// 获取排期的详细信息（包含关联数据）
export function getScheduleWithDetails(scheduleId) {
  const schedule = appState.schedules.find(s => s.id === scheduleId);
  if (!schedule) return null;
  
  return {
    ...schedule,
    booth: getBoothById(schedule.boothId),
    exhibitor: getExhibitorById(schedule.exhibitorId),
    timeSlot: getTimeSlotById(schedule.timeSlotId),
    hasConflict: isScheduleInConflict(scheduleId, appState.conflicts),
    conflicts: getScheduleConflicts(scheduleId, appState.conflicts)
  };
}

// 获取所有排期的详细信息
export function getAllSchedulesWithDetails() {
  return appState.schedules.map(schedule => ({
    ...schedule,
    booth: getBoothById(schedule.boothId),
    exhibitor: getExhibitorById(schedule.exhibitorId),
    timeSlot: getTimeSlotById(schedule.timeSlotId),
    hasConflict: isScheduleInConflict(schedule.id, appState.conflicts),
    conflicts: getScheduleConflicts(schedule.id, appState.conflicts)
  }));
}

// 生成冲突报告
export function generateConflictReport() {
  const conflicts = appState.conflicts;
  
  if (conflicts.length === 0) {
    return {
      hasConflicts: false,
      totalConflicts: 0,
      boothConflicts: 0,
      exhibitorConflicts: 0,
      conflicts: [],
      summary: '当前没有检测到任何冲突，所有排期均有效。'
    };
  }
  
  const boothConflicts = conflicts.filter(c => c.type === 'booth_time_conflict');
  const exhibitorConflicts = conflicts.filter(c => c.type === 'exhibitor_time_conflict');
  
  const detailedConflicts = conflicts.map(conflict => ({
    ...conflict,
    schedule1Details: getScheduleWithDetails(conflict.schedule1.id),
    schedule2Details: getScheduleWithDetails(conflict.schedule2.id),
    suggestions: getConflictSuggestions(conflict)
  }));
  
  return {
    hasConflicts: true,
    totalConflicts: conflicts.length,
    boothConflicts: boothConflicts.length,
    exhibitorConflicts: exhibitorConflicts.length,
    conflicts: detailedConflicts,
    summary: `检测到 ${conflicts.length} 个冲突，其中 ${boothConflicts.length} 个摊位冲突，${exhibitorConflicts.length} 个参展商冲突。`
  };
}

// 重置为默认数据
export function resetToDefault() {
  const defaultData = getDefaultData();
  appState = {
    ...appState,
    ...defaultData
  };
  updateConflicts();
  persistState();
  addNotification('数据已重置为默认值', 'info');
  notifyListeners();
}
