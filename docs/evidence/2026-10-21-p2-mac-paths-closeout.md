# P2旧路径测试修复、全量回归与复审

日期：2026-10-21。根目录 `/Users/tinadong7036/Documents/开发项目/dsh-lab`；分支 `mac/continuity-v2`；HEAD保持 `84c0cc5bd103a1860e2490494f3f50a1be8404d1`。依据用户本次明确修复指令，关闭[供应链与Mac测试复审](/Users/tinadong7036/Documents/开发项目/dsh-lab/docs/evidence/2026-10-21-supply-chain-mac-tests-reaudit.md)的A1/P2；单代理实施及复审。

**裁定：A1/P2在正式测试范围关闭。两项旧路径测试均实际执行，活跃主包与本次新建干净树分别905/905通过、0失败、0跳过；Mac安全与启动26/26通过。未发现本次范围新增P1/P2回归。真实Desktop、正常重启与发行验收仍未完成。**

## 修复内容与断言保全

仅修改[正式测试文件](/Users/tinadong7036/Documents/开发项目/dsh-lab/packages/oasis-professional-service/test/native-offline-runtime.test.mjs)：移除两处依赖stage2-desktop存在性的skip；将两处执行路径统一为显式批准的当前平台隔离Home。Mac为基于import.meta.url定位的 `.dsh-test/mac-dev/home`，不依赖cwd；Windows分支使用当前产品已有的isolated-dev-20260913/home批准路径。本次仅在Mac执行，未宣称完成Windows实机复测。

原四个测试、全部8行assert断言代码（含四项inject循环）、预期值、服务名单及环境变量try/finally恢复均保留。机器比对记录 `assertion-preservation.json`；没有mock环境判定、删除原断言、放宽产品门禁或创建假运行回执。测试注释明确：干净测试树只需准备空的批准Home目录，缺失时失败，不自动跳过；测试本身不创建或读取Profile内容、不调用插件apply。

## 红→绿及新鲜验证

首先仅移除skip、保留旧路径运行原文件：4项中2通过、2失败、0跳过，分别为精确Home正例false及Host缺llm声明。修正路径后同一文件4/4通过、0跳过，证明原失败确实由路径不匹配引起，旧跳过原先隐藏了该错误。

另新建忽略目录中的完整干净源码/测试树，不复制node_modules、Desktop、Profile、认证或运行数据。固定Node24.21.0、pnpm11.8.0以offline/frozen/ignore-scripts方式从原固定store物化依赖，禁止包管理器自动下载并关闭optimistic-repeat-install；仅官方registry元数据直连，其他代理阻断，空npm配置和私有HOME/cache。136项供应链校验started→done（2895ms），安装3.26秒、退出0，包体fetched事件0；实际政策年龄排除为空、trustPolicy=null，未扩大为未配置政策或漏洞库审计。

在尚无 `.dsh-test/mac-dev/home` 的新树执行修正后的原测试，再次2通过、2失败、0跳过；只在该新树创建空的批准Home，不填入任何配置或认证，再执行完整回归即全部通过。测试后该Home仍为空。该反向控制证明缺少环境输入不会被静默跳过，也证明执行两项合同不需要2.0.17或真实Profile。

| 命令/检查 | 本次结果 | 日志 |
| --- | --- | --- |
| 固定Node --test test/native-offline-runtime.test.mjs，去skip但保留旧路径 | 2通过/2失败/0跳过，预期退出1 | old-path-red.log |
| 同一正式文件，批准路径 | 4/4，0跳过，退出0 | native-green.log |
| 新干净树，批准Home尚未创建 | 2通过/2失败/0跳过，预期退出1 | missing-home-red.log |
| 活跃主包所有test/*.test.mjs | 905/905，0失败/0跳过，退出0 | active-full.log |
| 新干净主包所有test/*.test.mjs | 905/905，0失败/0跳过，退出0 | clean-full.log |
| 根目录native-markdown、sidebar-safe-file、web-markdown、macos-development-launch、macos-safe-preview | 26/26，0跳过，退出0 | mac-full.log |
| 新干净树固定tsdown0.22.14构建 | 退出0，client.js与当前活跃lib逐字一致 | clean-build.log、audit-summary.json |
| 新干净树固定npm pack --dry-run --json | 退出0，114成员，无测试/依赖/工具/运行/归档/凭据目录 | clean-pack.log |
| 默认及正式模式 --check | 均退出1，固定应用可执行文件漂移被拒绝，未spawn | check-synthetic.log、check-real.log |
| git diff --check及文件保全复核 | 退出0，无意外变更 | final-checks.json、preservation.json |

执行方式为zsh启动Python包装器，再显式调用固定工具绝对路径；主包全量命令等价于其test脚本，未通过pnpm run再次触发物化。原始argv/cwd/退出码在本地证据目录的命令账本及安装result.json。沿用包装器的原commands.jsonl使用字面量换行分隔，本次保留原件，另提供可逐行解析的 `commands-normalized.jsonl`，不覆盖原始记录。

## 复审与边界

逐项核对：旧stage2路径及两处条件skip已移除；断言逐字保全；批准路径与产品实际合同一致；缺目录会使两项测试失败；Host导入后的环境恢复保持；活跃和空Home干净树均无跳过。新建树的源/锁来自同一候选，构建输出相同，未通过修改产品或依赖取得绿色结果。

主包锁SHA256仍为 `903575be3f84c6b60e716a7ef7980efdb6f024af4e62982319261d1db27a18f9`；12项Mac组件/补丁pin和admission.json本身共13项哈希与本轮起点一致。起点3253项版本控制范围文件冻结，预期只变更本测试和前置状态摘要，新增本报告；产品源码、活跃lib、manifest/lock、既有P1/阶段5及旧证据均保全。状态旧完整字节后缀保留，HEAD不变，见最终preservation.json。

本次没有启动Desktop、调用真实模型/API、登录、上传、发送对话、修改应用/Profile/准入、提交/推送或发布。未发现本修复范围新增P1/P2；这是单代理代码/合同复审，不是独立审计或安装包验收。

仍受2.0.17缺件影响：F1/R1指定原件的来源/hash/签名核验及旁置恢复、候选路径和新client绑定审阅、两种准入检查；R6/F3/F4实际Desktop编辑/冲突恢复/审核/键盘/宽窄窗口；原生打开及对话草稿保全；正常退出重开与后续安装包升级恢复/发行验收。本次只读确认旧指定恢复路径与计划旁置应用仍不存在，现应用Info.plist仍为2.0.18。恢复件本身不等于上述验收通过，也不重置真实调用预算或授权2.0.18替代路线。

不受恢复件影响的A1正式测试遗漏已经关闭；其他阶段5业务合同、页面、资源及API映射等工作仍按各自计划和前置条件推进，本报告不宣称这些独立范围完成。前轮905/903/2及P2未修复报告保留为历史，本报告和最新状态更新其当前结论。

全部本轮证据：`/Users/tinadong7036/Documents/开发项目/dsh-lab/.local/p2-mac-paths-20261021/`。
