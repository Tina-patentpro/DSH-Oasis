# Week 3 Task 6 证据台账

- 生成日期：2026-08-30
- 接受的 Week 3 证据：`attempt-09`
- 接受的前置门禁证据：`prerequisites-attempt-01`
- 证据性质：本机静态、单元、DSH Host、真实浏览器和文件系统保全证据；不是生产环境证据

## 1. 当前基线

来源：`prerequisites-attempt-01/runtime/baselines.json`

| 项目 | 当前值 | 门禁 |
| --- | --- | --- |
| Node.js | `v22.19.0` | 满足包清单 `^22.19.0 || >=24.0.0` |
| pnpm | `11.19.0` | 已用于隔离插件安装和前置门禁 |
| DSH | `@deepseek-ai/dsh@0.1.1-rc.2` | 与包 peer contract 一致 |
| Oasis 包 | `oasis-professional-service@0.0.1` | private，本地验证包 |
| Better Sidebar | `dsh-better-sidebar@0.15.2` | 精确版本，读取真实 Profile 中已安装的发布包后复制到隔离根 |
| `conversation.input.right` | `list` | 只注册增量入口 |
| `shell.overlay` | `list` | 只作 standalone Portal 生命周期桥 |
| `details` | `single` | 禁止注册和借用几何 |

基线同时记录了 Oasis 包清单、Better Sidebar 清单、项目 Skill、官方合同引用和 Client 源码的 SHA-256。

## 2. 分层结论

### 2.1 静态与合同层

- `node --test` 对 `tests/scripts` 下 9 个文件执行 36 项测试：36 pass，0 fail。
- `tests/scripts/week3-dual-host-verification-contract.test.mjs` 覆盖双 Host、公开 Better Sidebar 接口、临时 DSH 副本、卸载恢复、前置门禁和真实 Profile 保全合同。
- Client 只注入 `conversation.input.right` 和 `shell.overlay`；未注入 `details`。
- Better Sidebar 集成只使用公开 `registerTab`、`openTab` 服务、公开 marker 和可访问名称控件，不依赖私有 class、私有 store 或模拟内部点击。

证据：

- `prerequisites-attempt-01/runtime/root-tests.txt`
- `prerequisites-attempt-01/runtime/baselines.json`
- `attempt-09/better-sidebar/runtime/better-sidebar-source.json`

### 2.2 包与单元层

- 命令：`pnpm --config.verify-deps-before-run=false run verify`
- 结果：构建成功；201 项包测试通过，0 fail；`npm pack --dry-run --json` 成功。
- dry-run 包：`oasis-professional-service-0.0.1.tgz`，37 个条目；只包含清单允许的 `src`、`lib`、`cordis.patch.yml` 和 `package.json`。
- standalone 360px rail 的 1px content-box 偏差已用 RED/GREEN 回归测试修复；卸载恢复后的实测总宽为 360px。

证据：

- `prerequisites-attempt-01/runtime/package-verify.txt`
- `attempt-09/better-sidebar/browser/post-uninstall/layout.json`

### 2.3 DSH Host 层

- Week 1 verifier：通过。
- Week 2 persistence verifier：Host1/Host2 持久化、端口关闭和浏览器门禁通过。
- Week 3 standalone：独立 Profile、Host 重启、项目 A/B、多个 Oasis 任务、材料、两次运行、人工审核、两阶段无覆盖回写通过。
- Week 3 Better Sidebar：同一业务闭环在原生 0.15.2 tab 中通过；embedded 模式无 Oasis Portal、无 Oasis root owner、无 Oasis width variable。
- Better Sidebar 卸载后重新启动同一隔离 Profile，Oasis 自动回到 standalone；未再提供 Better Sidebar 资源。

证据：

- `prerequisites-attempt-01/runtime/week1.txt`
- `prerequisites-attempt-01/runtime/week2.txt`
- `attempt-09/standalone/runtime/host1-local-loop.json`
- `attempt-09/standalone/runtime/host2-restore.json`
- `attempt-09/better-sidebar/runtime/host1-local-loop.json`
- `attempt-09/better-sidebar/runtime/host2-restore.json`
- `attempt-09/better-sidebar/runtime/dump-config-after-better-sidebar-remove.yml`

### 2.4 浏览器层

| 门禁 | 结果 |
| --- | --- |
| Week 1 浏览器 | 1 pass，0 fail |
| Week 2 浏览器 | 1 pass，0 fail |
| Week 3 standalone | 1 pass，0 fail |
| Week 3 Better Sidebar 0.15.2 | 1 pass，0 fail |
| Better Sidebar 卸载后 cleanup | 1 pass，0 fail |

Week 3 浏览器覆盖：输入、工作流选择、项目 A/B 切换、多个任务页、运行与预览、人工审核、回写、宽屏、窄屏、原生折叠/展开、刷新和卸载恢复。Better Sidebar embedded 证据中 `standalonePanelCount=0`、`rootOwner=null`、`rootContract=null`、`widthVariable=''`；控制台问题和页面错误均为空。

证据：

- `prerequisites-attempt-01/week1/runtime/verifier-browser-tap.txt`
- `prerequisites-attempt-01/week2/runtime/browser-tap.txt`
- `attempt-09/standalone/runtime/browser-tap.txt`
- `attempt-09/better-sidebar/runtime/browser-tap.txt`
- `attempt-09/better-sidebar/runtime/post-uninstall-browser-tap.txt`
- `attempt-09/better-sidebar/browser/layouts.json`
- `attempt-09/better-sidebar/browser/post-uninstall/layout.json`

### 2.5 文件系统与保全层

- Week 3 每个模式先把官方 DSH 运行时复制到该模式自己的 `oasis-dsh-week3-*` 临时根，并通过复制后的官方 `lib/bin.js` 启动。
- DSH 源清单与临时副本清单 SHA-256 均为 `DC930C0B18158F49AE3753CEAF6B1B7AE71DC6C8F45C85A2D679B142024ADDF7`。
- Better Sidebar 卸载后的全根扫描发现 433 个 reparse target；全部解析在声明的临时根内。
- standalone 与 Better Sidebar 两个成功临时根均在验证完成后按精确路径删除。
- Workspace A 只有清单列出的 6 个新回写文件；`unexpected=[]`。Workspace B 无变化。
- Week 3 父级、standalone 子级、Better Sidebar 子级和 prerequisite 父级四组真实 Profile 对比均为：13748 entries before/after，digest `79B20765988FF2FD65C55532952275C150A0DF79E28D0BAA8170128559BFBDA1`，`equal=true`，`changes=[]`。
- Week 1/Week 2 仅作为历史功能门禁；Task 6 的“无外部 reparse target”结论只取自新的双 Host verifier，不由旧 verifier 外推。

证据：

- `attempt-09/standalone/runtime/official-dsh-runtime.json`
- `attempt-09/better-sidebar/runtime/official-dsh-runtime.json`
- `attempt-09/better-sidebar/filesystem/isolated-root-reparse-targets-after-uninstall.json`
- `attempt-09/standalone/filesystem/temporary-root-cleanup.txt`
- `attempt-09/better-sidebar/filesystem/temporary-root-cleanup.txt`
- `attempt-09/better-sidebar/filesystem/workspace-diff.json`
- `attempt-09/filesystem/real-profile-compare.json`
- `prerequisites-attempt-01/filesystem/real-profile-compare.json`

## 3. Task 6 要求映射

1. DSH、Node、pnpm、包、Better Sidebar 和 Slot 基线：已刷新。
2. 当前双 Host 隔离 Profile 无声明根外 reparse target：已证明。
3. 无 Better Sidebar 的 standalone Portal：已证明。
4. Better Sidebar 0.15.2 原生 tab 的输入、项目切换、多任务、窄屏、折叠/展开、刷新、卸载恢复：已证明。
5. embedded 不创建 Oasis Portal/root owner/width variable：已证明。
6. package、root、Week 1、Week 2、Week 3：均已 fresh 运行。
7. 完整真实 Profile before/after：零变化。
8. 静态、单元、Host、浏览器、保全层：已在本台账中分开陈述。

## 4. 未接受的诊断运行

- `attempt-01` 至 `attempt-07`：安装、离线依赖、原生展开、卸载参数和全根 reparse 诊断；不作为验收证据。
- `attempt-08`：首次证明 433 个 DSH fallback link 全部位于临时根，但卸载后 standalone 面板因 content-box 边框实测 361px，浏览器断言失败；仅作根因证据。
- package gate 的首次沙箱内运行：构建和 201 项测试通过，但 `npm pack --dry-run` 因 npm cache `EPERM` 未完成；不作为验收证据。`prerequisites-attempt-01` 在获批的沙箱外完整重跑并保存了成功输出。

## 5. 证据边界

- 已证明：当前本机版本组合下的静态合同、单元测试、隔离 DSH Host、本机真实浏览器、Better Sidebar 0.15.2 可互换路径、无覆盖写回和真实 Profile 保全。
- 未证明且不在本任务范围：生产部署、真实模型调用、专业技术结论质量、专利法律结论质量、Dify 内部实现、收费管理内部实现、其他 DSH/Better Sidebar 版本兼容性。
