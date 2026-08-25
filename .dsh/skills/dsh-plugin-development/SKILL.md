---
name: dsh-plugin-development
description: Use when creating, updating, packaging, installing, or validating a DeepSeek Harness plugin, bundle, client extension, profile composition, or project-local DSH skill.
---

# DSH插件开发

## 核心原则

先确认当前安装版本和真实接口，再写代码。DSH处于开发者预览阶段，旧会话、旧示例或`master`文档都不能替代本机版本证据。

## 开始前

1. 读取目标PRD、AGENTS.md和当前工作区，不吸收无关文件。
2. 运行`dsh --version`、`node --version`、`pnpm --version`，记录兼容基线。
3. 读取当前`@deepseek-ai/dsh/package.json`及目标Profile中的已安装插件示例。
4. 再查官方DeepSeek Harness开发文档；若官方`master`与本机包冲突，以匹配当前安装版本的实际导出和运行结果为准。
5. 建立目标契约：本轮贡献Host、Client、Bundle、Profile还是Skill，以及明确不做什么。

## 架构选择

- **Bundle不是Profile**：Bundle是带`dsh.bundle.patch`的可安装npm包；Profile是`$DSH_HOME/profiles/<name>`中的有序Bundle组合，由`dsh plugin`维护。
- Host模块通过Cordis`apply(ctx)`注册服务或工具；使用服务前声明`inject`。
- Web Client通过`dsh.client`声明入口和宿主生命周期锚点；不复制DSH项目树、编辑器、聊天或路由。若固定版本缺少右栏布局API，只允许使用下述版本化最小布局适配器例外。
- Web Client的`./client`必须指向构建后的`lib/client.js`；浏览器产物必须用`window.__ModuleLoader__.load`注册插件ID的lazy-CJS工厂。原始ESM端点返回200不等于Client已加载。
- 项目Skill放在`<projectRoot>/.dsh/skills/<name>/SKILL.md`，名称使用kebab-case。

## 实施流程

1. 先写一个会因目标能力缺失而失败的测试，并确认红灯原因。
2. 实现最小Host行为；纯逻辑与Cordis适配分离。
3. 如需要Client，必须先调用`Slots.listSubTree`不带`root`获取完整 live Slot 树，再对候选Slot调用`Slots.listSubTree`带精确`root`查询；同一行记录purpose、kind、scope、options、standard props、owner props、current occupants、replacement risk和descendants。
4. 完成`package.json`、`cordis.patch.yml`和导出清单；本地`link:`开发前在插件目录执行`pnpm install`与`pnpm run build`，不要手写或覆盖用户Profile清单。
5. 使用工作区内隔离的`DSH_HOME`安装和启动测试Profile；不得修改用户现有Profile。
6. 依次验证：单元/合同测试、Bundle安装、Host加载、Client模块提供、浏览器实际渲染与控制台、Skill发现。每层只声明本层证据。

## Slot硬边界

- 禁止猜测Slot options；只有精确`root`查询返回的协议和属性可以进入实现。
- 禁止默认注册结构单槽：`root`、`sidebar`、`conversation`、`details`，因为这些注册会替换DSH原生界面及其后代Slot。
- `conversation.input.right`是当前入口的`list`列表协议；`shell.overlay`是工作台的`list`增量协议，但只作为Portal面板的生命周期锚点。
- `details`是`single`单槽，禁止绿洲工作台注册，也不得用`openDetails`借用其几何；真实浏览器已证明该调用会产生遮罩并阻断Overlay交互。
- 当前固定版本允许一个单写入者最小布局适配器：Portal宿主挂到`document.body`；normal仅给`#root`设置插件自有所有权属性，并通过命名空间CSS变量推挤360px；expanded只读测量原生侧栏边界且清除推挤；hidden、异常、DOM失配、HMR与卸载必须清除全部自有属性、变量、样式和Portal。
- 除该适配器预算内的自有节点/属性/变量外，禁止写入DSH DOM、复制AppFrame、修改原生class或内容、依赖构建哈希类名，或用相似图标替代已确认的Codex SVG。发现其他布局所有者或结构不唯一时必须fail-closed，不能覆盖。

## 项目边界

- Dify和收费管理作为既有稳定外部能力，本Skill不规划、修改或重新验收其内部实现。
- 插件只保留调用现有接口、展示任务状态、获取产物和本地安全写回的集成边界。
- 未经明确授权，不写用户`~/.dsh/profiles`、不安装到真实Profile、不发布npm包。
- 任何文件写回必须限定在用户确认的项目根目录，禁止静默覆盖。

## 详细参考

需要清单示例、官方链接、Windows隔离命令或当前兼容基线时，读取[references/official-contracts.md](references/official-contracts.md)。
