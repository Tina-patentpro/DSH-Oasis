# DSH插件官方接口参考

核验日期：2026-09-06
当前项目基线：全局 `@deepseek-ai/dsh 0.1.2-rc.1`、anywhere-labs Desktop `2.0.5`、Desktop 内置 DSH `0.1.2-rc.1`、Better Sidebar `0.18.0`。Node.js 与 pnpm 以每次执行的工具链预检为准。

历史基线：2026-08-25 曾按 `0.1.1-rc.2` 核验；下文明确标为历史的哈希仅用于追溯，不能作为当前合同。

## 证据优先级

1. 本机当前安装包的`package.json`、导出和实际隔离运行结果；
2. DeepSeek官方仓库中与当前版本一致的源码或文档；
3. 官方`master`教程，仅作候选接口，必须由当前版本验证；
4. 第三方插件仅作兼容示例，不能定义官方合同。

## 官方入口

- 首个插件：https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/user/develop/basic/index.md
- 工具注册：https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/user/develop/basic/tool.md
- 插件配置：https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/user/develop/basic/config.md
- 打包安装：https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/user/develop/basic/publish.md
- Client规则：https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/client/AGENTS.md
- Client外部包构建说明：https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/cookbook/adding-a-settings-card.zh.md
- Skill子系统：https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/subsystems/skills.md
- Storage子系统：https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/subsystems/storage.md
- JSON Storage backend：https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/storage/storage-json/README.md
- API Gateway与Connection：https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/api-gateway.md

## Bundle最小合同

```json
{
  "name": "example-dsh-plugin",
  "version": "0.1.0",
  "type": "module",
  "exports": {
    ".": "./src/index.js",
    "./client": "./lib/client.js"
  },
  "scripts": { "build": "tsdown --config tsdown.config.mjs" },
  "dsh": {
    "client": {
      "inject": ["@deepseek-ai/dsh-client-ui-conversation"],
      "platform": "web"
    },
    "bundle": {
      "patch": "./cordis.patch.yml"
    }
  }
}
```

`cordis.patch.yml`：

```yaml
- insert:
    - id: example-dsh-plugin
      name: example-dsh-plugin
```

Bundle通过`dsh.bundle`贡献配置层。Profile通过`dsh.profile.bundles`组合配置层；官方CLI教程要求使用`dsh plugin`维护Profile，不把二者混成一个包。

## Host Tool合同

Host插件导出`apply(ctx)`，需要工具注册表时导出`inject = ['tools']`，并用`@deepseek-ai/dsh-tools`的`defineTool()`声明参数、规范输出和执行函数。业务纯函数应放在无Cordis依赖的模块中，以便先做TDD。

## Domain Storage与Connection合同

固定 `0.1.2-rc.1` 组合继续使用 `ctx.storageDomain.open(spec)` 和调用方拥有的 Domain；调用方必须在卸载时关闭 Domain。Domain名、表名匹配`^[a-z][a-z0-9_]*$`，因此本项目使用`oasis_workbench`，不得使用含连字符的展示名。写入语义仍须以本轮实际包与定向测试为准，不把旧版观察自动外推。

Web Profile由DSH组合JSON backend。该backend为每个unit写人类可读JSON，并通过临时文件、fsync和原子rename提交；插件不得绕过Domain直接读写该文件。backend不提供跨进程锁或CAS，本项目只承诺单一DSH Host进程；禁止两个Host共享同一Storage根。

Host可用`ctx.connection.rpc.handle(channel, handler, { authority })`注册logical RPC channel，Client用`ctx.connection.rpc.call(channel, endpoint, payload, signal)`调用。本项目固定专用channel`/oasis-workbench`和`authority: 'loopback'`，不修改`@deepseek-ai/dsh-api-remotes`的固定能力集合。`RpcError`只使用DSH闭合集合；revision冲突属于成功响应中的业务union，不伪造新的transport错误码。payload必须在Host端严格校验，未知endpoint和额外字段返回`bad-request`。

## Workspace Registry合同

固定 `@deepseek-ai/dsh-workspace 0.1.2-rc.1` 通过`ctx.workspaceRegistry`提供Host侧Workspace实体。插件必须直接注入`workspaceRegistry`并按显式`workspaceId`查询，不得按Client传入的绝对路径、Host `cwd`、项目标题或同名目录猜测归属。

`Workspace.path`是在创建时经`fs.realpath`得到且保持稳定的canonical现有目录；`Workspace.status()`每次实时检查该目录，返回`ok`或`missing-dir`，不修改Workspace记录。`Workspace.sessionIds`由注册表按session header canonical cwd过滤。插件只能把`Workspace.path`作为项目文件安全检查的起点，仍须对每个用户相对路径执行越界、symlink/junction、文件类型和TOCTOU复检。

历史 `0.1.1-rc.2` 冻结证据（不可作为当前版本证明）：

| 文件 | SHA-256 |
|---|---|
| `node_modules/@deepseek-ai/dsh-workspace/package.json` | `0DBF7F622E4B7D930734135368907ED8256A707FAB6F990582444772A78E790F` |
| `node_modules/@deepseek-ai/dsh-workspace/lib/types/index.d.ts` | `E0C43056B485B269A62E30FFD1921BB54565686A6A106A7BE717753378462AE1` |
| `node_modules/@deepseek-ai/dsh-workspace/lib/types/types.d.ts` | `099BF994F6A09CDE62FD31249CA5DC126CB34128ECB7D8DCEC713044FFCC1FB4` |
| `node_modules/@deepseek-ai/dsh-workspace/README.zh.md` | `08A909818269EE759919F5EA21C987F1841E98A7573ECDAC80395260C6BA1697` |

该包仅向Host消费者提供Workspace记录，不注册工具、不注入提示词、不写Session事件。Week 3不得为了项目文件功能把Workspace路径或材料正文放入模型上下文。

## Client合同

Client模块通过包清单中的`dsh.client`被发现。当前会话输入右侧入口使用官方槽位`conversation.input.right`：

Client编码前优先用`Slots.listSubTree`的精确`root`只查询本次受影响的候选Slot；仅当候选边界、owner或固定版本证据仍不明确时，才逐级扩大到相邻子树或全树。禁止把全树扫描建设成常驻诊断工具，也禁止猜测options；采用的精确结果必须覆盖purpose、kind、scope、standard props、owner props、current occupants、replacement risk和descendants。

本项目当前决策：`conversation.input.right`采用`list`列表协议提供入口；`settings.section`提供原生设置页面；`shell.overlay`作为`list`增量桥接点保留 Workspace 上下文与历史兼容生命周期，但在固定 Sidebar 路径中不渲染独立面板；业务主工作区通过 Better Sidebar `0.18.0` 的公开服务注册。禁止默认注册`root`、`sidebar`、`conversation`、`details`；`details`是`single`单槽，禁止绿洲工作台注册或借用其几何。

### 固定版本客户端接线

固定组合已经提供 Better Sidebar 公开服务，绿洲插件不再使用 Portal/DOM 布局适配器。实际装配只通过 `ctx.betterSidebar.registerTab(...)` 注册一个绿洲 Tab，并在 capability 含 `targetedOpen` 时使用带 Session scope 的 `openTab(...)`。不能通过模拟点击、DOM 标记、私有 store 或无 scope fallback 打开。

Better Sidebar 的“文件变动”和“终端”由其原生设置所有者保存为 `tabsEnabled.git=false`、`tabsEnabled.terminal=false`；重启隔离 Desktop 后，新建标签菜单只保留文件、任务管理、侧边对话、浏览器和绿洲工作台。该设置不是绿洲业务配置。

```js
export const inject = ['slots']

export function apply(ctx) {
  ctx.slots.inject('conversation.input.right', () =>
    ctx.slots.register(
      { name: 'conversation.input.right', id: 'example-entry', order: 80 },
      Component,
    ),
  )
}
```

`0.1.2-rc.1` 的连接与设置合同已发生漂移：

- 活跃 Host 通过 `connection.generation.getSnapshot()/subscribe()` 观察，不再使用旧 `hostDescription`；
- 凭据能力位于 `remote.credentials`，`describe([ref])` 返回 `{ ok, value: { [ref]: { configured, writable } } }`，`set(ref, value)` 直接返回响应；
- loopback 同时核对 `connection.isLoopback` 与 `remote.$host.isLoopback`；
- 设置 scope 直接用字符串 namespace 绑定，`settingsNamespace` 已从当前包移除；
- 设置页面注册在 `settings.section`，Client 清单必须声明 `@deepseek-ai/dsh-client-ui-settings`。

`./client`不是原始ESM源码入口。浏览器文件必须是lazy-CJS工厂，并以准确包名注册：

```js
window.__ModuleLoader__.load({
  id: 'example-dsh-plugin',
  factory: (require) => {
    var module = { exports: {} }
    var exports = module.exports
    // 构建后的Client代码；React等平台模块通过require解析。
    return module.exports
  },
})
```

官方仓库的`clientBundle`预设当前没有发布给仓库外插件；外部包需用tsdown等构建器复刻同一输出格式。`react`等Web平台模块保持external；Client源码引用或`dsh.client.inject`声明的DSH动态包按官方规则同时列入peer和dev依赖，平台提供的React作为dev构建输入。必须通过当前Web Profile验证槽位及浏览器控制台；不得依赖构建哈希类名或未声明的内部对象。

## 项目Skill合同

项目本地Skill根目录为`<projectRoot>/.dsh/skills`。支持：

```text
<projectRoot>/.dsh/skills/<kebab-name>/SKILL.md
<projectRoot>/.dsh/skills/<kebab-name>.md
```

若未找到`.git`，当前工作目录作为项目根；因此测试命令必须从目标项目根执行。

### Skill 正文可见性边界

固定包 `@deepseek-ai/dsh-tool-skill 0.1.2-rc.1` 的原生工具结果直接返回 Skill 的完整 `content`，客户端 Skill 工具行还能展开显示结果。因此 `userInvocable=false`、scope 注册或不展示目录都不能保证普通产品路径不可取得正文。当前只能证明没有在绿洲 UI 中新增读取/导出入口，不能宣称原生 Skill 调用满足“用户可用但不可获取正文”。G-SKILL 未决时不得安装或运行真实私有业务 Skill。

## Windows隔离验证

不要在开发烟雾测试中改写`C:\Users\<user>\.dsh\profiles\web`。在工作区使用隔离主页：

```cmd
cd packages\example-dsh-plugin
pnpm install --frozen-lockfile
pnpm run build
cd ..\..
scripts\dsh-isolated.cmd --print-home
scripts\dsh-isolated.cmd plugin --profile web add .\packages\example-dsh-plugin
scripts\dsh-isolated.cmd --profile web --dump-config
scripts\dsh-isolated.cmd --profile web --no-open --port 0
```

隔离包装器应在调用CLI前设置隔离`DSH_HOME`，并按`DSH_BIN`、PATH、已知npm全局前缀的顺序寻找候选入口；候选必须能追溯到官方`@deepseek-ai/dsh`包及其声明的`bin.dsh`，再以当前Node、`shell:false`和原样参数启动。Home只允许项目`.dsh-test`或系统临时目录下`oasis-dsh-*`根，必须拒绝真实`~/.dsh`的祖先/自身/后代以及任一现有junction、symlink或重解析跳转。每次写入前先用`--print-home`确认实际路径。`dsh --dump-config`在当前CLI中会准备并写入Profile文件，所以只能对隔离`DSH_HOME`运行，不能当作对真实Profile的纯读取操作。

`DSH_HOME` 隔离不等于 Skill 根隔离：本次固定 Desktop 的启动日志仍会扫描用户级 `.agents/skills`。不得把真实私有 Skill 放进可枚举的用户/Workspace Skill 目录，并且不能因 Profile 隔离就宣称 Skill 发现面已隔离。

## 验证层级

| 层级 | 可证明 | 不可证明 |
|---|---|---|
| 单元测试 | 纯业务逻辑 | DSH已加载 |
| 清单测试 | Bundle/Client字段存在 | Profile安装成功 |
| 隔离安装 | Profile识别Bundle | Host或Client实际运行 |
| Host日志/工具目录 | Host已加载、工具已注册 | 浏览器UI可用 |
| HTTP模块 | 构建后的Client文件已提供 | 浏览器Loader接受或UI已渲染 |
| 浏览器快照与浏览器控制台 | Client已加载并渲染、无新增错误 | 外部Dify或收费系统质量 |

本项目把Dify和收费管理视为既有稳定外部能力，仅验证插件边界兼容性。
