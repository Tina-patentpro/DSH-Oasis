# DSH插件官方接口参考

核验日期：2026-08-24  
本机基线：`@deepseek-ai/dsh 0.1.1-rc.2`、Node.js `22.19.0`、pnpm `11.19.0`

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

当前`0.1.1-rc.2`的`ctx.storageDomain.open(spec)`返回调用方拥有的Domain。读操作同步；同一Domain内的写操作串行，持久化成功后才更新内存并发布事件。调用方必须在卸载时调用幂等的`Domain.close()`；close会停止接收新写并排空已进入队列的写。Domain名、表名必须匹配`^[a-z][a-z0-9_]*$`，因此本项目实际使用`oasis_workbench` version `1`，不得使用含连字符的展示名。

Web Profile由DSH组合JSON backend。该backend为每个unit写人类可读JSON，并通过临时文件、fsync和原子rename提交；插件不得绕过Domain直接读写该文件。backend不提供跨进程锁或CAS，本项目只承诺单一DSH Host进程；禁止两个Host共享同一Storage根。

Host可用`ctx.connection.rpc.handle(channel, handler, { authority })`注册logical RPC channel，Client用`ctx.connection.rpc.call(channel, endpoint, payload, signal)`调用。本项目固定专用channel`/oasis-workbench`和`authority: 'loopback'`，不修改`@deepseek-ai/dsh-api-remotes`的固定能力集合。`RpcError`只使用DSH闭合集合；revision冲突属于成功响应中的业务union，不伪造新的transport错误码。payload必须在Host端严格校验，未知endpoint和额外字段返回`bad-request`。

## Client合同

Client模块通过包清单中的`dsh.client`被发现。当前会话输入右侧入口使用官方槽位`conversation.input.right`：

Client编码前先调用`Slots.listSubTree`不带`root`查询全树，再调用`Slots.listSubTree`带精确`root`查询每个候选Slot。禁止猜测options；精确结果必须覆盖purpose、kind、scope、standard props、owner props、current occupants、replacement risk和descendants。

本项目当前决策：`conversation.input.right`采用`list`列表协议提供入口；`shell.overlay`采用`list`增量协议提供Portal生命周期锚点。禁止默认注册`root`，禁止默认注册`sidebar`，禁止默认注册`conversation`，禁止默认注册`details`。`details`是`single`单槽，禁止绿洲工作台注册或调用`ctx.layout.openDetails()`借用其几何；隔离浏览器已证明后者会产生原生遮罩并阻断Overlay交互。

### 固定版本布局适配例外

当前`0.1.1-rc.2`没有满足该产品右栏要求的公开布局API，因此允许项目自建一个版本化、单写入者最小适配器：

- React面板通过Portal挂到`document.body`，`shell.overlay`只维持插件生命周期；
- 只用稳定属性与父子关系检测`#root`、root Slot、`[data-shell-overlay]`、sidebar Slot和conversation Slot；禁止哈希class与位置选择器；
- normal给`#root`添加插件自有所有权属性，并用`--oasis-right-rail-width`推挤360px；expanded与hidden必须清除该推挤；
- 窄于1024px或预计中栏小于520px时，请求的normal自动解析为expanded，但不改写用户请求状态；
- 发现结构不唯一、其他布局所有者、CSS写入/几何验证失败时立即隐藏并恢复；HMR、异常和卸载同样清除Portal、style、属性、变量、observer与timer；
- 除以上预算外不得修改DSH子节点、原生class、内容、顺序或`details`。

设计只借鉴`DSH-better-sidebar`的Portal、`#root margin-right`、清理和生命周期恢复思路，不依赖或复制其文件、终端、Git、浏览器、编辑器功能。参考：`https://github.com/omdsh-dev/DSH-better-sidebar/blob/main/src/client/layout.css`与`https://github.com/omdsh-dev/DSH-better-sidebar/blob/main/src/client/index.tsx`。

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
