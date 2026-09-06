---
name: dsh-plugin-development
description: Use when creating, updating, packaging, installing, or validating a DeepSeek Harness plugin, bundle, client extension, profile composition, or project-local DSH skill.
---

# DSH插件开发

## 核心原则

先确认当前安装版本和真实接口，再写代码。DSH处于开发者预览阶段，旧会话、旧示例或`master`文档都不能替代本机版本证据。

本项目当前固定组合为：全局 DSH `0.1.2-rc.1`、anywhere-labs Desktop `2.0.5`、Desktop 内置 DSH `0.1.2-rc.1`、Better Sidebar `0.18.0`。不得自动追随 `latest`，也不得用全局 CLI 版本替代 Desktop 内置运行时证据。

## 开始前

1. 读取目标PRD、AGENTS.md和当前工作区，不吸收无关文件。
2. 运行`dsh --version`、`node --version`、`pnpm --version`，记录兼容基线。
3. 读取当前`@deepseek-ai/dsh/package.json`及目标Profile中的已安装插件示例。
4. 再查官方DeepSeek Harness开发文档；若官方`master`与本机包冲突，以匹配当前安装版本的实际导出和运行结果为准。
5. 建立目标契约：本轮贡献Host、Client、Bundle、Profile还是Skill，以及明确不做什么。

## 架构选择

- **Bundle不是Profile**：Bundle是带`dsh.bundle.patch`的可安装npm包；Profile是`$DSH_HOME/profiles/<name>`中的有序Bundle组合，由`dsh plugin`维护。
- Host模块通过Cordis`apply(ctx)`注册服务或工具；使用服务前声明`inject`。
- Web Client通过`dsh.client`声明入口；不复制DSH项目树、编辑器、聊天或路由。当前产品主路径由 Better Sidebar 的公开服务承载，该主路径不得写宿主 DOM 或建立第二个布局所有者；旧独立面板只保留历史兼容，不再扩展并在固定组合装配前释放。
- Web Client的`./client`必须指向构建后的`lib/client.js`；浏览器产物必须用`window.__ModuleLoader__.load`注册插件ID的lazy-CJS工厂。原始ESM端点返回200不等于Client已加载。
- 项目Skill放在`<projectRoot>/.dsh/skills/<name>/SKILL.md`，名称使用kebab-case。

## 实施流程

1. 先写一个会因目标能力缺失而失败的测试，并确认红灯原因。
2. 实现最小Host行为；纯逻辑与Cordis适配分离。
3. 如需要Client，优先复用固定包类型定义、已有 live Slot 证据和目标 Desktop 实际渲染，只查询本次入口涉及的节点；不得为此新建永久诊断器。候选 Slot 仍须记录 purpose、kind、scope、options、occupants 与 replacement risk，未经证实不得注册。
4. 完成`package.json`、`cordis.patch.yml`和导出清单；本地`link:`开发前在插件目录执行`pnpm install`与`pnpm run build`，不要手写或覆盖用户Profile清单。
5. 使用工作区内隔离的`DSH_HOME`安装和启动测试Profile；不得修改用户现有Profile。
6. 依次验证：单元/合同测试、Bundle安装、Host加载、Client模块提供、浏览器实际渲染与控制台、Skill发现。每层只声明本层证据。

## Slot硬边界

- 禁止猜测Slot options；只有精确`root`查询返回的协议和属性可以进入实现。
- 禁止默认注册结构单槽：`root`、`sidebar`、`conversation`、`details`，因为这些注册会替换DSH原生界面及其后代Slot。
- `conversation.input.right`是当前入口的`list`列表协议；`settings.section`由 `@deepseek-ai/dsh-client-ui-settings` 提供，用于绿洲原生设置页；`shell.overlay`仍是`list`增量协议，只承载 Workspace 上下文桥接和历史兼容生命周期，在固定 Sidebar 路径中不渲染独立面板或接管布局。
- `details`是`single`单槽，禁止绿洲工作台注册，也不得用`openDetails`借用其几何；真实浏览器已证明该调用会产生遮罩并阻断Overlay交互。
- 当前固定组合由 Better Sidebar `0.18.0` 作为唯一右栏布局所有者；绿洲只调用其 `registerTab`、定向 `openTab`、状态订阅和生命周期接口。禁止 `querySelector`、`MutationObserver`、模拟点击、私有 store、哈希 class 或 `#root` 样式接管。
- 若 `targetedOpen` 等必需 capability 缺失，只禁用受影响动作并明确提示；不得退化为无 scope 打开或抢占原生结构单槽。

## 项目边界

- Dify和收费管理作为既有稳定外部能力，本Skill不规划、修改或重新验收其内部实现。
- 插件只保留调用现有接口、展示任务状态、获取产物和本地安全写回的集成边界。
- 未经明确授权，不写用户`~/.dsh/profiles`、不安装到真实Profile、不发布npm包。
- 任何文件写回必须限定在用户确认的项目根目录，禁止静默覆盖。
- 业务 Skill 的普通本地调用若经过原生 Skill 工具，其工具结果会包含完整 `content`，现有客户端还可展开查看该结果；因此“用户可用但普通产品路径不可取得正文”不能仅靠隐藏目录、`userInvocable=false`或 scope 达成。未通过 G-SKILL 前只允许非秘密样本和静态契约核对，不安装真实私有 Skill。

## 第三方布局插件兼容门禁

- 关闭布局兼容结论前，必须只读枚举目标Profile的真实Bundle组合；精简隔离Profile的绿色结果不能替代目标组合证据。
- 第三方布局插件提供公开服务时，优先使用其公开注册与生命周期接口；禁止通过私有DOM、构建哈希class、模拟点击或内部store实现所谓兼容。
- 当前产品基线必须在精确 Better Sidebar `0.18.0` 中验证；历史独立面板只作兼容读取路径，不是新产品主路径。
- 固定版 Sidebar 提供 `registerTab`、`openTab`、`openFile`、`getSnapshot`、`subscribeState`、`updateTab`；运行前仍按 `features` 检查 `targetedOpen` 等必需 capability。
- “文件变动”和“终端”由 Better Sidebar 自己的原生设置 `tabsEnabled.git=false`、`tabsEnabled.terminal=false` 管理；绿洲插件不得复制这两个设置或删除 Sidebar 代码。
- 未取得有效公开服务时必须 fail-closed，不得让两个布局所有者同时存在。
- 隔离Profile不得包含解析到真实Profile的junction、symlink或其他reparse target；兼容验证前后仍需对真实Profile做强基线比较。

## 详细参考

需要清单示例、官方链接、Windows隔离命令或当前兼容基线时，读取[references/official-contracts.md](references/official-contracts.md)。
