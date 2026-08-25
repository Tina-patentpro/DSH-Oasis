# 第一周：DSH插件技术验证记录

日期：2026-08-23  
需求基线：`PRD-DSH免费工作台.md` V1.1  
兼容基线：`@deepseek-ai/dsh 0.1.1-rc.2`、Node.js `22.19.0`、pnpm `11.19.0`

## 1. 目标合同

本周只验证以下最小闭环：

1. 先形成可复用、可测试的 DSH 插件开发 Skill；
2. 一个可由 Profile 安装和组合的 Bundle；
3. 一个实际加载的 Host 工具；
4. 一个构建为 DSH lazy-CJS、并在浏览器会话输入区实际渲染的 Client 入口；
5. 一个用于通用技术研发与中国发明专利任务受理的项目 Skill；
6. 全部运行验证限定在工作区内的隔离 `DSH_HOME`。

明确不做：Dify 内部工作流、收费管理内部实现、真实用户 Profile 改动、npm 发布、完整工作台页面和正式服务 API 对接。

## 2. 交付物

| 交付物 | 位置 | 作用 |
|---|---|---|
| 插件开发 Skill | `.dsh/skills/dsh-plugin-development` | 固化版本优先、Bundle/Profile、Client 构建和隔离验证规则 |
| 研发/专利受理 Skill | `.dsh/skills/oasis-rd-intake` | 形成证据分层、任务合同和人工复核边界 |
| Bundle | `packages/oasis-professional-service` | 贡献 Host patch 和 Web Client 声明 |
| Host 工具 | `src/index.js` | 注册 `oasis_workbench_status` |
| Client 源码/产物 | `src/client.js`、`lib/client.js` | 向 `conversation.input.right` 注册“研发 / 专利”入口 |
| 隔离启动器 | `scripts/dsh-isolated.cmd` | 把运行状态限定到项目 `.dsh-test` |
| Loopback API 工具 | `scripts/dsh-local-api-smoke.mjs` | 查询隔离 DSH 的运行时清单 |

## 3. 关键技术结论

### 3.1 Bundle 与 Profile

Bundle 通过 `package.json#dsh.bundle.patch`贡献 Cordis 配置层；Profile 通过 `dsh.profile.bundles`排列 Bundle。Profile 清单由 `dsh plugin`维护，插件代码不手写用户 Profile。

### 3.2 Host

Host 使用 Cordis `apply(ctx)`和`inject = ['tools']`，通过`@deepseek-ai/dsh-tools#defineTool`注册工具。状态纯函数与 Cordis 适配分离，可独立测试。

### 3.3 Client

`./client`不能直接指向原始 ESM。DSH 浏览器 Loader 要求`lib/client.js`调用`window.__ModuleLoader__.load`并注册准确包名。HTTP 200 只能证明文件可提供，浏览器快照和控制台才证明 Loader 接受且 UI 已渲染。

### 3.4 本地 link 依赖

`dsh plugin add ./package`生成`link:`依赖。Host 从插件真实路径解析模块，因此本地 checkout 必须先执行`pnpm install`；Client 必须先执行`pnpm run build`。

## 4. RED→GREEN记录

| RED | 根因 | 最小修复 | GREEN证据 |
|---|---|---|---|
| Skill 文件不存在 | 未先建立统一制作方法 | 新建开发 Skill 和官方接口参考 | DSH 官方文件系统 Provider 发现并加载 |
| 隔离命令落到用户 Profile | 裸 `dsh` 命令解析未保持预期隔离路径 | 包装器显式调用已核验 npm cmd shim | Profile 初始化到项目 `.dsh-test` |
| Host 找不到 `@deepseek-ai/dsh-tools` | `link:` checkout 无本地依赖 | 在插件目录安装 peer/dev 依赖 | Web Host 持续启动 |
| Client 200 但页面“Failed to load plugins” | 提供的是原始 ESM，未注册 ModuleLoader | tsdown 生成 lazy-CJS `lib/client.js` | 浏览器渲染目标按钮，控制台错误为0 |

## 5. 验证证据

| 层级 | 命令或观察 | 结果 |
|---|---|---|
| 版本 | `dsh --version` | `0.1.1-rc.2` |
| 构建 | `pnpm run build` | tsdown 生成 `lib/client.js` 和 source map，退出0 |
| 自动测试 | README中的`node --test ...` | 8项测试通过，退出0 |
| 隔离路径 | `scripts\dsh-isolated.cmd --print-home` | 指向本项目 `.dsh-test` |
| Bundle | 隔离`dsh plugin add`与`--dump-config` | Profile 列出 Bundle，组合配置出现`# == oasis-professional-service` |
| Host | 隔离 Web Profile 启动 + Host 工具测试 | 插件树启动；工具注册、执行和渲染合同通过 |
| HTTP Client | `/plugins/oasis-professional-service/client.js` | 200，返回 ModuleLoader lazy-CJS 产物 |
| 浏览器 | Playwright真实页面 | 会话输入区显示“打开技术研发与中国发明专利工作台”按钮 |
| 浏览器控制台 | Playwright `console` | Errors 0，Warnings 0；仅1条浏览器 verbose 提示 |
| Skill运行时 | 隔离`skill.list` | 返回`dsh-plugin-development`和`oasis-rd-intake` |

## 6. 仍未完成

1. “研发 / 专利”按钮目前只发出稳定的打开事件，尚无完整工作台面板。
2. 尚未实现对既有专业服务 API 的适配层、鉴权、任务状态和产物下载。
3. 尚未实现安全写回、哈希/血缘、冲突版本名和人工确认门。
4. 尚未形成可分发的正式绿洲 Profile；当前 Profile 仅为隔离测试状态。
5. 尚未开展软件/AI、电子嵌入式、机械三个基准案例的端到端验收。
6. Codex Skill 的 Python `quick_validate.py`因当前运行时缺少`PyYAML`未执行成功；DSH自身 frontmatter 解析与发现已通过。

## 7. 下一步建议

第二周优先实现本地工作台壳与只读状态模型：入口打开/关闭、任务类型选择、材料清单、证据状态、人工门和本地产物占位；随后再接入既有专业服务 API 适配层。继续保持 Dify 与收费系统为外部既有能力，不进入插件内部重构。

---

## 8. 2026-08-24 第一周补充结果（追加，不改写历史）

上一节所述“按钮只派发打开事件”已被补充实现替代：Client现在以共享Workspace store直接驱动 `shell.overlay` 右栏，支持hidden / normal / expanded、多个任务页、两种工作流选择以及选择后的材料/结果骨架。原 `window CustomEvent` 通道已删除。

补充验证还关闭了RPC假绿灯、固定npm shim、`benchmarkDomains`错误承诺、真实Cordis Tools注册/调用、clean build和pack白名单等缺口。浏览器真实RED进一步证明调用 `ctx.layout.openDetails()` 会产生遮罩并阻断Overlay交互，因此最终normal模式使用插件自有360px右轨，不占用或借用原生 `details`。

当前包测试为30项通过、clean build退出0、pack dry-run退出0；隔离Host、RPC、Skill发现、Client 200、两页/工作流/三状态及A/A/B项目切换浏览器场景均有证据，真实Profile前后哈希一致。Codex `quick_validate.py` 已用本机现有Python与UTF-8模式执行，两个项目Skill均返回 `Skill is valid!`，没有安装PyYAML。由此关闭了第6节历史清单中的“无完整面板”和“quick_validate未成功”两项；其余外部适配、写回、正式Profile和专业案例仍属于后续周范围。

官方Client Inspect Provider已返回 `Slots.listSubTree` 无root全树与 `conversation.input.right`、`shell.overlay`、`details` 三个精确root；两个绿洲occupant均active，原生`details`未被绿洲占用。当前A/A/B浏览器回归退出0，失败诊断Home、npm临时缓存和已知验证端口监听均清零。第一周补充门已关闭，详细裁决见 `docs/第一周-补充工作验证报告.md`。
