<template>
  <div 
    :class="['bookmark-card', { 'bookmark-card--selected': isSelected }]"
    @click="handleCardClick"
    @contextmenu="openContextMenu"
  >
    <div class="bookmark-card__header">
      <div class="bookmark-card__header-favicon">
        <img v-if="bookmark.favicon" :src="bookmark.favicon" alt="favicon" @error="handleFaviconError"/>
        <Icon v-else name="link" size="16" />
      </div>
      <div class="bookmark-card__header-content">
        <div class="bookmark-card__header-title">{{ bookmark.title }}</div>
        <div class="bookmark-card__header-url">{{ displayUrl }}</div>
      </div>
      <div class="bookmark-card__header-actions">
        <div class="bookmark-card__header-action" @click.stop="handleEditClick">
          <Icon name="edit" size="16" />
        </div>
        <div class="bookmark-card__header-action" @click.stop="handleDeleteClick">
          <Icon name="delete" size="16" />
        </div>
      </div>
    </div>
    <div v-if="bookmark.description" class="bookmark-card__description">
      {{ bookmark.description }}
    </div>
    <div v-if="bookmark.tags && bookmark.tags.length > 0" class="bookmark-card__tags">
      <span 
        v-for="tag in bookmark.tags" 
        :key="tag" 
        class="bookmark-card__tag"
        @click.stop="handleTagClick(tag)"
      >
        #{{ tag }}
      </span>
    </div>
    <div class="bookmark-card__footer">
      <div class="bookmark-card__category" @click.stop="handleCategoryClick(bookmark.categoryId)">
        <Icon name="folder" size="12" />
        <span>{{ categoryName }}</span>
      </div>
      <div class="bookmark-card__time">
        <Icon name="clock" size="12" />
        <span>{{ bookmark.relativeTime }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
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

// 显示URL（截断过长的URL）
const displayUrl = computed(() => {
  const url = props.bookmark.url
  try {
    const urlObj = new URL(url)
    return urlObj.host
  } catch (e) {
    return url.length > 40 ? url.substring(0, 40) + '...' : url
  }
})

// 获取分类名称
const categoryName = computed(() => {
  const category = bookmarkStore.categories.find(c => c.id === props.bookmark.categoryId)
  return category ? category.name : '未分类'
})

// 点击卡片
const handleCardClick = async () => {
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

// 点击标签
const handleTagClick = (tag: string) => {
  // 添加标签到搜索条件
  bookmarkStore.updateSearchParams({
    tags: [tag]
  })
}

// 点击分类
const handleCategoryClick = (categoryId: string) => {
  // 选择该分类
  sidebarStore.selectCategory(categoryId)
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
.bookmark-card {
  border-radius: var(--border-radius);
  background-color: var(--bg-white);
  border: 1px solid var(--border-color);
  padding: 12px;
  margin-bottom: 12px;
  transition: var(--transition-normal);
  cursor: pointer;
}

.bookmark-card:hover {
  box-shadow: var(--shadow-1);
  border-color: var(--primary-color);
}

.bookmark-card--selected {
  border-color: var(--primary-color);
  box-shadow: 0 0 0 1px var(--primary-color);
}

.bookmark-card__header {
  display: flex;
  align-items: flex-start;
  margin-bottom: 8px;
}

.bookmark-card__header-favicon {
  width: 16px;
  height: 16px;
  margin-right: 8px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.bookmark-card__header-favicon img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.bookmark-card__header-content {
  flex: 1;
  min-width: 0;
}

.bookmark-card__header-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 4px;
  word-break: break-word;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.bookmark-card__header-url {
  font-size: 12px;
  color: var(--text-secondary);
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.bookmark-card__header-actions {
  display: flex;
  align-items: center;
  margin-left: 8px;
  visibility: hidden;
}

.bookmark-card:hover .bookmark-card__header-actions {
  visibility: visible;
}

.bookmark-card__header-action {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--text-secondary);
  border-radius: 50%;
}

.bookmark-card__header-action:hover {
  color: var(--primary-color);
  background-color: var(--primary-bg);
}

.bookmark-card__description {
  font-size: 12px;
  color: var(--text-secondary);
  margin-bottom: 8px;
  word-break: break-word;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.bookmark-card__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-bottom: 8px;
}

.bookmark-card__tag {
  padding: 2px 6px;
  border-radius: 12px;
  font-size: 11px;
  background-color: var(--bg-gray);
  color: var(--text-secondary);
}

.bookmark-card__tag:hover {
  background-color: var(--primary-bg);
  color: var(--primary-color);
}

.bookmark-card__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 11px;
  color: var(--text-disabled);
}

.bookmark-card__category,
.bookmark-card__time {
  display: flex;
  align-items: center;
}

.bookmark-card__category .icon-component,
.bookmark-card__time .icon-component {
  margin-right: 4px;
}

.bookmark-card__category:hover {
  color: var(--primary-color);
}

/* 暗色主题 */
body[theme-mode="dark"] .bookmark-card {
  background-color: var(--bg-white);
  border-color: var(--border-color);
}

body[theme-mode="dark"] .bookmark-card:hover {
  border-color: var(--primary-color);
}

body[theme-mode="dark"] .bookmark-card__tag {
  background-color: var(--bg-gray);
}
</style>
