// 冲突类型
export const CONFLICT_TYPES = {
  BOOTH_TIME_CONFLICT: 'booth_time_conflict',
  EXHIBITOR_TIME_CONFLICT: 'exhibitor_time_conflict'
};

// 检查排期是否与现有排期冲突
export function checkScheduleConflict(schedule, existingSchedules, excludeId = null) {
  const conflicts = [];
  
  for (const existing of existingSchedules) {
    // 排除正在编辑的记录本身
    if (excludeId && existing.id === excludeId) {
      continue;
    }
    
    // 检查摊位和时间段冲突
    if (existing.boothId === schedule.boothId && 
        existing.timeSlotId === schedule.timeSlotId) {
      conflicts.push({
        type: CONFLICT_TYPES.BOOTH_TIME_CONFLICT,
        conflictWith: existing.id,
        message: `摊位冲突：该摊位在同一时间段已被占用`
      });
    }
    
    // 检查参展商和时间段冲突
    if (existing.exhibitorId === schedule.exhibitorId && 
        existing.timeSlotId === schedule.timeSlotId) {
      conflicts.push({
        type: CONFLICT_TYPES.EXHIBITOR_TIME_CONFLICT,
        conflictWith: existing.id,
        message: `参展商冲突：该参展商在同一时间段已被安排`
      });
    }
  }
  
  return {
    hasConflict: conflicts.length > 0,
    conflicts
  };
}

// 检查所有排期记录，找出所有冲突
export function checkAllConflicts(schedules, booths = [], exhibitors = [], timeSlots = []) {
  const allConflicts = [];
  
  // 辅助函数：根据ID获取名称
  const getBoothNumber = (id) => {
    const booth = booths.find(b => b.id === id);
    return booth ? booth.number : id;
  };
  
  const getExhibitorName = (id) => {
    const exhibitor = exhibitors.find(e => e.id === id);
    return exhibitor ? exhibitor.name : id;
  };
  
  const getTimeSlotName = (id) => {
    const slot = timeSlots.find(t => t.id === id);
    return slot ? slot.name : id;
  };
  
  // 按时间段分组，只检查同一时间段内的冲突
  const schedulesByTimeSlot = {};
  for (const schedule of schedules) {
    if (!schedulesByTimeSlot[schedule.timeSlotId]) {
      schedulesByTimeSlot[schedule.timeSlotId] = [];
    }
    schedulesByTimeSlot[schedule.timeSlotId].push(schedule);
  }
  
  // 检查每个时间段内的冲突
  for (const [timeSlotId, timeSlotSchedules] of Object.entries(schedulesByTimeSlot)) {
    const timeSlotName = getTimeSlotName(timeSlotId);
    
    // 检查摊位冲突
    const boothMap = {};
    for (const schedule of timeSlotSchedules) {
      if (!boothMap[schedule.boothId]) {
        boothMap[schedule.boothId] = [];
      }
      boothMap[schedule.boothId].push(schedule);
    }
    
    // 找出有多个排期的摊位（冲突）
    for (const [boothId, boothSchedules] of Object.entries(boothMap)) {
      if (boothSchedules.length > 1) {
        const boothNumber = getBoothNumber(boothId);
        for (let i = 0; i < boothSchedules.length; i++) {
          for (let j = i + 1; j < boothSchedules.length; j++) {
            allConflicts.push({
              id: `conflict-${boothId}-${timeSlotId}-${i}-${j}`,
              type: CONFLICT_TYPES.BOOTH_TIME_CONFLICT,
              schedule1: boothSchedules[i],
              schedule2: boothSchedules[j],
              timeSlotId,
              boothId,
              boothNumber,
              timeSlotName,
              message: `摊位「${boothNumber}」在时间段「${timeSlotName}」被重复占用`
            });
          }
        }
      }
    }
    
    // 检查参展商冲突
    const exhibitorMap = {};
    for (const schedule of timeSlotSchedules) {
      if (!exhibitorMap[schedule.exhibitorId]) {
        exhibitorMap[schedule.exhibitorId] = [];
      }
      exhibitorMap[schedule.exhibitorId].push(schedule);
    }
    
    // 找出有多个排期的参展商（冲突）
    for (const [exhibitorId, exhibitorSchedules] of Object.entries(exhibitorMap)) {
      if (exhibitorSchedules.length > 1) {
        const exhibitorName = getExhibitorName(exhibitorId);
        for (let i = 0; i < exhibitorSchedules.length; i++) {
          for (let j = i + 1; j < exhibitorSchedules.length; j++) {
            allConflicts.push({
              id: `conflict-${exhibitorId}-${timeSlotId}-${i}-${j}`,
              type: CONFLICT_TYPES.EXHIBITOR_TIME_CONFLICT,
              schedule1: exhibitorSchedules[i],
              schedule2: exhibitorSchedules[j],
              timeSlotId,
              exhibitorId,
              exhibitorName,
              timeSlotName,
              message: `参展商「${exhibitorName}」在时间段「${timeSlotName}」被重复安排`
            });
          }
        }
      }
    }
  }
  
  // 去重（避免同一对排期被重复报告）
  const uniqueConflicts = [];
  const seen = new Set();
  
  for (const conflict of allConflicts) {
    const key = `${conflict.type}-${conflict.schedule1.id}-${conflict.schedule2.id}`;
    const reverseKey = `${conflict.type}-${conflict.schedule2.id}-${conflict.schedule1.id}`;
    
    if (!seen.has(key) && !seen.has(reverseKey)) {
      seen.add(key);
      uniqueConflicts.push(conflict);
    }
  }
  
  return uniqueConflicts;
}

// 获取冲突的建议处理方向
export function getConflictSuggestions(conflict) {
  const suggestions = [];
  
  if (conflict.type === CONFLICT_TYPES.BOOTH_TIME_CONFLICT) {
    suggestions.push({
      title: '更换摊位',
      description: '为其中一个参展商更换到其他可用的摊位'
    });
    suggestions.push({
      title: '调整时间段',
      description: '将其中一个排期调整到其他可用的时间段'
    });
    suggestions.push({
      title: '合并展示',
      description: '如果两个参展商可以共享摊位，考虑合并展示'
    });
  } else if (conflict.type === CONFLICT_TYPES.EXHIBITOR_TIME_CONFLICT) {
    suggestions.push({
      title: '调整时间段',
      description: '将其中一个排期调整到其他可用的时间段'
    });
    suggestions.push({
      title: '安排不同人员',
      description: '如果参展商有多个团队，可以安排不同人员负责'
    });
    suggestions.push({
      title: '取消其中一个',
      description: '评估优先级，取消优先级较低的排期'
    });
  }
  
  return suggestions;
}

// 检查单个排期记录是否涉及冲突
export function isScheduleInConflict(scheduleId, conflicts) {
  return conflicts.some(conflict => 
    conflict.schedule1.id === scheduleId || conflict.schedule2.id === scheduleId
  );
}

// 获取排期记录的冲突信息
export function getScheduleConflicts(scheduleId, conflicts) {
  return conflicts.filter(conflict => 
    conflict.schedule1.id === scheduleId || conflict.schedule2.id === scheduleId
  );
}
