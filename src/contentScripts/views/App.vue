<!--
 * @FilePath: /chrome-favorite-expand/src/contentScripts/views/App.vue
 * @Description:
-->
<script setup lang="ts">
import browser from 'webextension-polyfill'
import { useToggle } from '@vueuse/core'
import 'uno.css'

const [show, toggle] = useToggle(false)
const { width, height } = useWindowSize()

watch(() => [width.value, height.value], () => {
  console.log('-----width, height----', width, height)
  browser.runtime.sendMessage({
    width: width.value,
    height: height.value,
  })
}, { deep: true, immediate: true })
</script>

<template>
  <div class="fixed right-0 bottom-0 m-5 z-100 flex items-end font-sans select-none leading-1em">
    <div
      class="bg-white text-gray-800 rounded-lg shadow w-max h-min"
      p="x-4 y-2"
      m="y-auto r-2"
      transition="opacity duration-300"
      :class="show ? 'opacity-100' : 'opacity-0'"
    >
      <h1 class="text-lg">
        插入页面内容- {{ width }} -- {{ height }}
      </h1>
      <SharedSubtitle />
    </div>
    <button
      class="flex w-10 h-10 rounded-full shadow cursor-pointer border-none"
      bg="teal-600 hover:teal-700"
      @click="toggle()"
    >
      <pixelarticons-power class="block m-auto text-white text-lg" />
    </button>
  </div>
</template>
