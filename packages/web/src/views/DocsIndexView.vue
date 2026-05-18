<script setup lang="ts">
/**
 * DocsIndexView — 组件文档导航页
 *
 * 列出所有可用的 FormGrid 组件，按分类分组。
 * 每个组件条目链接到独立的文档页 /docs/:componentId。
 */
import { computed } from 'vue'
import { componentDocs, categoryLabels, getDocsByCategory } from '@/docs/components'

const docsByCategory = computed(() => getDocsByCategory())
</script>

<template>
  <div class="preview-index">
    <!-- 顶部导航 -->
    <header class="preview-header">
      <div class="preview-header__inner">
        <h1>FormGrid 组件文档</h1>
        <p class="preview-header__sub">Schema 驱动表单引擎 · {{ componentDocs.length }} 个组件</p>
        <nav class="preview-nav"><router-link to="/">返回控制台</router-link></nav>
      </div>
    </header>

    <div class="preview-index-body">
      <template v-for="(docs, cat) in docsByCategory" :key="cat">
        <section class="preview-index-category">
          <h2 class="preview-index-category__title">
            {{ categoryLabels[cat] || cat }}
            <span class="preview-index-category__count">{{ docs.length }}</span>
          </h2>
          <div class="preview-index-cards">
            <router-link
              v-for="doc in docs"
              :key="doc.id"
              :to="`/docs/${doc.id}`"
              class="preview-card"
            >
              <h3 class="preview-card__name">{{ doc.name }}</h3>
              <p class="preview-card__desc">{{ doc.description }}</p>
              <div class="preview-card__meta">
                <span v-if="doc.props.length" class="preview-card__meta-item">
                  {{ doc.props.length }} props
                </span>
                <span v-if="doc.events.length" class="preview-card__meta-item">
                  {{ doc.events.length }} events
                </span>
                <span v-if="doc.slots.length" class="preview-card__meta-item">
                  {{ doc.slots.length }} slots
                </span>
                <span class="preview-card__meta-item">
                  {{ doc.schemas.length }} 示例
                </span>
              </div>
            </router-link>
          </div>
        </section>
      </template>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.preview-index {
  min-height: 100vh;
  background: #f5f7fa;
}

.preview-header {
  background: #fff;
  border-bottom: 1px solid #e8e8e8;
  position: sticky;
  top: 0;
  z-index: 100;

  &__inner {
    max-width: 1200px;
    margin: 0 auto;
    padding: 20px 24px 16px;
    position: relative;
  }

  h1 {
    font-size: 24px;
    font-weight: 700;
    color: #1a1a1a;
    margin: 0;
  }

  &__sub {
    font-size: 13px;
    color: #999;
    margin: 4px 0 0;
  }
}

.preview-nav {
  position: absolute;
  right: 24px;
  top: 50%;
  transform: translateY(-50%);

  a {
    color: var(--el-color-primary);
    text-decoration: none;
    font-size: 14px;
    &:hover { text-decoration: underline; }
  }
}

.preview-index-body {
  max-width: 1200px;
  margin: 0 auto;
  padding: 32px 24px;
}

.preview-index-category {
  margin-bottom: 36px;

  &__title {
    font-size: 18px;
    font-weight: 700;
    color: #333;
    margin: 0 0 16px;
    padding-bottom: 8px;
    border-bottom: 2px solid var(--el-color-primary);
    display: flex;
    align-items: baseline;
    gap: 8px;
  }

  &__count {
    font-size: 13px;
    font-weight: 400;
    color: #999;
    background: #f0f0f0;
    padding: 2px 8px;
    border-radius: 10px;
  }
}

.preview-index-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}

.preview-card {
  display: block;
  background: #fff;
  border: 1px solid #e8e8e8;
  border-radius: 10px;
  padding: 20px 24px;
  text-decoration: none;
  transition: all 0.2s ease;
  cursor: pointer;

  &:hover {
    border-color: var(--el-color-primary);
    box-shadow: 0 2px 12px rgba(0, 96, 162, 0.1);
    transform: translateY(-2px);
  }

  &__name {
    font-size: 16px;
    font-weight: 600;
    color: #1a1a1a;
    margin: 0 0 8px;
  }

  &__desc {
    font-size: 13px;
    color: #888;
    margin: 0 0 14px;
    line-height: 1.5;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  &__meta {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
  }

  &__meta-item {
    font-size: 12px;
    color: #bbb;
    background: #fafbfc;
    padding: 2px 8px;
    border-radius: 4px;
    border: 1px solid #f0f0f0;
  }
}
</style>
