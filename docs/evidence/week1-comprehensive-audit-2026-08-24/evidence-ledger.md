# 第一周全面审计证据账本

日期：2026-08-24

| Claim | Layer | Command / Method | Exit / Result | Evidence | Boundary |
|---|---|---|---|---|---|
| 初始化本地 Git 仓库 | LOCAL | `git init`；`git status --short --branch` | 0；No commits yet；无 staged 文件 | 终端输出 | 未创建提交，所有既有文件仍为 untracked |
| 工具链基线 | STATIC | `git/dsh/node/pnpm/npm --version`；读取全局 DSH package.json | 0 | `baseline/environment.txt` | 不证明插件运行 |
| 审计前产品源文件基线 | STATIC | 54 个纳入文件 SHA-256 | 0 | `baseline/source-hashes-before.tsv` | 包含文档，不含生成态、旧证据和 node_modules |
| 审计前真实 Web Profile 基线 | PROFILE | 全树 lstat、reparse 检查、SHA-256 | 113 文件；0 reparse | `baseline/profile-hashes-before.tsv` | 只读；不证明其他 Profile |
| 冻结离线安装 | SUPPLY | `pnpm install --frozen-lockfile --offline --node-linker=hoisted` | 0 | `runtime/frozen-install-offline.txt` | 复用本机 store，不证明干净机器下载 |
| clean build、包测试、pack | BUILD/UNIT/PACK | `pnpm --config.verify-deps-before-run=false run verify` | 0；30/30；15 files | `runtime/package-verify.txt` | 原有测试未覆盖本次挑战发现 |
| 根级脚本与 Skill 合同测试 | UNIT | 4 文件 Node test | 0；16/16 | `runtime/root-tests.txt` | 参数测试未覆盖 CMD 元字符 |
| 两个 Skill 官方校验 | STATIC | 明确 Python 路径、`-X utf8`、`quick_validate.py` | 0、0 | `runtime/skill-validator-final.txt` | 首次 PATH/GBK 失败保留在同目录历史文件中 |
| 实际顶层依赖版本 | SUPPLY | `pnpm list --depth 0`，正常权限读取 store | 0；6 packages | `runtime/pnpm-list-depth0-final.txt` | 沙箱内首次 SQLite 失败不计通过 |
| 包装器参数防注入 | SECURITY | 假 `dsh.cmd` + 含 `&` 参数 | **injected=true** | `static/wrapper-shell-challenge.txt` | 证明 `shell:true` 会二次解释参数 |
| 真实 DSH Home 拒绝门 | SECURITY | `--home C:\Users\TinaD\.dsh --print-home` | **0，直接接受** | `static/wrapper-real-home-challenge.txt` | 未运行任何写命令，真实 Profile 未改变 |
| IPv6 loopback | UNIT | `http://[::1]:1` 预检 | 1，被误判非 loopback | `static/ipv6-loopback-challenge.txt` | IPv4 loopback 仍通过 |
| 隔离 Bundle/Host/Slot/Browser | HOST/BROWSER | 新临时 DSH_HOME + 本机 Edge | 0；浏览器 1/1 | `runtime/full-verifier-console.txt`；`runtime/verifier-browser-tap.txt` | 不证明生产、Agent 凭据链或专业生成 |
| Client bundle 提供 | HTTP/BROWSER | Browser response listener | HTTP 200 | `browser/plugin-responses.json` | 仅当前隔离 Host |
| 浏览器 console/pageerror | BROWSER | Browser listeners | `[]` / `[]` | `browser/console-problems.json`；`browser/page-errors.json` | 不检查页面可见业务错误文本 |
| live Slot 合同 | CLIENT-RUNTIME | `Slots.listSubTree` 全树及 3 个精确 root | 0 | `browser/live-slot-subtrees.json` | details 只在切换前查询，未证明隐藏后行为 |
| 真实 Profile 未改变 | PROFILE | 审计前后 113 文件强清单比较 | equal=True | `final/profile-compare.txt` | 只覆盖 Web Profile |
| 产品源文件未改变 | STATIC | `.dsh/skills`、package、scripts、tests、README、gitignore SHA-256 | 45 files；0 diff | `final/product-source-compare.txt` | 审计新增文档/证据不属于产品源文件 |
| 验证清理 | LOCAL | 临时 Home、14329 监听复核 | 0/0 | `final/cleanup.txt` | 不结束审计前已存在的 Codex Node 进程 |
| 凭据扫描 | SECURITY | 源文件与本次文本证据模式扫描 | 0 match | `static/credential-scan.txt`；`final/evidence-credential-scan.txt` | 模式扫描不等于形式化信息流证明 |

