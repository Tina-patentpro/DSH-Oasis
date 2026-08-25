# 官方、本机与包合同审计（Batch 1）

## 官方快照

- 仓库：`deepseek-ai/deepseek-harness`
- master SHA：`b150a551b8d465e31e418e1b2eaf5e79bbb7d28e`
- 提交时间：2026-08-21T12:03:37Z
- 提交说明：发布 `dsh@0.1.1-rc.2`
- 本机版本：`0.1.1-rc.2`

因此本次下载的官方 master 与本机 DSH 发布基线一致；这只证明本次固定快照，不承诺未来兼容。

## 已核对并一致的合同

1. 官方 publish 文档明确 Bundle 与 Profile 不是同一对象，Profile 由 `dsh plugin`维护；当前 `dsh.bundle.patch`与安装方式一致。
2. 官方 tool 文档使用 `inject=['tools']`、`ctx.tools.register()`和`defineTool()`；当前 Host 结构一致。
3. 官方 Client AGENTS 要求实际浏览器服务 `lib/client.js`，跨包 slot 使用 `ctx.slots.inject()`；当前实现一致。
4. 官方 Client cookbook 要求 loader lazy-CJS，且说明仓库外插件需要自行复刻未发布的`clientBundle`输出；当前 tsdown banner/footer实现了该装载格式。
5. 官方 Skill 文档确认无 `.git` 时 cwd 为项目根，项目 Skill 位于`<projectRoot>/.dsh/skills`；当前目录与发现测试一致。
6. 当前依赖解析为 Cordis 4.0.1、DSH Client/Tools 0.1.1-rc.2、React 18.2.0，与官方包基线相符。

## 分发清单结果

`npm pack --dry-run --json`在改用临时缓存后退出0，列出7个文件：Host/Client源码、lazy-CJS及source map、patch和package manifest。没有发布或生成tarball。

## 初步发现

### P2-C01：开发 Skill 的首条版本命令在当前 cmd 环境不可复现

- `environment.txt`显示`where dsh`失败，但显式`%APPDATA%\npm\dsh.cmd --version`成功。
- `.dsh/skills/dsh-plugin-development/SKILL.md:15`要求直接运行`dsh --version`，没有先解析可执行文件。
- 影响：新会话可能在第一步失败，或在不同 shell 解析到非预期版本，违背“版本优先”。
- 最小修复方向：先`where dsh`，失败时使用经核验的 npm prefix/shim；记录解析路径后再读版本。

### P2-C02：安装说明没有冻结锁文件

- `README.md:17`使用`pnpm install`；Skill 33行同样未要求`--frozen-lockfile`。
- 当前 manifest 对开发依赖使用 semver range。虽然本次 lock 解析到正确版本，未来重新安装仍可能漂移。
- 最小修复方向：审计/CI使用`pnpm install --frozen-lockfile`；升级另立显式兼容任务。

### P3-C03：构建不清理旧 lib 文件

- `tsdown.config.mjs:21`设置`clean:false`；package `files`会打包整个`lib`目录。
- 当前 pack 只有预期的`client.js`与map，因此尚未形成实际错误；但未来改名后旧文件可能进入包。
- 最小修复方向：构建前清理受控`lib`或增加pack清单断言。

### P3-C04：技术 spike 包尚不具备正式分发文档合同

- pack不含包级README、LICENSE或types；`private:true`阻止正式发布意图。
- 这与第一周“不发布npm”范围一致，不判定第一周失败；正式Profile/分发前必须补齐。

## 通过项

- Bundle/Profile、Host注册形态、Client lazy-CJS、slot注入和项目Skill根目录均与固定官方快照一致。
- 当前pack没有意外包含测试、node_modules、lockfile或本地运行目录。
- Client source map含源码，但静态检查未发现凭据；是否随正式包分发需在发布阶段决定。
