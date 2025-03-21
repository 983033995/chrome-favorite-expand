<template>
  <div class="notification-container">
    <transition-group name="notification-fade">
      <div 
        v-for="notification in notifications"
        :key="notification.id" 
        :class="['notification', `notification-${notification.type}`]"
        @click="removeNotification(notification.id)"
      >
        <div class="notification-icon">
          <Icon :name="getIconName(notification.type)" />
        </div>
        <div class="notification-content">
          <div class="notification-title">{{ notification.title }}</div>
          <div class="notification-message">{{ notification.message }}</div>
        </div>
        <div class="notification-close" @click.stop="removeNotification(notification.id)">
          <Icon name="close" size="12" />
        </div>
      </div>
    </transition-group>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useNotificationStore } from '~/stores'
import Icon from './Icon.vue'

const notificationStore = useNotificationStore()

// 获取通知列表
const notifications = computed(() => {
  return notificationStore.notifications
})

// 获取通知类型对应的图标
const getIconName = (type: string): string => {
  switch (type) {
    case 'success':
      return 'success'
    case 'warning':
      return 'warning'
    case 'error':
      return 'error'
    case 'info':
    default:
      return 'info'
  }
}

// 移除通知
const removeNotification = (id: string) => {
  notificationStore.removeNotification(id)
}
</script>

<style scoped>
.notification-container {
  position: fixed;
  top: 20px;
  right: 20px;
  width: 320px;
  max-width: calc(100vw - 40px);
  z-index: 10000;
  display: flex;
  flex-direction: column;
  gap: 10px;
  pointer-events: none;
}

.notification {
  background-color: var(--bg-white);
  border-radius: var(--border-radius);
  box-shadow: var(--shadow-2);
  padding: 12px 16px;
  display: flex;
  align-items: flex-start;
  animation: slide-in 0.3s ease;
  border-left: 4px solid;
  pointer-events: auto;
  cursor: pointer;
}

.notification-success {
  border-left-color: var(--success-color);
}

.notification-info {
  border-left-color: var(--primary-color);
}

.notification-warning {
  border-left-color: var(--warning-color);
}

.notification-error {
  border-left-color: var(--error-color);
}

.notification-icon {
  margin-right: 12px;
  font-size: 18px;
}

.notification-success .notification-icon {
  color: var(--success-color);
}

.notification-info .notification-icon {
  color: var(--primary-color);
}

.notification-warning .notification-icon {
  color: var(--warning-color);
}

.notification-error .notification-icon {
  color: var(--error-color);
}

.notification-content {
  flex: 1;
  min-width: 0;
}

.notification-title {
  font-weight: 500;
  font-size: 14px;
  margin-bottom: 4px;
  color: var(--text-primary);
}

.notification-message {
  font-size: 12px;
  color: var(--text-secondary);
  word-break: break-word;
}

.notification-close {
  margin-left: 12px;
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 12px;
  opacity: 0.6;
}

.notification-close:hover {
  opacity: 1;
}

/* 过渡动画 */
.notification-fade-enter-active,
.notification-fade-leave-active {
  transition: all 0.3s ease;
}

.notification-fade-enter-from {
  opacity: 0;
  transform: translateX(100%);
}

.notification-fade-leave-to {
  opacity: 0;
  transform: translateX(100%);
}

@keyframes slide-in {
  from {
    opacity: 0;
    transform: translateX(100%);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

/* 暗色主题 */
body[theme-mode="dark"] .notification {
  background-color: var(--bg-white);
}
</style>
