# MSA-Form → FormGrid 迁移指南

## 一、核心差异

| 方面 | MSA-Form (Vue 2) | FormGrid (Vue 3) |
|------|-----------------|------------------|
| 表单布局 | 基于模板 (`<template>`) | Schema JSON 驱动 |
| 组件注册 | 全局注册 + props | compMap 类型映射 |
| 样式命名空间 | 无隔离 | `.fg` 前缀全局隔离 |
| 联动 | 组件内 watch | SchemaLinkage 声明式 |
| 数据获取 | 组件内 $http | useDynamicOptions / useListData |
| 微前端 | 单应用中 | qiankun 子应用 |

## 二、最简迁移：Template → Schema

### MSA-Form 写法

```html
<template>
  <el-form :model="formData">
    <el-form-item label="姓名" prop="name">
      <el-input v-model="formData.name" />
    </el-form-item>
    <el-form-item label="性别" prop="gender">
      <el-select v-model="formData.gender">
        <el-option label="男" value="male" />
        <el-option label="女" value="female" />
      </el-select>
    </el-form-item>
  </el-form>
</template>
```

### FormGrid Schema 写法

```json
[
  { "type": "input", "field": "name", "label": "姓名" },
  { "type": "select", "field": "gender", "label": "性别",
    "options": [
      { "label": "男", "value": "male" },
      { "label": "女", "value": "female" }
    ]
  }
]
```

## 三、组件映射表

| MSA-Form 组件 | FormGrid SchemaType | 注意事项 |
|--------------|-------------------|---------|
| `<el-input>` | `input` | placeholder 通过 props 传递 |
| `<el-input-number>` | `number` | min/max 通过 props 传递 |
| `<el-select>` | `select` | options 改为 DictItem[] |
| `<el-radio-group>` | `radio` | 同上 |
| `<el-checkbox-group>` | `checkbox` | 值类型为数组 |
| `<el-date-picker>` | `date` | — |
| `<el-date-picker type="daterange">` | `date-range` | 双字段绑定（formData 级别） |
| `<el-input type="textarea">` | `textarea` | rows 通过 props |
| `<el-upload>` | `upload` | — |
| 自定义人员选择 | `person-select` | 支持 treeData |
| 自定义部门选择 | `dept-select` | 支持 treeData |
| `<el-transfer>` | `transfer` | — |
| `<el-dialog>` | `dialog` | dialogSchema 可嵌套渲染 |
| `<el-table>` (可编辑) | `table` | 列定义通过 columnSchema |
| 审批表单 | `detail-form` | 只读模式 |
| 步骤表单 | `steps` | children 为每步 |
| 标签表单 | `tabs` | children 为每 tab |
| 搜索+表格+分页 | `search-list` | 一体化组件 |

## 四、联动迁移：watch → SchemaLinkage

### MSA-Form

```js
watch: {
  'formData.province'(val) {
    if (val === 'gd') {
      this.cityOptions = [{ label: '广州', value: 'gz' }]
    }
  }
}
```

### FormGrid

```json
{ "type": "select", "field": "city", "label": "城市",
  "linkages": [{
    "type": "options",
    "watchFields": ["province"],
    "condition": "values.province === 'gd'",
    "thenOptions": [{ "label": "广州", "value": "gz" }]
  }]
}
```

## 五、API 选项迁移：$http → SchemaApiConfig

### MSA-Form

```js
async mounted() {
  const res = await this.$http.get('/api/dept/list')
  this.deptOptions = res.data.map(d => ({ label: d.name, value: d.id }))
}
```

### FormGrid

```json
{ "api": {
  "url": "/api/dept/list",
  "method": "get",
  "labelKey": "name",
  "valueKey": "id",
  "dataPath": "data"
}}
```

## 六、不兼容项

| 特性 | 状态 | 替代方案 |
|------|------|---------|
| 自定义 slot 渲染 | ❌ | `render: 'custom'` + `renderFn` |
| 动态表单（v-for） | ❌ | Schema JSON 构建逻辑放在外部 |
| 复杂计算属性 | ❌ | 联动 set-value + valueSource 替代 |
| i18n 国际化 | ⚠️ | types.ts 预留，1.1 落地 |
