<script setup lang="ts">
/**
 * FgBanner — 轮播图组件
 * 对齐 UI 规范：高度 400px，自动播放 3000ms
 */
import { computed } from 'vue'

interface BannerImage {
  id: string | number
  src: string
  description?: string
}

const props = withDefaults(defineProps<{
  images?: BannerImage[]
  height?: string
  interval?: number
}>(), {
  interval: 3000,
  height: '400px',
})

/** Fall back to mock images when props.images is empty */
const effectiveImages = computed(() => {
  if (props.images && props.images.length > 0) return props.images
  return [
    { id: 1, src: 'https://via.placeholder.com/900x400/1369C1/fff?text=Banner+1', description: 'Banner 1' },
    { id: 2, src: 'https://via.placeholder.com/900x400/26A036/fff?text=Banner+2', description: 'Banner 2' },
  ]
})
</script>

<template>
  <div class="fg-banner">
    <el-carousel
      :height="height"
      :interval="interval"
      :autoplay="true"
      indicator-position="outside"
    >
      <el-carousel-item v-for="img in effectiveImages" :key="img.id">
        <img
          :src="img.src"
          :alt="img.description ?? ''"
          class="fg-banner__image"
        />
      </el-carousel-item>
    </el-carousel>
  </div>
</template>

<style scoped lang="scss">
.fg-banner {
  width: 100%;

  &__image {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}
</style>
