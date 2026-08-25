# 第一周深度审计 Evidence Ledger

日期：2026-08-23

| ID | 声明/检查 | 命令或证据 | 结果 | 可证明 | 不可证明 |
|---|---|---|---|---|---|
| E01 | 当前工作目录和工具链 | `environment.txt` | 显式 npm shim 返回 DSH `0.1.1-rc.2`；Node `22.19.0`；pnpm `11.19.0`；`where dsh`失败；无 Git/OpenSpec | 当前 cmd 环境和显式 shim 状态 | 其他终端 PATH 状态 |
| E02 | 审计前源文件基线 | `source-hashes-before.txt` | 排除依赖、既有运行态和新证据后共 28 个文件 | 审计开始时目标内容哈希 | 第一周开始前内容 |
| E03 | 真实 Profile 基线 | `profile-hashes-before.txt` | 113 个文件；只读 SHA-256 | 本次审计前真实 Profile 内容 | 第一周历史上从未被尝试写入 |
| E04 | 真实 Profile 未列插件 | `profile-plugin-check-before.txt` | `findstr`退出1、无匹配 | 当前 manifest 未列目标插件 | 其他 Profile 文件历史未变化 |
| E05 | 本机 DSH 包合同 | `installed-dsh-package.json` | `@deepseek-ai/dsh 0.1.1-rc.2` | 当前安装包版本、依赖与入口 | 官方 master 最新状态 |
| E06 | 官方仓库快照 | `official-*.md`、`official-master-commit.json` | master SHA `b150a551b8d465e31e418e1b2eaf5e79bbb7d28e`，提交信息为发布 `dsh@0.1.1-rc.2` | 2026-08-23 下载到的官方 master 文档 | 未来版本兼容性 |
| E07 | 包内容 | `npm-pack-dry-run-success.json` | 退出0；7个文件；无 tarball 实际发布 | 当前 pack 文件集合 | npm 安装后的 DSH 运行行为 |
| E08 | npm 首次失败边界 | `npm-pack-dry-run.json` | 用户缓存写入 EPERM | 沙箱默认缓存不可写 | 包合同失败 |
| E09 | 解析依赖 | `pnpm-list-depth0-verified.json` | 提权只读命令退出0；Cordis 4.0.1、DSH包 rc.2、React 18.2.0、tsdown 0.22.14 | 当前 node_modules 顶层解析版本 | 全部传递依赖无漏洞 |
| E10 | pnpm 沙箱失败边界 | `pnpm-list-depth0.json`等 | 默认 SQLite store 不可读；本地 store 参数未解决 | 环境限制 | 依赖本身损坏 |
| E11 | 第一周需求追溯 | `requirements-traceability.md` | 七项核心声明和两项范围假设已分层 | 静态需求—交付关系 | 尚未执行的新隔离 runtime/browser 结果 |
| E12 | 官方/本机/包合同审计 | `contract-audit-batch1.md` | 主要 DSH 合同一致；发现可复现性与分发卫生风险 | 当前静态合同 | Host工具真实调用和浏览器加载 |
| E13 | 静态代码与安全审计 | `static-code-audit.md`、`security-scan.md` | 发现4项P2、2项P3；凭据搜索无匹配 | 当前目标源码和产物 | 运行时日志和外部服务 |
| E14 | 当前依赖漏洞快照 | `pnpm-audit-verified.json` | 官方npm endpoint查询退出0，已知漏洞0 | 2026-08-23公告数据库结果 | 未披露漏洞或未来漏洞 |
| E15 | Fresh构建与确定性 | `build.txt`、`client-lib-hashes-*.txt` | 构建退出0；前后内容哈希一致 | 当前源码可产生同一Client内容 | 浏览器Loader接受 |
| E16 | Fresh自动测试 | `tests.txt`、`test-audit.md` | 8/8通过；测试强度已分层 | 当前静态/单元/Provider合同 | Host实际调用、Browser行为 |
| E17 | Codex补充Skill验证 | `quick-validate.txt` | 退出1，缺PyYAML | 工具链依赖缺口 | DSH Provider解析失败 |
| E18 | 全新Profile安装 | `isolated-init.txt`、`isolated-plugin-add.txt`、`isolated-profile-package.json`、`isolated-dump-config.yml` | 初始化、link安装、组合配置均退出0 | Bundle可在全新隔离Profile安装 | Host工具真实调用 |
| E19 | Client HTTP | `client-http-headers.txt`、`client-http-body.js` | HTTP 200；lazy-CJS首行 | Host实际提供构建Client | Browser接受与渲染 |
| E20 | Skill runtime | `workspace-*.json`、`skill-list-*.json` | 两个Skill返回且modelInvocable=true | 当前隔离Host能发现两Skill | Skill专业输出质量 |
| E21 | API错误处理负例 | `session-create-response.json` | RPC bad-request但脚本退出0 | 烟雾脚本存在假绿灯路径 | 所有API请求均错误 |
| E22 | Browser快照与事件 | `output/playwright/week1-audit` | 按钮渲染；Client请求200；事件1次且detail正确 | Loader接受、UI渲染、事件合同 | 面板或完整工作台存在 |
| E23 | Browser控制台 | `console.txt`、`console-raw.log` | Errors 0、Warnings 0、1条verbose | 本轮页面无新增error/warning | 所有浏览器/未来版本无错误 |
| E24 | 真实Profile后置保护 | `profile-hashes-after.txt`与before `fc /b` | 113文件、无差异；manifest仍无插件 | 本次审计未修改真实Profile | 第一周历史全过程未写入 |
| E25 | 运行清理 | `runtime-browser-audit.md` | Browser无会话、端口无监听、临时目录不存在 | 本轮创建的运行态已清理 | 其他无关进程状态 |

后续任务将在此表追加构建、测试、隔离 Host、Skill API、浏览器、控制台、事件和 Profile 后置哈希证据。
