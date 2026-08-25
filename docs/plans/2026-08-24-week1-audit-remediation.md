# 第一周审计修复实施计划

日期：2026-08-24  
执行状态：已完成（2026-08-25）

## 目标契约

- 关闭全面审计中的本地可行动 P1/P2，并处理相关 P3。
- 保留 `hidden / normal / expanded` 三态。
- normal 通过项目自建最小布局适配器推挤 `#root`，不得遮挡中栏。
- expanded 覆盖中栏但保留原生左栏；hidden 完整恢复 DSH 原布局。
- 插件异常、DSH DOM 失配、HMR 和卸载必须 fail-closed 并清理全部布局副作用。
- 真实 `C:\Users\TinaD\.dsh` 只读；所有 Host/Browser 验证使用隔离 `DSH_HOME`。

## 借鉴边界

只参考 DSH-better-sidebar 的 Portal 面板、`#root` 布局推挤、CSS 变量清理、DSH DOM 探测、窄屏抽屉及异常恢复思想。独立实现，不依赖该包，不引入文件、终端、Git、浏览器、编辑器或其他工作台功能。

## 执行顺序

1. 冻结 Git、产品源文件和真实 Profile 强基线。
2. 先修复 `scripts/dsh-isolated.mjs` 的 shell 注入和 Home 边界。
3. 为布局适配器增加 RED 测试：探测、三态、冲突、清理、故障和窄屏。
4. 实现 Portal + 单写入者布局适配器。
5. 修复页签键盘焦点及跨 Workspace 焦点恢复。
6. 统一总体计划、项目 Skill、官方合同参考和 README。
7. 执行 package、根级、Skill、隔离 Host/Browser/Profile/cleanup 全量验证。

## DOM 写入预算

只允许：

1. 在 `document.body` 添加一个 `[data-oasis-panel-portal]` 宿主；
2. 在 `document.head` 添加一个 `[data-oasis-layout-style]` 标签；
3. 给 `#root` 添加/删除插件自有布局所有权属性；
4. 给 `document.documentElement` 添加/删除 `--oasis-right-rail-width`。

禁止修改 DSH 子节点、原生 class、内容、`details`、哈希类名或结构顺序。

## 停止条件

- 真实 Profile 哈希发生无法解释的变化；
- 需要修改 DSH 核心或替换原生 Slot；
- 发现其他布局所有者但实现试图覆盖；
- hidden/异常/卸载后不能恢复原布局；
- 新增依赖或功能超出明确借鉴边界。

## 完成门

- 注入挑战和真实 Home 挑战 fail-closed；
- normal 下左栏不动、中栏不遮挡、输入可交互；
- expanded/hidden 清除推挤；
- DOM/Portal 故障恢复；
- 原生 Details occupant 前后一致；
- A/A/B、多页、键盘焦点通过；
- build/test/pack、Skill、Host/Browser、Profile/cleanup 全部形成新鲜证据；
- 无未关闭的本地可行动 P0-P2。

## 执行结果

- 安全包装器改为直接解析官方 `@deepseek-ai/dsh` Node CLI，并以 `shell:false` 原样传参；拒绝任意 shim、真实 DSH Home、其祖先/后代以及包含 link/junction 的路径链。
- 右栏改为 `shell.overlay` 生命周期锚点 + React Portal + 单写入者布局适配器；normal 实测压缩中栏而不遮挡，expanded/hidden/故障/卸载均清除布局副作用。
- 页签补齐 Arrow、Home、End、Delete 后的 DOM 焦点移动；Workspace 入口引用只跟踪当前挂载节点。
- 原生 Details 在绿洲 hidden 后由验证专用 Client 实际打开和关闭，前后 live Slot occupant 保持一致；验证专用 `D+ / D-` 控件不进入产品包。
- 900px 窄屏自动解析为 effective expanded，并在恢复到 1600px 后回到用户请求的 normal。
- IPv6 `http://[::1]` 通过真实 loopback HTTP 测试。

## 完成门结果

| 门禁 | 结果 | 证据 |
|---|---|---|
| 包装器注入与真实 Home 挑战 | 通过 | 根级测试 22/22；`runtime/root-tests-final.txt` |
| package build/test/pack | 通过 | 47/47；18 文件 dry-run；`runtime/package-verify-final.txt` |
| 两个项目 Skill 官方校验 | 通过 | 2/2 `Skill is valid!`；`runtime/skill-validator-final.txt` |
| 隔离 Host/Browser | 通过 | 1/1；`runtime/verifier-browser-tap.txt` |
| normal/expanded/hidden/窄屏/原生 Details | 通过 | `browser/layout-geometry.json` 与五张截图 |
| 浏览器 console/pageerror | 通过 | 0/0；`browser/console-problems.json`、`browser/page-errors.json` |
| 真实 DSH Home 保护 | 通过 | 664 entries；前后 0 diff；`baseline/profile-delta.json` |
| 临时目录清理 | 通过 | 三个失败根已删除，成功根自动清理，前缀残留 0；`runtime/cleanup-final.txt` |

当前裁决见 `D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\docs\第一周-审计修复验证报告.md`。第二周可以按总体计划开始，但本轮未启动第二周功能开发。
