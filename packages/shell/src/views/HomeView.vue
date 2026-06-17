<template>
  <div :class="$style.container">
    <h1 :class="$style.title">表单设计器平台</h1>
    <p :class="$style.subtitle">低代码表单引擎与流程引擎</p>

    <div :class="$style.grid">
      <router-link to="/editor" :class="$style.card">
        <div :class="$style.icon"><AppIcon name="edit" :size="48" /></div>
        <h3 :class="$style.cardTitle">表单设计器</h3>
        <p :class="$style.cardDesc">可视化设计表单，支持多种组件和布局</p>
      </router-link>

      <router-link to="/flow" :class="$style.card">
        <div :class="$style.icon"><AppIcon name="connection" :size="48" /></div>
        <h3 :class="$style.cardTitle">流程设计器</h3>
        <p :class="$style.cardDesc">BPMN 流程编排，支持审批、自动化</p>
      </router-link>

      <router-link to="/ai" :class="$style.card">
        <div :class="$style.icon"><AppIcon name="monitor" :size="48" /></div>
        <h3 :class="$style.cardTitle">AI 应用</h3>
        <p :class="$style.cardDesc">AI 对话式生成表单和流程</p>
      </router-link>

      <router-link to="/admin" :class="$style.card">
        <div :class="$style.icon"><AppIcon name="setting" :size="48" /></div>
        <h3 :class="$style.cardTitle">系统管理</h3>
        <p :class="$style.cardDesc">用户、角色、权限、菜单管理</p>
      </router-link>
    </div>
  </div>
</template>

<script setup lang="ts">
</script>

<style module>
.container {
  padding: 40px;
  max-width: 1200px;
  margin: 0 auto;
}

.title {
  font-size: 32px;
  font-weight: 700;
  color: var(--text-color-primary);
  margin: 0 0 8px 0;
}

.subtitle {
  font-size: 16px;
  color: var(--text-color-secondary);
  margin: 0 0 40px 0;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 24px;
}

.card {
  background: var(--bg-color-white);
  border: 1px solid var(--border-color-light);
  border-radius: 12px;
  padding: 24px;
  text-decoration: none;
  transition: all 0.3s ease;
  cursor: pointer;
}

.card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.1);
  border-color: var(--color-primary);
}

.icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.cardTitle {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-color-primary);
  margin: 0 0 8px 0;
}

.cardDesc {
  font-size: 14px;
  color: var(--text-color-secondary);
  margin: 0;
  line-height: 1.6;
}
</style>
