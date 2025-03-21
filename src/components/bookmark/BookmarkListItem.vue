<template>
  <div 
    :class="['bookmark-list__item', { 'bookmark-list__item--selected': isSelected }]"
    @click="handleItemClick"
    @contextmenu="openContextMenu"
  >
    <div class="bookmark-list__item-favicon">
      <img v-if="bookmark.favicon" :src="bookmark.favicon" alt="favicon" @error="handleFaviconError"/>
      <Icon v-else name="link" size="16" />
    </div>
    <div class="bookmark-list__item-title" :title="bookmark.title">
      {{ bookmark.title }}
    </div>
    <div class="bookmark-list__item-actions">
      <div class="bookmark-list__item-action" @click.stop="handleEditClick" title="编辑">
        <Icon name="edit" size="14" />
      </div>
      <div class="bookmark-list__item-action" @click.stop="handleDeleteClick" title="删除">
        <Icon name="delete" size="14" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useBookmarkStore, useSidebarStore, useNotificationStore } from '~/stores'
import { EnhancedBookmark } from '~/types'
import Icon from '../common/Icon.vue'

const props = defineProps<{
  bookmark: EnhancedBookmark
}>()

const emit = defineEmits<{
  (e: 'edit', bookmark: EnhancedBookmark): void
  (e: 'delete', bookmark: EnhancedBookmark): void
  (e: 'select', bookmark: EnhancedBookmark): void
}>()

const bookmarkStore = useBookmarkStore()
const sidebarStore = useSidebarStore()
const notificationStore = useNotificationStore()

// 是否选中
const isSelected = computed(() => {
  return sidebarStore.selectedBookmarkId === props.bookmark.id
})

// 点击项目
const handleItemClick = async () => {
  // 记录访问
  await bookmarkStore.addBookmarkVisit(props.bookmark.id)
  
  // 打开链接
  window.open(props.bookmark.url, '_blank')
  
  // 选择书签
  sidebarStore.selectBookmark(props.bookmark.id)
  
  // 发送选择事件
  emit('select', props.bookmark)
}

// 点击编辑
const handleEditClick = () => {
  emit('edit', props.bookmark)
}

// 点击删除
const handleDeleteClick = async () => {
  if (confirm(`确定要删除书签"${props.bookmark.title}"吗？`)) {
    const success = await bookmarkStore.deleteBookmark(props.bookmark.id)
    if (success) {
      notificationStore.success('删除成功', `书签"${props.bookmark.title}"已删除`)
      emit('delete', props.bookmark)
    } else {
      notificationStore.error('删除失败', '无法删除书签，请稍后重试')
    }
  }
}

// 打开右键菜单
const openContextMenu = (event: MouseEvent) => {
  sidebarStore.showContextMenu(event, 'bookmark', props.bookmark)
}

// 处理图标加载错误
const handleFaviconError = (event: Event) => {
  // 图标加载失败时，隐藏图像并显示默认图标
  const target = event.target as HTMLImageElement
  target.style.display = 'none'
}
</script>

<style scoped>
.bookmark-list__item {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  border-radius: var(--border-radius);
  margin-bottom: 4px;
  cursor: pointer;
  transition: var(--transition-normal);
}

.bookmark-list__item:hover {
  background-color: var(--bg-gray);
}

.bookmark-list__item--selected {
  background-color: var(--primary-bg);
  color: var(--primary-color);
}

.bookmark-list__item-favicon {
  width: 16px;
  height: 16px;
  margin-right: 12px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.bookmark-list__item-favicon img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.bookmark-list__item-title {
  flex: 1;
  color: var(--text-primary);
  font-size: 13px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.bookmark-list__item--selected .bookmark-list__item-title {
  color: var(--primary-color);
}

.bookmark-list__item-actions {
  display: flex;
  visibility: hidden;
}

.bookmark-list__item:hover .bookmark-list__item-actions {
  visibility: visible;
}

.bookmark-list__item-action {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--text-secondary);
  border-radius: 50%;
}

.bookmark-list__item-action:hover {
  color: var(--primary-color);
  background-color: var(--primary-bg);
}

/* 暗色主题 */
body[theme-mode="dark"] .bookmark-list__item:hover {
  background-color: var(--bg-gray);
}
</style>
