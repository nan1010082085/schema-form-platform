# 规则系统（Linkage）

字段联动引擎，基于表单字段值变化自动计算目标组件的渲染状态。

## 1. LinkageType 定义

```ts
type LinkageType = 'visible' | 'disabled' | 'required' | 'options' | 'set-value' | 'reset-fields'
```

| 类型 | 作用 | condition 为 true 时 | condition 为 false 时 |
|---|---|---|---|
| `visible` | 控制组件显示/隐藏 | 组件可见 | 组件隐藏，可选回退到 `elseValue` |
| `disabled` | 控制组件禁用/启用 | 组件禁用 | 组件启用 |
| `required` | 控制校验必填 | 必填校验 | 取消必填 |
| `options` | 动态替换选项列表 | 使用 `thenOptions` 或 `thenApi` | 使用默认选项，可选回退到 `elseValue` |
| `set-value` | 条件触发赋值 | 将 `thenValue` 或 `valueSource` 对应字段的值写入目标 | 可选回退到 `elseValue` |
| `reset-fields` | 条件触发字段重置 | 重置 `targetFields` 中的字段值 | 无操作 |

## 2. 条件表达式语法

`condition` 支持两种形式：

**字符串表达式** — 编译为 `new Function('values', ...)` 沙箱执行：

```json
"condition": "values.status === 'approved' && values.amount > 1000"
```

**函数** — 运行时直接求值（仅代码模式可用）：

```ts
condition: (values) => values.status === 'approved' && values.amount > 1000
```

`values` 对象仅包含 `watchFields` 中声明的字段，类型为 `Record<string, FormFieldValue>`。

## 3. watchFields 配置

`watchFields` 是一个字符串数组，列出本联动配置依赖的所有字段名。当其中任意字段值变化时，条件自动重新求值。

```json
"watchFields": ["status", "amount"]
```

引擎构建依赖图后，批量合并监听。`condition` 表达式中只能引用 `watchFields` 声明的字段，未声明的字段访问为 `undefined`。

**循环依赖检测**：引擎通过 DFS 检测字段间的循环依赖。发现循环后，相关字段降级为默认状态（visible=true, disabled=false, required=false），避免无限重算。

## 4. 与事件系统的区别

| 维度 | 联动（Linkage） | 事件（Event） |
|---|---|---|
| 本质 | 响应式状态计算 | 一次性动作触发 |
| 触发方式 | 字段值变化时自动重算 | 用户交互（点击等）触发 |
| 持续性 | 持续生效，值变化即重算 | 触发一次即结束 |
| 输出 | 修改目标组件渲染状态 | 执行动作（emit、API、弹窗等） |
| 配置位置 | `FormSchemaItem.linkages[]` | `SchemaAction[]` |

简言之：联动是"当 A 变化时，B 应该怎样显示"；事件是"用户点了按钮，执行什么操作"。

## 5. 配置示例

### 示例 1：根据状态字段显隐组件

```json
{
  "type": "select",
  "field": "status",
  "options": [
    { "label": "待审批", "value": "pending" },
    { "label": "已通过", "value": "approved" },
    { "label": "已拒绝", "value": "rejected" }
  ]
}
```

```json
{
  "type": "textarea",
  "field": "rejectReason",
  "label": "拒绝原因",
  "linkages": [
    {
      "type": "visible",
      "watchFields": ["status"],
      "condition": "values.status === 'rejected'"
    }
  ]
}
```

status 为 `rejected` 时显示拒绝原因输入框，否则隐藏。

### 示例 2：金额联动必填 + 禁用

```json
{
  "type": "input",
  "field": "managerApproval",
  "label": "经理审批意见",
  "linkages": [
    {
      "type": "required",
      "watchFields": ["amount"],
      "condition": "values.amount > 50000"
    },
    {
      "type": "disabled",
      "watchFields": ["status"],
      "condition": "values.status === 'submitted'"
    }
  ]
}
```

金额超过 5 万时经理审批变为必填；已提交状态下禁用编辑。

### 示例 3：动态选项联动

```json
{
  "type": "select",
  "field": "city",
  "label": "城市",
  "linkages": [
    {
      "type": "options",
      "watchFields": ["province"],
      "condition": "values.province !== undefined",
      "thenApi": {
        "url": "/api/cities",
        "method": "get",
        "paramsKey": "province"
      }
    }
  ]
}
```

选择省份后，城市下拉选项通过 API 动态加载。

### 示例 4：条件赋值

```json
{
  "type": "input",
  "field": "totalPrice",
  "label": "总价",
  "linkages": [
    {
      "type": "set-value",
      "watchFields": ["price", "quantity"],
      "condition": "values.price !== undefined && values.quantity !== undefined",
      "valueSource": "price"
    }
  ]
}
```

当 price 和 quantity 都有值时，将 price 的值同步写入 totalPrice（可结合条件表达式做乘法计算）。

### 示例 5：条件重置字段

```json
{
  "type": "select",
  "field": "category",
  "label": "分类",
  "linkages": [
    {
      "type": "reset-fields",
      "watchFields": ["category"],
      "condition": "values.category === 'other'",
      "targetFields": ["subCategory", "detail"]
    }
  ]
}
```

切换到"其他"分类时，自动清空子分类和详细信息字段。
