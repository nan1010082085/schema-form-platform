<script setup lang="ts">
/**
 * FlowPreview -- 事件/规则流程预览（垂直时间线）
 *
 * 只读组件，接收标准化的 FlowItem[] 渲染垂直时间线。
 * 每个 FlowItem 可包含子项，支持 trigger / condition / action 三种节点类型。
 */

export interface FlowItem {
  type: 'trigger' | 'condition' | 'action'
  label: string
  description?: string
  children?: FlowItem[]
}

defineProps<{
  items: FlowItem[]
}>()
</script>

<template>
  <div :class="$style.root">
    <div v-if="items.length === 0" :class="$style.empty">
      暂无配置
    </div>
    <div v-for="(item, idx) in items" :key="idx" :class="$style.timeline">
      <!-- 节点 -->
      <div :class="[$style.node, $style[item.type]]">
        <div :class="$style.dot" />
        <div v-if="idx < items.length - 1" :class="$style.line" />
      </div>
      <!-- 内容 -->
      <div :class="$style.content">
        <div :class="$style.label">{{ item.label }}</div>
        <div v-if="item.description" :class="$style.desc">{{ item.description }}</div>
        <!-- 子节点 -->
        <div v-if="item.children?.length" :class="$style.children">
          <div v-for="(child, ci) in item.children" :key="ci" :class="$style.childRow">
            <span :class="$style.childIcon">{{ child.type === 'condition' ? '◇' : '○' }}</span>
            <span :class="$style.childLabel">{{ child.label }}</span>
            <span v-if="child.description" :class="$style.childDesc">{{ child.description }}</span>
            <!-- 三级子节点 -->
            <div v-if="child.children?.length" :class="$style.grandChildren">
              <div v-for="(gc, gi) in child.children" :key="gi" :class="$style.gcRow">
                <span :class="$style.gcIcon">○</span>
                <span :class="$style.gcLabel">{{ gc.label }}</span>
                <span v-if="gc.description" :class="$style.gcDesc">{{ gc.description }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style module>
.root {
  padding: 12px 0;
  font-size: 12px;
}

.empty {
  color: #c0c4cc;
  text-align: center;
  padding: 24px 0;
}

/* ---- 时间线行 ---- */
.timeline {
  display: flex;
  gap: 10px;
  position: relative;
}

/* ---- 左侧节点（圆点+竖线） ---- */
.node {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex-shrink: 0;
  width: 16px;
}

.dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
  z-index: 1;
}

.line {
  width: 2px;
  flex: 1;
  min-height: 16px;
  background: #e4e7ed;
}

/* 节点类型颜色 */
.trigger .dot { background: #409eff; }
.condition .dot { background: #e6a23c; border-radius: 2px; transform: rotate(45deg); width: 8px; height: 8px; }
.action .dot { background: #67c23a; }

/* ---- 右侧内容 ---- */
.content {
  flex: 1;
  min-width: 0;
  padding-bottom: 12px;
}

.label {
  font-weight: 600;
  color: #303133;
  line-height: 16px;
}

.desc {
  color: #909399;
  font-size: 11px;
  margin-top: 2px;
  line-height: 16px;
  word-break: break-all;
}

/* ---- 子节点列表 ---- */
.children {
  margin-top: 6px;
  padding-left: 4px;
}

.childRow {
  display: flex;
  align-items: flex-start;
  gap: 4px;
  padding: 3px 0;
}

.childIcon {
  color: #c0c4cc;
  font-size: 10px;
  line-height: 16px;
  flex-shrink: 0;
}

.childLabel {
  color: #606266;
  line-height: 16px;
}

.childDesc {
  color: #909399;
  font-size: 11px;
  line-height: 16px;
  margin-left: 4px;
}

/* ---- 三级子节点 ---- */
.grandChildren {
  padding-left: 14px;
  margin-top: 2px;
}

.gcRow {
  display: flex;
  align-items: flex-start;
  gap: 4px;
  padding: 2px 0;
}

.gcIcon {
  color: #dcdfe6;
  font-size: 8px;
  line-height: 16px;
  flex-shrink: 0;
}

.gcLabel {
  color: #909399;
  font-size: 11px;
  line-height: 16px;
}

.gcDesc {
  color: #c0c4cc;
  font-size: 11px;
  line-height: 16px;
  margin-left: 4px;
}
</style>
