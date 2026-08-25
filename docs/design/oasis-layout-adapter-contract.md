# Oasis 最小布局适配器合同

## 支持基线

- DSH：`0.1.1-rc.2`
- React / React DOM：`18.2.0`
- 布局合同：`dsh-0.1.1-rc.2`

## 结构探测

normal 启用前必须唯一识别：`#root`、根 Slot、`[data-shell-overlay]`、其 AppFrame、`[data-slot="sidebar"]` 和 `[data-slot="conversation"]`，并证明这些节点属于同一 AppFrame。禁止使用哈希类名和 `nth-child`。

## 状态模型

- requested：`hidden | normal | expanded`
- effective：`hidden | normal | expanded`
- status：`idle | probing | active | narrow-expanded | capacity-expanded | incompatible | conflict | faulted`

优先级：hidden；结构/所有权门；窄屏 `<1024px`；预计中栏 `<520px`；用户 expanded；normal。

## 写入与所有权

- Portal：`[data-oasis-panel-portal]`
- Style：`[data-oasis-layout-style]`
- Root owner：`data-oasis-layout-owner="oasis-professional-service"`
- Contract：`data-oasis-layout-contract="dsh-0.1.1-rc.2"`
- Variable：`--oasis-right-rail-width`

只有布局适配器可以写这些值。已存在同名或外部右栏所有者时必须冲突关闭，不得覆盖。

## normal 后置验证

- `#root` 实际宽度缩小量与面板宽度相符；
- `#root.right` 与面板左边界误差不超过 2px；
- 原生左栏 left/width 变化不超过 1px；
- conversation 右边界不进入面板；
- 页面不产生横向滚动。

任一失败立即恢复布局并停止 normal。

## 生命周期

hidden、expanded、DOM 失配、Portal 丢失、渲染异常、HMR 和 dispose 必须清除推挤。恢复函数幂等，负责 Observer、监听器、rAF、属性、变量、style 和 Portal 宿主。

