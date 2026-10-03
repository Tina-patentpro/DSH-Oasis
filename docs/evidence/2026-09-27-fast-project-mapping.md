# Fast 项目关联接线 — 离线候选证据

## 当前目标与授权

状态：**BLOCKED_WAITING_FOR_USER**，原开发副本已安装并重开，现等待本批 Desktop 界面的 Fast 只读核对结果。用户已明确“本轮仅使用fast进行测试”并同意实施，退出后又明确“按此计划开始执行”；安装与启动证据见下方续接记录。没有真实上传、创建生成或费用调用，不据此宣布生产链路或 S6 完成。

计划：D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\docs\plans\2026-09-27-fast-project-mapping.md。

## 实施合同

- 复用原“核对服务与材料”按钮和 task/prepare-api，显式只读确认后读取已关联网站项目的账户、目录、Fast详情和项目归属；不恢复手填绑定、JWT、地址或环境设置。
- 正式统一流程只接 service39 / 权利要求书生成-Fast / 同步文字输出。发行合同基于同日先前已记录的网站实际详情，规范化固定指纹为 4adaf95b2e1579bf495eb9ff79966a5ae6404cd0ee89f79dde352fd97a929303；不把价格永久锁为3，每次认证读取并冻结当前价格。
- api_process 来自唯一匹配目录项，不编造生产值。账户及 folder owner_id 必须匹配显式项目关联。映射只缓存于 Host 内存，settings revision、完整关联和 Workspace 路径不符即拒绝；不写 settings。
- 上传前和创建前复核项目、服务、费用及输入；新增必填或字段约束不能在 normalization 中被忽略。继续复用旧的单次确认、未知结果不重发、共同未审核产物、保存和对话资料合同。
- Basic 和异步附件生成不在本轮接线范围，不自动切换。

## 新鲜验证

Shell：显式 PowerShell executor，login=false；本批前已确认实际进程使用 -NoProfile。私有 Node v24.19.0；不安装或升级依赖。测试使用隔离临时 HOME/Profile、阻断外网 fetch 的既有 guard 和合成传输，不使用真实账户凭据。

构建工作目录：D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\.dsh-test\source-promotion-20260915\source\packages\oasis-professional-service。

本批辅助入口：D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\.dsh-test\fast-mapping-work.py。

| 检查 | 结果 |
|---|---|
| 修改前主源码/构建基线 | 190项一致，退出0；保存原字节、Git状态和差异 |
| 首批新 Fast 测试 RED | 19项在未接线时失败，退出1；test-1790472421408330300.log |
| 第一轮 GREEN | 19/19，退出0；test-1790472539899751000.log |
| 原始字段约束 RED | 22项中3项失败，证实 required/max_length 被旧规范化忽略；退出1；test-1790472822319043600.log |
| 最终定向回归 | 119/119，0失败，退出0；test-1790472890670085700.log |
| tsdown --config tsdown.config.mjs | 退出0 |
| node --import network-guard --test test/*.test.mjs | 653项：651通过、0失败、2既有条件跳过，退出0 |
| npm pack --dry-run --json --ignore-scripts --offline | 109项，退出0；包含新增发行合同模块 |
| 验证后源码/测试/生成lib | 主仓库与固定构建193项一致，无删除；相较本批基线仅10项变化 |

完整构建/测试/包清单日志：D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\.dsh-test\fast-mapping-20260927\verify-1790472950264978700.log。
逐命令和退出码：同目录 verify-1790472950264978700.json。
候选逐文件哈希：同目录 verified-1790472950264978700.json。
两项跳过仍为旧隔离 Home 路径条件相关测试，不改称已执行安装验收。

## 自审与保全

采用单代理自审，**非独立审查**。对照本批开始字节而非仅 Git 总差异检查授权/项目归属、晚到响应、来源限定、价格冻结、原始schema约束、确认前零上传/创建以及用户解除关联的并发边界。发现并修正原始字段约束可能被忽略的问题，保留 RED/GREEN。三个既有失败用例更新生产测试数据以经过新 Fast 准备流程，未放宽其原断言。

本批包内变化：4个源码（含1个新增）、4个测试/fixture（含2个新增）、2个生成lib。其余183个基线文件字节保持，无删除。保留此前所有未提交工作；未暂存、提交、推送、安装或触碰日常 DSH。

候选 SHA256：
- src/oasis-fast-contract.js：aff47700170418b181eae5659a25a2782dd82f9f324a26bd7af69ee51913615c
- src/oasis-remote-service.js：d318065384f74d70137e6651579e87ca9fcfae1b73987fcee25e12197fc0b7d1
- lib/client.js：caadc58bb47f23d291bb970dfc3380144a5f6646a25232013cecf0fab814ae5c

## 未验边界及下一步

1. 本批退出、备份、原开发包更新及启动保全核验已执行，见下方记录；不再重复安装或要求退出。
2. 用户在已打开的原开发副本进入 workspace-a 原权利要求任务，选择“专业 API”，点击一次“核对服务与材料（读取账户与目录）”，回传结果或错误截图；不勾选上传/费用确认，不点击确认生成。核对实际 Host 认证目录、Fast合同及项目归属，确认页展示真实参考价格/余额；合成 catalog process 不是生产目录证明。
3. 真实测试前单独确认确切材料、当前参考费用和一次 Fast 创建预算；不因用户同意源码接线而自动上传。TXT与极简字段省略的业务决定仍有效，但真实输出尚待验证。

原结果、审核、路径及已导入文件不得移动或覆盖；不重复已收口的隔离/预览/附件导入测试。原生DOCX预览及隔离 Desktop 另存为路径关注项不在本批修改范围。

## 中断续接、限定安装与启动（2026-09-27）

从“插件开发3阶段”恢复时，最后完成步骤为 `deploy backup`，不是安装。2026-09-27 10:07:45 +08:00 只读核验退出0：13,698个备份文件及对应原文件均匹配 checkpoint，两项日常控制文件未变；本批安装证据目录为空，打包目录不存在，原开发进程为0；主源码与固定构建各193项及文件集合匹配已验证候选。复用这份有效备份，不重复备份、不覆盖既有证据。

用户随后明确“按此计划开始执行”。Shell 为显式 PowerShell executor（login=false / -NoProfile）；Python 为 C:\Users\TinaD\AppData\Local\Python\pythoncore-3.14-64\python.exe，开发私有 Node 为 v24.19.0。沿用既有 fast-mapping-install.py 和 fast-mapping-post.py，不修改源码、依赖版本、启动器、账户设置或业务数据，不新增运行环境。

执行入口：D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\.dsh-test\fast-mapping-install.py。

| 操作 | 新鲜结果 |
|---|---|
| deploy pack | 退出0，109项；归档 SHA256 11eea3a5a34380179ba49321ce13998a805cce06b6e92356675014544519c3b9 |
| deploy install | 退出0；--offline / --ignore-scripts，安装前重核固定pin及checkpoint |
| deploy finalize | 退出0；安装109项匹配候选，仅11项获准插件/安装元数据变化，13,687项原文件保持；其他依赖及锁内其他包保持 |
| launch refresh | 退出0；只更新准入v3固定哈希，21项设置/业务/项目文件保持；未写设置或启动器 |
| launch check | 退出0；check-1790475355734835000.json |
| launch start | 退出0；start-1790475386582951000.json，原开发主PID35160 |
| launch runtime | 退出0；Host 127.0.0.1:43120，本次renderer healthy，业务文件保持 |
| fast-mapping-post.py | 退出0；安装109项及源码/构建193项匹配，21项设置/业务/项目文件与两项日常控制文件保持 |

本次启动run：8d0ba294-edb1-4dd1-9b35-16a56af94f90；2026-09-27T02:16:24.424Z开始，02:16:32.468Z完成。启动记录新于本批准入，不用历史healthy代替，也不将renderer健康等同业务界面验收。

原始命令/安装日志、逐文件清单、准入及postcheck.json：D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\.dsh-test\isolated-dev-20260913\evidence\fast-mapping-20260927。

安装日志有peer dependency警告；未扩展安装或升级来处理，其他依赖/锁记录保持的核验已通过，不将警告视为新故障或宣称已消除。两项日常控制文件仅证明本次窗口哈希未变，不扩大为整个日常Profile保全审计；09-23历史设置变化归因仍未解决。

本轮单代理保全自审，非独立审查。当前候选输入未变，按项目规则不重复先前全量测试，不把先前651通过/2跳过写成本轮新跑结果。保留所有既有未提交工作；未暂存、提交、推送，未自动生产核对、下载、上传或生成。下一步仅收取Desktop只读核对证据，真实调用预算仍待明确确认。

## 本次Desktop只读核对失败反馈

用户在重开后回传：“操作未完成。请检查连接和当前材料；如已有未决任务，请先查看原运行。不会自动重试。”因此本批Fast业务核对尚未通过；上方安装/启动证据不代替此项。

随后只读检查（显式PowerShell、内存Node命令，退出0）以现有构建模块校验当前存储，fetch被禁用，不调用凭据或远端：当前API任务为claims v2 / claims-disclosure-2，四字段长度7/0/0/0，输入映射有效，无上游或文件引用；两项目全部任务无未决本地或API运行，runs及remoteExecutions与安装前备份一致，当前没有新API执行记录。未输出材料正文。

源码确认上述提示是generationErrorMessage的通用回退，多个错误码或无code异常均可能触发；apiResult还会将非WorkspaceMaterialError转换为API_OPERATION_UNCONFIRMED。当前Desktop日志没有对应错误记录，不能据此确定具体请求或根因，也不能据“没有新API执行记录”扩大断言全部网络行为。

当前仍为BLOCKED_WAITING_FOR_USER：已请求用户在原开发Desktop打开开发者工具Network，筛选oasis-workbench，仅再做一次只读核对，回传失败请求名称及result.error.code。不要回传请求头、Cookie、Authorization或整份响应，不确认上传/生成。若开发者工具不可用先回报，不绕过Desktop凭据或猜测错误后修改代码；本轮尚未针对该错误更改实现或重装。

后续已收到prepare-api的REMOTE_ACCOUNT_UNVERIFIED截图，并获用户批准账户身份兼容修正；源码及离线验证完成，等待保存退出后限定安装。上段“待错误码/尚未改实现”仅为历史状态，最新记录：D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\docs\evidence\2026-09-27-account-identity-repair.md。旧Fast启动证据不代替新候选安装或实际业务核对。
