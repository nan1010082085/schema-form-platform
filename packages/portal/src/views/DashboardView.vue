<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { apiClient } from '@/utils/apiClient'
import SubPageLayout from '@/components/SubPageLayout.vue'
import { Document, User } from '@element-plus/icons-vue'

interface Stats {
  schemas: { total: number; published: number }
  users: { total: number }
}

const stats = ref<Stats | null>(null)

onMounted(async () => {
  stats.value = await apiClient.get<Stats>('/stats')
})
</script>

<template>
  <SubPageLayout title="系统概览">
    <div class="stats-grid">
      <el-card shadow="hover" class="stat-card">
        <div class="stat-icon" style="background: #667eea">
          <el-icon :size="28" color="#fff"><Document /></el-icon>
        </div>
        <div class="stat-info">
          <div class="stat-value">{{ stats?.schemas.total ?? '-' }}</div>
          <div class="stat-label">Schema 总数</div>
        </div>
      </el-card>

      <el-card shadow="hover" class="stat-card">
        <div class="stat-icon" style="background: #43e97b">
          <el-icon :size="28" color="#fff"><Document /></el-icon>
        </div>
        <div class="stat-info">
          <div class="stat-value">{{ stats?.schemas.published ?? '-' }}</div>
          <div class="stat-label">已发布 Schema</div>
        </div>
      </el-card>

      <el-card shadow="hover" class="stat-card">
        <div class="stat-icon" style="background: #0ea5e9">
          <el-icon :size="28" color="#fff"><User /></el-icon>
        </div>
        <div class="stat-info">
          <div class="stat-value">{{ stats?.users.total ?? '-' }}</div>
          <div class="stat-label">用户总数</div>
        </div>
      </el-card>
    </div>
  </SubPageLayout>
</template>

<style scoped>
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 24px;
  max-width: 800px;
}

.stat-card :deep(.el-card__body) {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 28px;
}

.stat-icon {
  width: 56px;
  height: 56px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.stat-value {
  font-size: 2rem;
  font-weight: 700;
  color: #1a1a2e;
  line-height: 1;
}

.stat-label {
  font-size: 14px;
  color: #666;
  margin-top: 4px;
}
</style>
