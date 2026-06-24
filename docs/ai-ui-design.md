# AI 界面设计方案（2026-05-29 定稿）

两种模式：侧边栏面板 + 独立全页

## 侧边栏面板（嵌入 Editor/Flow）

- 400px 宽，命令行对话风格
- Header：固定智能体（不可切换）+ DeepSeek 模型显示
- 浮动输入面板：圆角 10px、白底阴影，底部行左提示右智能体名
- AI 消息标签显示智能体角色（Editor/Flow），不是 "AI"

## 独立全页（ai-app 独立访问）

- 1200×800 三栏：左侧对话列表 240px + 中间对话 + 右侧预览 400px
- 顶部栏：Logo、导航、新对话按钮、DeepSeek 模型徽章
- 智能体选择在输入框底部行右对齐（select 下拉，可切换）
- 浮动输入面板：圆角 12px

## 主题令牌

- 主色：#0060A2（非紫色）
- 文字：#333/#666/#999
- 边框：#D5DDE3/#EBEDF3
- 背景：#F5F6FA/#F5F7FA/#FAFAFA
- 字体：Microsoft YaHei, PingFang SC

## 设计文件

- `docs/designs/ui/ai/sidebar.html`
- `docs/designs/ui/ai/standalone.html`
