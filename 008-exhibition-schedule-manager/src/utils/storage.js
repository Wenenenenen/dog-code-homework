const STORAGE_KEY = 'exhibition-schedule-manager';

// 检查 localStorage 是否可用
function isStorageAvailable() {
  try {
    const testKey = 'storage_test';
    localStorage.setItem(testKey, testKey);
    localStorage.removeItem(testKey);
    return true;
  } catch (e) {
    console.warn('LocalStorage is not available:', e);
    return false;
  }
}

const storageAvailable = isStorageAvailable();

// 从本地存储加载数据
export function loadFromStorage() {
  if (!storageAvailable) {
    console.warn('LocalStorage not available, using default data');
    return null;
  }
  
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('Error loading from localStorage:', e);
  }
  
  return null;
}

// 保存数据到本地存储
export function saveToStorage(data) {
  if (!storageAvailable) {
    console.warn('LocalStorage not available, data not saved');
    return false;
  }
  
  try {
    const jsonData = JSON.stringify(data);
    localStorage.setItem(STORAGE_KEY, jsonData);
    return true;
  } catch (e) {
    console.error('Error saving to localStorage:', e);
    return false;
  }
}

// 清除本地存储数据
export function clearStorage() {
  if (!storageAvailable) {
    return false;
  }
  
  try {
    localStorage.removeItem(STORAGE_KEY);
    return true;
  } catch (e) {
    console.error('Error clearing localStorage:', e);
    return false;
  }
}

// 导出存储数据
export function exportData() {
  const data = loadFromStorage();
  if (data) {
    const jsonData = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `exhibition-schedule-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    return true;
  }
  return false;
}

// 导入数据
export function importData(file, callback) {
  const reader = new FileReader();
  
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);
      // 验证数据结构
      if (data && data.areas && data.booths && data.exhibitors && data.timeSlots && data.schedules) {
        saveToStorage(data);
        callback(null, data);
      } else {
        callback(new Error('数据格式不正确'), null);
      }
    } catch (error) {
      callback(error, null);
    }
  };
  
  reader.onerror = () => {
    callback(new Error('文件读取失败'), null);
  };
  
  reader.readAsText(file);
}
