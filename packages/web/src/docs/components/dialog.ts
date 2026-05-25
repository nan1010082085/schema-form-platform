// @ts-nocheck
import type { ComponentDoc } from './types'

const doc: ComponentDoc = {
  id: 'dialog',
  name: 'FgDialog',
  category: 'business',
  description:
    '通用弹窗组件。对齐 UI 规范：宽度 994px，内边距 16px。' +
    '支持 footer 插槽、确认/取消回调、数据预填、与按钮动作链深度集成。' +
    '通过 dialogMode 支持内部/外部两种弹窗管理模式。',
  receivableEvents: [
    { name: 'open', description: '打开弹窗' },
    { name: 'close', description: '关闭弹窗' },
  ],
  props: [
    { name: 'modelValue', type: 'boolean', default: '—', description: '弹窗可见性（v-model）' },
    { name: 'title', type: 'string', default: '—', description: '弹窗标题' },
    { name: 'width', type: 'string', default: '"994px"', description: '弹窗宽度' },
    { name: 'fullscreen', type: 'boolean', default: 'false', description: '是否全屏' },
    { name: 'closeOnClickModal', type: 'boolean', default: 'true', description: '点击遮罩是否关闭' },
    { name: 'showFooter', type: 'boolean', default: 'true', description: '是否显示底部按钮' },
    { name: 'confirmText', type: 'string', default: '"确定"', description: '确认按钮文字' },
    { name: 'cancelText', type: 'string', default: '"取消"', description: '取消按钮文字' },
    { name: 'confirmLoading', type: 'boolean', default: 'false', description: '确认按钮 loading 状态' },
    { name: 'dialogSchema', type: 'PartialWidget[]', default: '—', description: '弹窗内部的表单 schema（由 action 传入）' },
    { name: 'initialData', type: 'FormData', default: '—', description: '弹窗打开时的预填数据' },
  ],
  events: [
    { name: 'update:modelValue', description: '弹窗可见性变化', params: 'value: boolean' },
    { name: 'confirm', description: '点击确认按钮，携带弹窗内表单数据', params: 'data: FormData' },
    { name: 'cancel', description: '点击取消按钮', params: '—' },
    { name: 'close', description: '弹窗关闭（点击 X 或遮罩）', params: '—' },
  ],
  slots: [
    { name: 'default', description: '弹窗主体内容（dialogSchema 为空时生效）' },
    { name: 'footer', description: '底部操作区（showFooter 为 false 时隐藏）' },
  ],
  exposes: [],
  schemas: [
    // ---- Example 1: 基础用法（内部模式） ----
    {
      title: '基础用法 — 通过按钮打开弹窗',
      description:
        '按钮配置 dialog 类型动作，点击后由 FormGrid 内部管理弹窗。' +
        '弹窗内的表单数据独立于主表单，确认后通过 action 事件回传。',
      schema: [
        {
          type: 'grid-row',
          children: [
            {
              type: 'grid-col',
              span: 24,
              align: 'center',
              children: [
                {
                  type: 'toolbar-buttons',
                  buttons: [
                    {
                      text: '打开弹窗',
                      buttonType: 'primary',
                      actions: [
                        {
                          type: 'dialog',
                          dialogTitle: '基础弹窗示例',
                          dialogWidth: '600px',
                          dialogSchema: [
                            {
                              type: 'grid-row',
                              children: [
                                { type: 'grid-col', span: 6, label: '姓名', align: 'center' },
                                {
                                  type: 'grid-col',
                                  span: 18,
                                  children: [
                                    { type: 'input', field: 'dlg_name', props: { placeholder: '请输入姓名' } },
                                  ],
                                },
                              ],
                            },
                            {
                              type: 'grid-row',
                              children: [
                                { type: 'grid-col', span: 6, label: '部门', align: 'center' },
                                {
                                  type: 'grid-col',
                                  span: 18,
                                  children: [
                                    {
                                      type: 'select',
                                      field: 'dlg_dept',
                                      options: [
                                        { label: '技术部', value: 'tech' },
                                        { label: '产品部', value: 'product' },
                                        { label: '市场部', value: 'marketing' },
                                      ],
                                      props: { placeholder: '请选择部门' },
                                    },
                                  ],
                                },
                              ],
                            },
                            {
                              type: 'grid-row',
                              children: [
                                { type: 'grid-col', span: 6, label: '备注', align: 'center' },
                                {
                                  type: 'grid-col',
                                  span: 18,
                                  children: [
                                    { type: 'textarea', field: 'dlg_remark', props: { placeholder: '请输入备注' } },
                                  ],
                                },
                              ],
                            },
                          ],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },

    // ---- Example 2: 数据预填弹窗（外部模式） ----
    {
      title: '数据预填 — 打开弹窗并带入初始数据',
      description:
        '通过 dialog action 的 initialData 预填弹窗表单，适合编辑已有数据场景。' +
        '此示例使用 external 模式，弹窗由 PreviewView 在页面顶层渲染。',
      dialogMode: 'external',
      schema: [
        {
          type: 'grid-row',
          children: [
            {
              type: 'grid-col',
              span: 24,
              align: 'center',
              children: [
                {
                  type: 'toolbar-buttons',
                  buttons: [
                    {
                      text: '编辑用户信息',
                      buttonType: 'primary',
                      actions: [
                        {
                          type: 'dialog',
                          dialogTitle: '编辑用户信息',
                          dialogWidth: '650px',
                          dialogSchema: [
                            {
                              type: 'grid-row',
                              children: [
                                { type: 'grid-col', span: 6, label: '用户名', align: 'center' },
                                {
                                  type: 'grid-col',
                                  span: 18,
                                  children: [
                                    { type: 'input', field: 'prefill_name', props: { placeholder: '请输入用户名' } },
                                  ],
                                },
                              ],
                            },
                            {
                              type: 'grid-row',
                              children: [
                                { type: 'grid-col', span: 6, label: '邮箱', align: 'center' },
                                {
                                  type: 'grid-col',
                                  span: 18,
                                  children: [
                                    { type: 'input', field: 'prefill_email', props: { placeholder: '请输入邮箱' } },
                                  ],
                                },
                              ],
                            },
                            {
                              type: 'grid-row',
                              children: [
                                { type: 'grid-col', span: 6, label: '角色', align: 'center' },
                                {
                                  type: 'grid-col',
                                  span: 18,
                                  children: [
                                    {
                                      type: 'radio',
                                      field: 'prefill_role',
                                      options: [
                                        { label: '管理员', value: 'admin' },
                                        { label: '普通用户', value: 'user' },
                                        { label: '访客', value: 'guest' },
                                      ],
                                    },
                                  ],
                                },
                              ],
                            },
                          ],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },

    // ---- Example 3: 弹窗确认流程（动作链联动） ----
    {
      title: '弹窗确认流程 — 主表单 + 弹窗 + 动作链',
      description:
        '演示主表单填写 → 点击按钮打开确认弹窗 → 弹窗内补充信息 → 确认后触发 API 调用的完整流程。' +
        '按钮使用动作链：dialog → confirm(确认提示) → validate → submit。',
      schema: [
        {
          type: 'grid-row',
          children: [
            { type: 'grid-col', span: 4, label: '申请标题', align: 'center' },
            {
              type: 'grid-col',
              span: 8,
              children: [
                { type: 'input', field: 'flow_title', props: { placeholder: '请输入申请标题' } },
              ],
            },
            { type: 'grid-col', span: 4, label: '申请金额', align: 'center' },
            {
              type: 'grid-col',
              span: 8,
              children: [
                { type: 'number', field: 'flow_amount', props: { placeholder: '请输入金额', min: 0 } },
              ],
            },
          ],
        },
        {
          type: 'grid-row',
          children: [
            { type: 'grid-col', span: 4, label: '申请理由', align: 'center' },
            {
              type: 'grid-col',
              span: 20,
              children: [
                { type: 'textarea', field: 'flow_reason', props: { placeholder: '请输入申请理由' } },
              ],
            },
          ],
        },
        {
          type: 'grid-row',
          children: [
            {
              type: 'grid-col',
              span: 24,
              align: 'center',
              children: [
                {
                  type: 'toolbar-buttons',
                  buttons: [
                    {
                      text: '提交申请',
                      buttonType: 'primary',
                      actions: [
                        {
                          type: 'dialog',
                          dialogTitle: '确认信息',
                          dialogWidth: '600px',
                          dialogSchema: [
                            {
                              type: 'grid-row',
                              children: [
                                { type: 'grid-col', span: 8, label: '审批意见', align: 'center' },
                                {
                                  type: 'grid-col',
                                  span: 16,
                                  children: [
                                    { type: 'textarea', field: 'flow_comment', props: { placeholder: '请输入审批意见' } },
                                  ],
                                },
                              ],
                            },
                          ],
                        },
                        { type: 'confirm', confirm: '确认提交该申请？' },
                        { type: 'validate' },
                        { type: 'submit' },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },

    // ---- Example 4: 跨组件弹窗联动 ----
    {
      title: '跨组件弹窗联动 — 表格行操作触发弹窗',
      description:
        '演示 search-list 组件的 rowActions 中 dialog 类型触发弹窗，' +
        '弹窗内展示行数据的详细信息表单。此示例使用 external 模式。',
      dialogMode: 'external',
      schema: [
        {
          type: 'grid-row',
          children: [
            {
              type: 'grid-col',
              span: 24,
              align: 'center',
              children: [
                {
                  type: 'toolbar-buttons',
                  buttons: [
                    {
                      text: '查看详情（弹窗联动）',
                      buttonType: 'primary',
                      actions: [
                        {
                          type: 'dialog',
                          dialogTitle: '详情查看',
                          dialogWidth: '700px',
                          dialogSchema: [
                            {
                              type: 'grid-row',
                              children: [
                                { type: 'grid-col', span: 8, label: '订单编号', align: 'center' },
                                {
                                  type: 'grid-col',
                                  span: 16,
                                  children: [
                                    { type: 'input', field: 'link_orderId', props: { placeholder: 'ORD-2024-001', disabled: true } },
                                  ],
                                },
                              ],
                            },
                            {
                              type: 'grid-row',
                              children: [
                                { type: 'grid-col', span: 8, label: '客户名称', align: 'center' },
                                {
                                  type: 'grid-col',
                                  span: 16,
                                  children: [
                                    { type: 'input', field: 'link_customer', props: { placeholder: '张三' } },
                                  ],
                                },
                              ],
                            },
                            {
                              type: 'grid-row',
                              children: [
                                { type: 'grid-col', span: 8, label: '订单状态', align: 'center' },
                                {
                                  type: 'grid-col',
                                  span: 16,
                                  children: [
                                    {
                                      type: 'select',
                                      field: 'link_status',
                                      options: [
                                        { label: '待处理', value: 'pending' },
                                        { label: '处理中', value: 'processing' },
                                        { label: '已完成', value: 'done' },
                                      ],
                                    },
                                  ],
                                },
                              ],
                            },
                          ],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
        // 下方联动展示区：显示弹窗操作的结果提示
        {
          type: 'grid-row',
          children: [
            {
              type: 'grid-col',
              span: 24,
              children: [
                {
                  type: 'title',
                  props: { text: '点击上方按钮，弹窗将在页面顶层渲染（external 模式），实现跨组件弹窗联动效果', level: 4 },
                },
              ],
            },
          ],
        },
      ],
    },
  ],
}

export default doc
