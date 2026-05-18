# 联动配置指南

6 种联动类型，支持字段间交互控制。

## 一、基础配置

每个 `SchemaLinkage` 包含：

| 属性 | 类型 | 必需 | 说明 |
|------|------|------|------|
| `type` | `LinkageType` | ✅ | 联动类型 |
| `watchFields` | `string[]` | ✅ | 监听的字段名 |
| `condition` | `string \| Function` | ✅ | 触发条件 |
| `elseValue` | `FormFieldValue` | ❌ | 条件为 false 时的回退值 |

条件表达式语法：`"values.fieldName === 'value'"`。字符串表达式在沙箱中 eval，函数直接调用。

## 二、6 种联动类型

### 1. visible — 显示/隐藏

```json
{ "type": "visible", "watchFields": ["type"],
  "condition": "values.type === 'advanced'",
  "elseValue": "" }
```
条件为真 → 显示；为假 → 隐藏并回退到 elseValue

### 2. disabled — 启用/禁用

```json
{ "type": "disabled", "watchFields": ["approvalType"],
  "condition": "values.approvalType === 'fast'" }
```

### 3. required — 选填/必填

```json
{ "type": "required", "watchFields": ["hasCar"],
  "condition": "values.hasCar === 'yes'" }
```

### 4. options — 动态选项

```json
{ "type": "options", "watchFields": ["province"],
  "condition": "values.province === 'gd'",
  "thenOptions": [
    { "label": "广州", "value": "gz" },
    { "label": "深圳", "value": "sz" }
  ]}
```
条件为真 → 替换选项为 `thenOptions` 或 `thenApi`。适合省→市→区三级联动。

### 5. set-value — 设值

```json
// 字面值：
{ "type": "set-value", "watchFields": ["features"],
  "condition": "values.features && values.features.includes('urgent')",
  "thenValue": "urgent" }

// 字段复制：
{ "type": "set-value", "watchFields": ["sourceField"],
  "condition": "values.sourceField !== ''",
  "valueSource": "sourceField" }
```

### 6. reset-fields — 批量重置

```json
{ "type": "reset-fields", "watchFields": ["orderMode"],
  "condition": "values.orderMode === 'fast'",
  "targetFields": ["customNote", "additionalApprover", "ccList"] }
```
条件为真 → 将 `targetFields` 重置为各自的 `defaultValue`

## 三、多字段联合条件

```json
{ "type": "visible", "watchFields": ["role", "level"],
  "condition": "values.role === 'manager' && Number(values.level) >= 5" }
```

## 四、函数条件

替代字符串表达式的 `new Function()` 沙箱：

```json
{ "type": "required", "watchFields": ["age"],
  "condition": "(values) => typeof values.age === 'number' && values.age < 18" }
```

## 五、循环检测

useLinkage 自动 DFS 检测循环依赖。检测到的循环字段降级为默认状态 (visible=true, disabled=false, required=false)，不阻塞渲染。

## 六、完整示例

参见 `src/docs/components/linkage-demo.ts` — 6 种类型全覆盖的完整 Schema。
