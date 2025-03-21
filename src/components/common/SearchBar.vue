<template>
  <div class="search-bar">
    <div class="search-bar__input-wrapper">
      <Icon name="search" class="search-bar__icon" />
      <input
        type="text"
        class="search-bar__input"
        :placeholder="placeholder"
        :value="modelValue"
        @input="handleInput"
        @keyup.enter="handleSearch"
      />
      <div 
        v-if="modelValue" 
        class="search-bar__clear" 
        @click="handleClear"
        title="清除"
      >
        <Icon name="close" size="14" />
      </div>
    </div>
    <div class="search-bar__actions">
      <slot name="actions"></slot>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import Icon from './Icon.vue'

// 定义属性
const props = defineProps({
  // 搜索框值
  modelValue: {
    type: String,
    default: ''
  },
  // 提示文字
  placeholder: {
    type: String,
    default: '搜索书签...'
  },
  // 是否自动聚焦
  autoFocus: {
    type: Boolean,
    default: false
  },
  // 搜索延迟（毫秒）
  debounce: {
    type: Number,
    default: 300
  }
})

// 定义事件
const emit = defineEmits(['update:modelValue', 'search', 'clear'])

// 输入框引用
const inputRef = ref<HTMLInputElement | null>(null)

// 防抖定时器
let debounceTimer: number | null = null

// 处理输入
const handleInput = (event: Event) => {
  const value = (event.target as HTMLInputElement).value
  emit('update:modelValue', value)
  
  // 防抖搜索
  if (debounceTimer) {
    clearTimeout(debounceTimer)
  }
  
  debounceTimer = window.setTimeout(() => {
    emit('search', value)
  }, props.debounce)
}

// 处理搜索
const handleSearch = () => {
  if (debounceTimer) {
    clearTimeout(debounceTimer)
    debounceTimer = null
  }
  
  emit('search', props.modelValue)
}

// 清除搜索
const handleClear = () => {
  emit('update:modelValue', '')
  emit('clear')
  
  // 自动聚焦
  if (inputRef.value) {
    inputRef.value.focus()
  }
}

// 生命周期钩子
onMounted(() => {
  if (props.autoFocus && inputRef.value) {
    inputRef.value.focus()
  }
})

onUnmounted(() => {
  if (debounceTimer) {
    clearTimeout(debounceTimer)
    debounceTimer = null
  }
})
</script>

<style scoped>
.search-bar {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  background-color: var(--bg-white);
}

.search-bar__input-wrapper {
  flex: 1;
  position: relative;
  min-width: 0;
}

.search-bar__icon {
  position: absolute;
  left: 10px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-secondary);
  pointer-events: none;
}

.search-bar__input {
  width: 100%;
  height: 32px;
  border-radius: var(--border-radius);
  border: 1px solid var(--border-color);
  padding: 0 30px 0 34px;
  font-size: 14px;
  color: var(--text-primary);
  background-color: var(--bg-white);
  transition: all 0.2s;
}

.search-bar__input:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 2px var(--primary-bg);
}

.search-bar__clear {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
  cursor: pointer;
  border-radius: 50%;
  transition: all 0.2s;
}

.search-bar__clear:hover {
  background-color: var(--bg-gray);
  color: var(--text-primary);
}

.search-bar__actions {
  margin-left: 8px;
  display: flex;
  align-items: center;
}

/* 暗色主题 */
body[theme-mode="dark"] .search-bar__input {
  background-color: var(--bg-white);
  color: var(--text-primary);
  border-color: var(--border-color);
}

body[theme-mode="dark"] .search-bar__clear:hover {
  background-color: var(--bg-gray);
}
</style>
