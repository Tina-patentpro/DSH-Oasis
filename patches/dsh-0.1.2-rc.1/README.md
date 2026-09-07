# 原生 Markdown 资源策略补丁

适用 `@deepseek-ai/dsh-client-ui-primitives@0.1.2-rc.1` 和 `@deepseek-ai/dsh-web-frontend@0.1.2-rc.1`，精确输入哈希分别见 `baseline.json`、`web-baseline.json`。只装配项目隔离候选；不修改全局安装或共享依赖缓存。补丁属于通用展示安全能力，不包含绿洲业务逻辑。

## 公开合同

- `MarkdownText` 新增可选布尔属性 `allowRemoteImages`，默认 `true`，保留原生调用方行为。
- 明确传 `false` 时，内联和引用图片均仅显示替代文字；不生成图片元素。原生 HTML 转义、链接协议限制与 Markdown 语义渲染保持不变。
- `MarkdownText.resourcePolicyVersion === 1` 表示该精确能力可用。绿洲只有核对此能力后才使用富文本；否则保留安全纯文本，不静默启用旧图片路径。
- 禁图时每次更新采用现有 settled parser，避免流式缓存中遗留图片；此处不新建解析器。当前文字预览只使用非流式内容。
- 不提供文件 resolver，不把资料当成可执行指令。普通外链仍需用户主动点击；这不授权任何后台资源加载。

## 装配与验证

仓库根目录（cmd）：

1. `node scripts\assemble-stage3-desktop.mjs`：目标候选必须不存在；读取固定系统安装原件，创建全新隔离候选，同时应用 Desktop 框架补丁与本补丁。拒绝哈希漂移、重定向和覆盖已有候选。
2. `node --test tests\native-markdown-policy.test.mjs`：对该候选的真实原生组件做 React 渲染测试，CSS 仅在 Node 测试中空载；并非自制渲染器或浏览器网络证据。
3. Web 的 Vite 入口内嵌了组件实现，必须同步应用 `patchMarkdownWebBundle`；仅修改组件 npm 包不足以更新浏览器。`scripts\assemble-stage3-web-markdown.mjs` 核对精确资源与入口 HTML，创建新的内容哈希命名资源并更新候选入口，避免沿用旧浏览器缓存。原资源保留，系统安装原件不改；全量装配入口已包含此步。
4. `node --test tests\web-markdown-policy.test.mjs`：检查固定 Web 构建中的同一显式参数、两个图片路径和未知/重复补丁拒绝；不是源码重新构建的证明。

本补丁包的已安装上游只有 `lib/index.js` 和 CSS，没有随包 TypeScript 声明/源码映射。交付保留精确替换和原件哈希，不伪造上游源码构建证据。

2026-09-07 隔离 Desktop 实际加载新 Web 入口后，统一输入和双来源结果的标题、加粗、表格、公式及禁图/HTML 转义已验证。两来源保存文件通过 Sidebar 安全页打开，测试资源请求为零；重开后安全页策略仍保留。具体命令、产物与剩余视觉/模式验收边界见阶段 3 计划，不能用此局部结果宣称整阶段完成。
