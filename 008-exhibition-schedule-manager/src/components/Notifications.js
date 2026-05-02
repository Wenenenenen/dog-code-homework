import { removeNotification } from '../store/appStore.js';

// 渲染通知组件
export function renderNotifications(state) {
  const { notifications } = state;
  
  if (!notifications || notifications.length === 0) {
    return '<div class="notifications-container"></div>';
  }
  
  return `
    <div class="notifications-container">
      ${notifications.map(notification => renderNotification(notification)).join('')}
    </div>
  `;
}

// 渲染单个通知
function renderNotification(notification) {
  const typeClass = getNotificationTypeClass(notification.type);
  const icon = getNotificationIcon(notification.type);
  
  return `
    <div class="notification ${typeClass}" data-notification-id="${notification.id}">
      <div class="notification-icon">${icon}</div>
      <div class="notification-content">
        <p>${notification.message}</p>
      </div>
      <button class="notification-close" data-id="${notification.id}">&times;</button>
    </div>
  `;
}

// 获取通知类型样式类
function getNotificationTypeClass(type) {
  const classes = {
    success: 'notification-success',
    error: 'notification-error',
    warning: 'notification-warning',
    info: 'notification-info'
  };
  return classes[type] || classes.info;
}

// 获取通知图标
function getNotificationIcon(type) {
  const icons = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️'
  };
  return icons[type] || icons.info;
}

// 绑定通知事件监听器
export function bindNotificationEvents() {
  // 关闭按钮
  document.querySelectorAll('.notification-close').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const notificationId = parseInt(e.target.dataset.id);
      if (!isNaN(notificationId)) {
        removeNotification(notificationId);
      }
    });
  });
  
  // 点击通知自动关闭（可选）
  document.querySelectorAll('.notification').forEach(notification => {
    notification.addEventListener('click', (e) => {
      if (!e.target.classList.contains('notification-close')) {
        const notificationId = parseInt(notification.dataset.notificationId);
        if (!isNaN(notificationId)) {
          removeNotification(notificationId);
        }
      }
    });
  });
}
