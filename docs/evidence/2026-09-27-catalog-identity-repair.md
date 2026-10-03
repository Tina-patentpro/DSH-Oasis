# Fast目录身份分离修正证据

## 当前结论

PASS：本次目录/详情身份分离修正及开发Desktop只读核对目标已通过。用户要求Computer Use代操作后，在原开发副本完成一次实际核对，出现调用确认区，原REMOTE_SERVICE_MISMATCH未重现。仅此只读目标通过，真实上传/生成及S6整体未验收；单代理增量自审，不是独立审查。下方待安装/待核对条目为阶段记录，由末尾实际操作证据覆盖。

## 根因与授权边界

用户截图prepare-api为REMOTE_SERVICE_MISMATCH。用户授权Computer Use后，在既有Edge网站空表单刷新一次，只读取页面正常产生的目录/详情响应：目录请求19800.165及详情19800.169均HTTP200/code200。有效Fast完整endpoint唯一；目录条目ID211，详情服务ID39/name权利要求书生成-Fast/Workflow/is_async0/price3。原实现将两种ID要求相等，导致唯一服务匹配失败。未读取/保存请求头或凭据，未上传/生成。目录ID211是本次观察，不是新增常量。

用户明确“按此计划开始执行”，限定修正专业API Fast统一链路，保持创建id39；Basic、legacy入口、日常DSH、依赖升级、真实上传/生成与提交推送不在范围。

## 实施

- 新可选catalogEntryId独立冻结目录身份；apiId仍是详情及创建身份。准备按完整endpoint唯一选择，独立核对固定Fast详情。
- 确认、上传前及创建前验证冻结目录ID/endpoint/process；重复或变化拒绝，详情/schema/价格/账户/项目校验保留。
- 绑定、执行与产物快照贯穿catalogEntryId，跨快照一致性和输入哈希覆盖；旧记录不补默认、不迁移、不重算哈希。生产旧准备缺目录身份拒绝新外传；未知创建不重发。
- 统一页面提供安全服务不匹配提示，不暴露内部数据，不自动重试。

## 命令与证据

执行器：C:\Users\TinaD\.cache\codex-runtimes\codex-primary-runtime\dependencies\native\powershell\pwsh.exe，login=false；Python C:\Users\TinaD\AppData\Local\Python\pythoncore-3.14-64\python.exe。

离线包装器：D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\.dsh-test\catalog-identity-work.py，使用固定构建、私有Node及原网络隔离guard，不读真实Profile。

证据根：D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\.dsh-test\catalog-identity-20260927

| 检查 | 原始记录 | 结果 |
| --- | --- | --- |
| baseline | baseline.json、before、git-status.txt、git-diff.txt | 退出0，193项 |
| 初始RED：Fast/Host/UI | test-1790511586195090600.log | 退出1，35通过/34失败；复现旧匹配错误 |
| 边界RED：缺目录ID | test-1790511729937074600.log | 退出1，52通过/1失败；通用错误需改安全服务错误 |
| 最终定向Fast/Host/UI/claims执行/绑定/domain/contract | test-1790511745896018400.log | 退出0，128/128 |
| verify：tsdown、全test、npm pack --dry-run --json --ignore-scripts --offline | verify-1790511758533631300.log及同名json | 三项退出0；691测试，689通过/0失败/2跳过；109包文件 |
| 候选哈希清单 | verified-1790511758533631300.json | 193项 |

两项跳过为既有条件测试：approved isolated Home admits only the explicit native offline flag；isolated Host declares native services before accessing Cordis context。未声称这两项本批运行。

本批增量自审及复核退出0：主源码与固定构建的实际193项完整匹配候选；相较基线仅11项变化（5源码、4测试、2生成lib），无文件增删。git diff --check退出0，仅换行提示。原安装包109项仍完整匹配account-identity-20260927/artifact.json，未安装本候选。

关键合成覆盖：目录211/详情39通过实际Host装配与RPC；创建body.id39；动态目录987亦可首次准备；目录ID/endpoint/process/重复条目在三个阶段阻止创建；快照篡改拒绝；缺字段历史读取保持；未知创建重开后不再上传/创建。所有上传/创建均为合成客户端，不是生产请求。

## 待完成

1. 原任务一次实际只读服务核对。未决运行先观察，不勾选上传费用或生成。真实生成仍需独立明确授权。

## 本批安装与启动（2026-09-27 12:50 UTC）

用户明确“开发副本已退出”，新鲜进程检查为空后执行。沿用已检查的限定安装器，仅将包装器候选清单及证据/备份目录指向本批；无源码再改、无新增依赖或新运行环境。

- 包装器：D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\.dsh-test\catalog-identity-install.py；deploy backup/pack/install/finalize及launch refresh/check/start/runtime全部退出0。
- 备份：D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\.dsh-test\isolated-dev-20260913\backups\catalog-identity-before-20260927。13,707项原文件逐一复制及哈希核验，两项日常控制文件记录基线；进程退出状态在备份前后复核。
- 安装证据：D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\.dsh-test\isolated-dev-20260913\evidence\catalog-identity-20260927。artifact.json包含109项，包SHA256为28605680c965ecdfb9ef99bcbdf2038fecba13c61afac3de78c897edc100805c。
- installation-verified.json：13项获准插件/包管理元数据变化，13,694原文件保持，其他依赖内容/锁文件条目保持；既有peer依赖警告未通过升级处理。
- 仅刷新准入v3固定pin哈希，21项设置/业务/项目文件保持，不写settings或launcher。check-1790513376841742900.json及start-1790513391297285600.json均退出0。
- 新启动run 3154a598-d6e6-4f5b-80f3-c8a481919f5f：12:49:49.328Z开始，12:49:53.522Z完成且renderer healthy；主PID51444，Host仅监听127.0.0.1:43121。
- catalog-identity-post.py退出0，postcheck.json核验109项安装文件和193项主源码/固定构建仍匹配候选；21项保护文件及两项日常控制文件不变。历史2026-09-23日常设置变化归因仍未解决，不删除或覆盖旧证据。
- 没有实际上传/生成、自动重试创建、提交推送或操作日常DSH。启动完成不代表prepare-api真实业务核对通过。

下一步用户在workspace-a原权利要求任务选择专业API，仅点击一次“核对服务与材料（读取账户与目录）”，回传结果或安全错误截图；不确认上传费用或生成，不再要求退出重装。

## Computer Use实际核对回执

用户明确“请你用computer use来操作”。使用computer-use Skill的@oai/sky，通过list_apps选择返回的唯一开发窗口：window 4262802，app精确指向isolated-dev-20260913\app\DSH Desktop.exe；未操作另一个日常Desktop窗口。UI确认版本2.0.9、Host127.0.0.1:43121、workspace-a。

操作序列：点击“打开技术研发与中国发明专利工作台”，等待加载；保留已有权利要求书任务98d68e38-3dc7-4060-9187-922a35d11b4a及专业API来源，技术交底仍为“本次仅测试界面”，未选择上游文稿；仅点击一次“核对服务与材料（读取账户与目录）”。UI先锁定输入，后恢复并显示“本次 API 调用确认”。

实际UI结果（工具截图与accessibility tree在本会话中）：生产目的地https://lzhxpy.oasisintwrite.com；服务权利要求书生成-Fast；已显示账户及显式关联网站目录；technical-disclosure.txt拟上传21字节，四字段共7字符，参考费用3、余额234（单位未另核）。不在证据文档重复账户/项目具体标识。原服务不匹配错误未出现。

停止边界：上传/费用复选框未勾选，“确认上传并生成”禁用；没有输入或改写材料，没有上传、生成、重试或新运行。可保留当前确认界面供用户查看。此回执只证明现有构建的实际只读核对及确认UI，不证明真实生成链路；后续真实调用需另定材料和费用授权，不自动消费历史许可。
