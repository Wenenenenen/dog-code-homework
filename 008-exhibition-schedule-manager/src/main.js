import { initApp } from './store/appStore.js';
import { loadFromStorage } from './utils/storage.js';
import { renderApp } from './components/App.js';

// 初始化应用
async function bootstrap() {
  // 从本地存储加载数据
  const savedData = loadFromStorage();
  
  // 初始化应用状态
  initApp(savedData);
  
  // 渲染应用
  renderApp();
}

// 启动应用
bootstrap();
