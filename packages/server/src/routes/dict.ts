import Router from '@koa/router'

const router = new Router({ prefix: '/api/dict' })

const dictionaries: Record<string, Array<{ label: string; value: string }>> = {
  // 城市字典（20+ 中国城市）
  city: [
    { label: '北京', value: 'beijing' },
    { label: '上海', value: 'shanghai' },
    { label: '广州', value: 'guangzhou' },
    { label: '深圳', value: 'shenzhen' },
    { label: '杭州', value: 'hangzhou' },
    { label: '成都', value: 'chengdu' },
    { label: '武汉', value: 'wuhan' },
    { label: '南京', value: 'nanjing' },
    { label: '重庆', value: 'chongqing' },
    { label: '西安', value: 'xian' },
    { label: '苏州', value: 'suzhou' },
    { label: '天津', value: 'tianjin' },
    { label: '长沙', value: 'changsha' },
    { label: '郑州', value: 'zhengzhou' },
    { label: '东莞', value: 'dongguan' },
    { label: '青岛', value: 'qingdao' },
    { label: '沈阳', value: 'shenyang' },
    { label: '宁波', value: 'ningbo' },
    { label: '昆明', value: 'kunming' },
    { label: '大连', value: 'dalian' },
    { label: '厦门', value: 'xiamen' },
    { label: '合肥', value: 'hefei' },
    { label: '福州', value: 'fuzhou' },
    { label: '济南', value: 'jinan' },
    { label: '温州', value: 'wenzhou' },
  ],
  // 性别字典
  gender: [
    { label: '男', value: 'male' },
    { label: '女', value: 'female' },
    { label: '其他', value: 'other' },
  ],
  // 状态字典（6+ 种状态）
  status: [
    { label: '启用', value: 'enabled' },
    { label: '禁用', value: 'disabled' },
    { label: '待审核', value: 'pending' },
    { label: '已通过', value: 'approved' },
    { label: '已拒绝', value: 'rejected' },
    { label: '已归档', value: 'archived' },
    { label: '草稿', value: 'draft' },
    { label: '已发布', value: 'published' },
  ],
  // 部门字典（10+ 个部门）
  department: [
    { label: '技术部', value: 'tech' },
    { label: '产品部', value: 'product' },
    { label: '设计部', value: 'design' },
    { label: '运营部', value: 'operations' },
    { label: '市场部', value: 'marketing' },
    { label: '销售部', value: 'sales' },
    { label: '人力资源部', value: 'hr' },
    { label: '财务部', value: 'finance' },
    { label: '法务部', value: 'legal' },
    { label: '行政部', value: 'admin' },
    { label: '客服部', value: 'customer_service' },
    { label: '质量部', value: 'quality' },
  ],
  // 角色字典
  role: [
    { label: '管理员', value: 'admin' },
    { label: '普通用户', value: 'user' },
    { label: '编辑', value: 'editor' },
    { label: '审核员', value: 'reviewer' },
    { label: '访客', value: 'guest' },
    { label: '超级管理员', value: 'super_admin' },
    { label: '部门主管', value: 'dept_manager' },
    { label: '项目经理', value: 'project_manager' },
    { label: '运维工程师', value: 'ops_engineer' },
    { label: '数据分析师', value: 'data_analyst' },
  ],
  // 优先级字典
  priority: [
    { label: '紧急', value: 'urgent' },
    { label: '高', value: 'high' },
    { label: '中', value: 'medium' },
    { label: '低', value: 'low' },
    { label: '最低', value: 'lowest' },
  ],
  // 学历字典
  education: [
    { label: '高中及以下', value: 'high_school' },
    { label: '大专', value: 'college' },
    { label: '本科', value: 'bachelor' },
    { label: '硕士', value: 'master' },
    { label: '博士', value: 'doctor' },
    { label: 'MBA/EMBA', value: 'mba' },
  ],
  // 行业字典
  industry: [
    { label: '互联网/IT', value: 'internet_it' },
    { label: '金融', value: 'finance' },
    { label: '教育', value: 'education' },
    { label: '医疗健康', value: 'healthcare' },
    { label: '制造业', value: 'manufacturing' },
    { label: '零售/电商', value: 'retail_ecommerce' },
    { label: '房地产', value: 'real_estate' },
    { label: '传媒/文化', value: 'media_culture' },
    { label: '物流/运输', value: 'logistics' },
    { label: '能源/环保', value: 'energy_environment' },
    { label: '政府/公共事业', value: 'government' },
    { label: '咨询/法律', value: 'consulting_legal' },
  ],
}

/**
 * GET /api/dict/:code
 */
router.get('/:code', async (ctx) => {
  const { code } = ctx.params
  const items = dictionaries[code] ?? []
  ctx.body = { success: true, data: items }
})

export default router
