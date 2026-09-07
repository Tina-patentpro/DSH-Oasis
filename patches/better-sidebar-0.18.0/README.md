# Better Sidebar 0.18.0：安全文件预览

Revision：`oasis-safe-file-preview-1`。输入文件 SHA-256 见 `baseline.json`。

本补丁为 Sidebar 增加通用的显式安全选项，不包含绿洲任务、产物或审核逻辑：

- `features` 增加 `safeFilePreview`；`openFile(scope, path, title?, { safePreview: true })` 打开安全文件页。
- 安全页使用独立 ID 和去重键，`meta.safePreview` 随原生页签持久化；不会合并到已打开的普通预览页。
- `matchFileViewer` 在安全模式仅允许已有 Markdown/代码文本读取器；HTML、图片、自定义资源读取器不自动接管。
- Markdown 使用原生 `MarkdownText` 的 `resourcePolicyVersion === 1` 与 `allowRemoteImages:false`；能力缺失时显示纯文本。安全页不进入 raw HTML、Mermaid 或图片地址重写路径。编辑仍使用原生编辑器。
- 普通文件打开的默认行为不变。当前文件可编辑，不代表绿洲固定审核版本；此区别由调用方展示。

`safe-file-preview.mjs` 同步精确修改分发包的源码与编译文件。输入不匹配、重复或已修补时拒绝，不宣称重新构建了上游。

装配：仓库根目录使用 cmd 执行 `node scripts\assemble-stage3-desktop.mjs`，只创建全新隔离 Desktop；其内部调用 Sidebar 装配。对尚未修补的隔离候选也可执行 `node scripts\assemble-stage3-sidebar.mjs`。两者均不改系统安装或原始 Profile 包，拒绝覆盖未知内容。

验证：`node --test tests\sidebar-safe-file.test.mjs` 在实际编译服务/Store 中检查安全与普通页分离、重复打开、跨 scope 及元数据保留。原生渲染器另见 `tests/native-markdown-policy.test.mjs`。这些测试不是 Desktop 浏览器验收；实际运行证据记入阶段 3 计划。
