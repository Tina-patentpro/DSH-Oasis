# DSH-better-sidebar 布局参考记录

- 仓库：https://github.com/omdsh-dev/DSH-better-sidebar
- 审阅日期：2026-08-24
- 审阅时 main：`4631a02`（执行证据只以该快照及本机 DSH `0.1.1-rc.2` 为参考，不自动跟随 main）
- 许可证：MIT

## 只借鉴

- 独立面板宿主/Portal；
- `#root margin-right` 布局推挤及 `width: calc(...)` 溢出保护；
- 面板展开、隐藏、卸载时清理 CSS 变量；
- DSH DOM 结构和几何检测；
- 窄屏自动使用全宽 expanded；
- 插件异常、DOM 重建和卸载时恢复原布局。

## 明确不引入

- 不依赖或安装 `dsh-better-sidebar`；
- 不复制其工作台框架；
- 不引入文件、编辑器、终端、Git、浏览器、底部面板、拖拽分栏、外部插件注册或 Agent 工具；
- 不复制其业务状态、Host 路由或重依赖。

本项目对上述布局思想进行最小独立实现。若执行中需要复用实质代码片段，必须在对应文件保留来源及 MIT 许可说明。

