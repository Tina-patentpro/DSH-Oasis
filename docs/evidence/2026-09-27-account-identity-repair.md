# Fast 账户身份兼容修正 — 2026-09-27

## 当前结论

BLOCKED_WAITING_FOR_USER：用户确认“已退出”后，本候选已备份、限定安装并重开原开发 Desktop，启动及保全核验通过；现在只等待用户在原任务做一次只读业务核对。尚无本候选真实 Fast 目录/账户/项目联检成功证据。不上传、不真实生成、不自动重试、不操作日常版本，不提交推送。

## 故障证据与修正边界

用户 Network 截图显示 prepare-api 返回 REMOTE_ACCOUNT_UNVERIFIED，message 为 Oasis authenticated account identity is unavailable。截图：C:\Users\TinaD\AppData\Local\Temp\codex-clipboard-cabe2ce2-e04c-4e70-93e9-50b74024c4d9.png。

网站现有用户详情归一化允许详情缺少 id 时使用登录身份；插件原逻辑只接受详情自带数字 id。尚未获取本次上游原始详情，不能声称线上响应已确定缺字段而不是字段类型异常。本修正覆盖已证实的兼容缺口，实际故障解除仍须安装后只读核对。

- 从同一次 DSH credentials grant 捕获固定 origin、accountId、revision 与 Token 解析闭包；身份不含秘密，复制原始标量，防止提供方原地修改记录。
- 仅成功详情对象缺少自有 id 时允许使用该身份。显式字符串、null、undefined、非法数字及冲突身份仍拒绝，不强转，不从目录或用户名猜 ID。
- 请求后复核同次登录仍有效；账户、Token、origin、revision 变化或退出使闭包失效。生产身份不能用于非生产环境。
- 七处远端账户校验共用该规则，项目 owner、关联归属、运行冻结、费用/外传确认及未知结果不重发仍保留。
- 界面增加安全的账户未核实、账户不匹配、登录状态变化提示，不暴露原始异常或凭据。

## 新鲜验证

显式 shell：C:\Users\TinaD\.cache\codex-runtimes\codex-primary-runtime\dependencies\native\powershell\pwsh.exe，login=false / -NoProfile。执行入口：C:\Users\TinaD\AppData\Local\Python\pythoncore-3.14-64\python.exe 调用 D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\.dsh-test\account-identity-work.py。

| 步骤 | 结果 |
|---|---|
| baseline | 退出0，主源码/固定构建193项逐字节一致，保存原文件及Git差异 |
| 红灯：账户/Fast/Host/UI回归 | 退出1，67项中53通过、14失败；缺ID实际Host装配复现原错误，新接口及提示未实现导致预期失败 |
| 绿灯：上述四组及claims-api-execution、oasis-workspace-binding、oasis-runtime-snapshot | 退出0，117/117通过，无跳过 |
| verify：tsdown构建 | 退出0 |
| verify：完整既有测试 | 退出0，675项，673通过、2既有条件跳过、0失败 |
| verify：npm pack --dry-run --json --ignore-scripts --offline | 退出0，109项包内容 |
| 构建后逐文件复核 | 退出0，主源码及固定构建193项均匹配本批verified清单，无新增/删除；相对本批基线仅4源文件、4测试、2生成lib变化 |

实际 apply(ctx) → RPC 测试用合成认证详情缺ID，验证核对与预览成功、无上传/创建及无新remoteExecution；另有合成Fast全链路共同结果回归。两者均为离线模拟，不是生产调用。验证使用既有网络阻断器与隔离临时HOME，不读取真实账户。

原始记录目录：D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\.dsh-test\account-identity-20260927。

- 红灯：test-1790505012301288700.log
- 绿灯：test-1790505090839412200.log
- 完整验证：verify-1790505261496772400.log 及同名JSON命令退出码记录
- 已验证候选：verified-1790505261496772400.json
- 原字节及差异：before、baseline.json、git-status.txt、git-diff.txt

单代理增量自审，非独立审查。两项跳过为旧隔离Home/Host条件测试，不计通过。未扩大为安装包、生产接口或S6整体完成。

## 下一步与停止条件

用户已确认保存退出，随后再次检查开发进程为空，建立本批新备份，完成限定离线安装、其他依赖/业务文件保全、准入和启动核验，详见下节；不再要求重复退出或安装。

安装后由用户在原任务只做一次“核对服务与材料”，返回成功页或安全错误码；不勾选上传/费用确认，不确认生成。外部修改、候选漂移、进程仍运行或需新增真实调用授权时停止相应步骤，不清除旧任务或解除归属校验。

## 用户退出后安装与启动

用户明确回复“已退出”。沿用已检查的限定安装与启动脚本，仅为本批指定新的backup/delivery/evidence目录及已验证候选清单；入口为 D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\.dsh-test\account-identity-install.py 与 account-identity-post.py。未另建运行环境、未改业务源码或重新运行未变化的全量测试。

| 操作 | 新鲜结果 |
|---|---|
| deploy backup | 退出0，开发进程为空，原固定pin/候选匹配；13,709文件复制并逐项校验，两项日常控制文件取哈希 |
| deploy pack | 退出0，109项；SHA256 1bd4b0a6cfdc1b3049d920182ac8e836d45ce476c6368479d0a37c17674e3be3 |
| deploy install | 退出0；--offline / --ignore-scripts，安装前重核checkpoint及候选 |
| deploy finalize | 退出0；109项安装文件匹配，仅12项许可插件/安装元数据变化，13,697原文件保持，其他依赖及锁内其他包不变 |
| launch refresh | 退出0；只刷新准入v3固定哈希，21项设置/业务/项目文件保持，未写设置或启动器 |
| launch check / start | 均退出0；check-1790507329384192900.json、start-1790507342976981700.json |
| launch runtime / post | 均退出0；本次renderer healthy，主PID16948，Host监听127.0.0.1:43121；安装109项、主源码/固定构建193项匹配，21项保护文件与两项日常控制文件保持 |

新鲜启动run：d9bc052c-4e42-4fe9-b282-51e5496607fa，2026-09-27T11:09:01.199Z开始，11:09:05.356Z完成。端口本次为43121，不沿用上一运行43120。renderer healthy只证明启动，不替代专业API业务验收。

安装证据目录：D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\.dsh-test\isolated-dev-20260913\evidence\account-identity-20260927。

备份目录：D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\.dsh-test\isolated-dev-20260913\backups\account-identity-before-20260927。

安装日志仍有peer dependency警告；未扩大为依赖升级或额外安装，其他依赖保持核验已通过。两项日常控制文件只证明本次安装窗口未变，不扩大为日常全部文件审计；09-23历史变化归因仍未解决。未自动请求真实Fast核对、上传或生成。单代理保全自审，不称独立审查。
