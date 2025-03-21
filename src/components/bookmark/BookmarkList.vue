<template>
  <div class="bookmark-list-container">
    <!-- 加载中 -->
    <div v-if="isLoading" class="bookmark-loading">
      <Icon name="sync" spin size="32" />
      <p>正在加载书签...</p>
    </div>
    
    <!-- 书签列表 -->
    <template v-else>
      <!-- 列表为空 -->
      <div v-if="bookmarks.length === 0" class="bookmark-empty">
        <Icon name="bookmark" size="48" class="bookmark-empty__icon" />
        <p class="bookmark-empty__text">
          {{ emptyMessage }}
        </p>
        <a-button v-if="showAddButton" type="primary" size="small" class="bookmark-empty__btn" @click="handleAddBookmark">
          <Icon name="plus" />
          添加书签
        </a-button>
      </div>
      
      <!-- 有数据显示 -->
      <template v-else>
        <!-- 卡片视图 -->
        <div v-if="viewMode === 'card'" class="bookmark-grid">
          <BookmarkCard
            v-for="bookmark in bookmarks"
            :key="bookmark.id"
            :bookmark="bookmark"
            @edit="handleEditBookmark"
            @delete="handleDeleteBookmark"
            @select="handleSelectBookmark"
          />
        </div>
        
        <!-- 列表视图 -->
        <div v-else class="bookmark-list">
          <BookmarkListItem
            v-for="bookmark in bookmarks"
            :key="bookmark.id"
            :bookmark="bookmark"
            @edit="handleEditBookmark"
            @delete="handleDeleteBookmark"
            @select="handleSelectBookmark"
          />
        </div>
      </template>
    </template>
    
    <!-- 编辑对话框 -->
    <a-modal
      v-model:visible="showEditDialog"
      title="编辑书签"
      @ok="saveBookmark"
      :ok-loading="isSaving"
      :mask-closable="false"
    >
      <a-form :model="editForm" layout="vertical">
        <a-form-item label="标题" required>
          <a-input v-model="editForm.title" placeholder="请输入标题" />
        </a-form-item>
        <a-form-item label="网址" required>
          <a-input v-model="editForm.url" placeholder="请输入网址" />
        </a-form-item>
        <a-form-item label="描述">
          <a-textarea v-model="editForm.description" placeholder="请输入描述信息" :auto-size="{ minRows: 2, maxRows: 5 }" />
        </a-form-item>
        <a-form-item label="分类">
          <a-select v-model="editForm.categoryId" placeholder="请选择分类">
            <a-option v-for="category in categories" :key="category.id" :value="category.id">
              {{ category.name }}
            </a-option>
          </a-select>
        </a-form-item>
        <a-form-item label="标签">
          <a-select
            v-model="editForm.tags"
            placeholder="请输入或选择标签"
            mode="tags"
            :options="tagOptions"
            allow-create
          />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useBookmarkStore, useNotificationStore, useSettingsStore } from '~/stores'
import { Bookmark, Category, EnhancedBookmark, Tag } from '~/types'
import Icon from '../common/Icon.vue'
import BookmarkCard from './BookmarkCard.vue'
import BookmarkListItem from './BookmarkListItem.vue'

// 定义属性
const props = defineProps({
  // 书签列表
  bookmarks: {
    type: Array as () => EnhancedBookmark[],
    default: () => []
  },
  // 是否加载中
  isLoading: {
    type: Boolean,
    default: false
  },
  // 空数据提示信息
  emptyMessage: {
    type: String,
    default: '暂无书签'
  },
  // 是否显示添加按钮
  showAddButton: {
    type: Boolean,
    default: true
  },
  // 视图模式：卡片/列表
  viewMode: {
    type: String,
    default: 'card', // 'card' 或 'list'
    validator: (value: string) => ['card', 'list'].includes(value)
  }
})

// 定义事件
const emit = defineEmits(['add', 'edit', 'delete', 'select'])

// Store
const bookmarkStore = useBookmarkStore()
const notificationStore = useNotificationStore()
const settingsStore = useSettingsStore()

// 编辑对话框状态
const showEditDialog = ref(false)
const isSaving = ref(false)
const currentBookmark = ref<EnhancedBookmark | null>(null)

// 编辑表单
const editForm = reactive({
  id: '',
  title: '',
  url: '',
  description: '',
  categoryId: 'uncategorized',
  tags: [] as string[],
})

// 分类列表
const categories = computed(() => {
  return bookmarkStore.categories
})

// 标签选项
const tagOptions = computed(() => {
  return bookmarkStore.sortedTags.map(tag => ({
    label: tag.name,
    value: tag.name
  }))
})

// 添加书签
const handleAddBookmark = () => {
  emit('add')
}

// 编辑书签
const handleEditBookmark = (bookmark: EnhancedBookmark) => {
  currentBookmark.value = bookmark
  
  // 填充表单
  editForm.id = bookmark.id
  editForm.title = bookmark.title
  editForm.url = bookmark.url
  editForm.description = bookmark.description || ''
  editForm.categoryId = bookmark.categoryId
  editForm.tags = [...bookmark.tags]
  
  // 显示对话框
  showEditDialog.value = true
}

// 保存书签
const saveBookmark = async () => {
  if (!editForm.title || !editForm.url) {
    notificationStore.warning('验证失败', '请填写标题和网址')
    return
  }
  
  // 验证URL格式
  try {
    new URL(editForm.url)
  } catch (e) {
    notificationStore.warning('验证失败', '请输入有效的网址')
    return
  }
  
  isSaving.value = true
  
  try {
    // 更新书签
    const success = await bookmarkStore.updateBookmark(editForm.id, {
      title: editForm.title,
      url: editForm.url,
      description: editForm.description,
      categoryId: editForm.categoryId,
      tags: editForm.tags,
    })
    
    if (success) {
      notificationStore.success('更新成功', '书签已成功更新')
      showEditDialog.value = false
      
      // 发出事件
      if (currentBookmark.value) {
        emit('edit', currentBookmark.value)
      }
    } else {
      notificationStore.error('更新失败', '无法更新书签，请稍后重试')
    }
  } catch (error) {
    notificationStore.error('更新失败', `${error}`)
  } finally {
    isSaving.value = false
  }
}

// 删除书签
const handleDeleteBookmark = (bookmark: EnhancedBookmark) => {
  emit('delete', bookmark)
}

// 选择书签
const handleSelectBookmark = (bookmark: EnhancedBookmark) => {
  emit('select', bookmark)
}
</script>

<style scoped>
.bookmark-list-container {
  width: 100%;
}

/* 加载状态 */
.bookmark-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;
  color: var(--text-secondary);
}

.bookmark-loading p {
  margin-top: 16px;
}

/* 空状态 */
.bookmark-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;
  color: var(--text-secondary);
}

.bookmark-empty__icon {
  color: var(--text-disabled);
  margin-bottom: 16px;
}

.bookmark-empty__text {
  margin-bottom: 16px;
}

/* 卡片视图 */
.bookmark-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
}

/* 列表视图 */
.bookmark-list {
  display: flex;
  flex-direction: column;
}

/* 暗色主题 */
body[theme-mode="dark"] .bookmark-loading,
body[theme-mode="dark"] .bookmark-empty {
  color: var(--text-secondary);
}
</style>
