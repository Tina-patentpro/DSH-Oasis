# 账户登录与项目统一保存 — 源码与原开发副本安装验证

当前目标状态：BLOCKED_WAITING_FOR_USER。源码验证、原开发副本安装及启动健康检查已完成；用户截图已确认登录设置界面与新任务默认来源，待项目保存与重开验收。实际登录及真实API生成尚未验证；单代理自检，不冒充独立审查。

## 已实施

- 产品Host及API材料准备均使用发行常量 https://lzhxpy.oasisintwrite.com；旧Profile地址、环境、下载来源不控制产品请求目的地。纯底层历史适配测试仍可注入离线传输，不作为用户环境入口。
- 原生设置使用手机号验证码/密码登录。Host调用网站既有send/login/pwdlogin路径；不引入刷新令牌或设备码假设。JWT只写本插件的DSH grant record，Client得到登录状态/账户ID/不透明revision；不读取旧手填JWT。普通错误不返回远端正文或敏感输入，禁重定向、限制响应体、20秒超时、发送验证码冷却、并发/晚到账户变更拒绝。退出只删除本插件record，不调用网站logout。
- 新任务固定local-skill，旧偏好不再生效；用户任务内切换来源与已有任务选择不改写。移除可见默认来源、绿洲目录、origin、JWT和环境控件。
- 新保存默认项目根目录，Host依据已选运行时间（北京时间）、runOrder版本和来源命名。示例：权利要求书_20260922-143000_v1.md、权利要求书_20260922-143000_v2_OIW.md。原artifact正文、哈希和suggestedFileName均保持；追溯元数据记录实际保存名。
- Markdown与追溯JSON排他新建，遇已有同名文件拒绝。根目录双文件不是事务：部分失败保留已创建文件，返回恢复清单，确认令牌已消费，不自动重试/删除。历史子目录保存记录仍可读；文件打开继续走原生Sidebar接口。

## 新鲜证据

执行器：显式powershell.exe，login=false；Python调度固定私有Node24.19.0。复用原有source-promotion依赖树，没有安装第三套环境。测试前171文件字节快照保存在本地证据目录。

证据根：D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\.dsh-test\s6-account-20260922

| 验证 | 结果 |
|---|---|
| red-account-1790041863357614500.log | 新账户模块缺失，测试按预期失败；调度器打印编码问题修正为UTF-8，未改测试结论 |
| green-account-1790042004515464400.log | 4通过，退出0 |
| red-settings-1790042073236439300.log → green-settings-1790042159294746400.log | 新产品设置模块缺失→账户/设置5通过，退出0 |
| red-root-1790042278274819600.log → green-root-1790042337372857400.log | 根目录/命名3项红灯→20通过，退出0 |
| affected-1790042490618054300.log | 受影响49通过，退出0 |
| safety-1790042594411184100.log | 账户、Host RPC、API根目录/版本/旧哈希及产品地址42通过，退出0 |
| verify-1790042746641372300.log | tsdown构建退出0；579项中577通过、2既有条件跳过、0失败；pack dry-run102文件退出0 |
| verified-1790042746641372300.json | 本批最终179项src/test/lib输入输出哈希；主目录与既有隔离构建目录一致 |

完整验证为既有verify的三个步骤，显式执行Node→tsdown、node --test test/*.test.mjs、npm pack --dry-run --json --ignore-scripts --offline；lib在验证成功后同步回主目录。未运行安装/发布脚本。两项跳过为旧native-offline隔离准入条件测试，不作为本次真实运行证据。

第一轮全量发现9项旧合同断言（路由数量、旧环境/凭据、旧目录/偏好UI），逐项更新到批准合同；首次构建复验剩1项旧“配置API”文案断言，更新为登录提示后最终验证无失败。不是忽略测试。

## 安装前保全记录

02:06:07Z只读preflight退出0：原开发Desktop PID14828、Host PID7588仍运行；日常Desktop PID2384仍运行。开发旧设置地址/credential origin为空、本地模型关闭；Node与锁文件pin均匹配。本轮未覆盖安装包、未改运行Profile/pin/日常DSH，未真实登录/短信/上传/调用/扣费，未Git提交推送。

用户已返回“开发副本已退出”；02:10:33Z复查开发进程全部退出，日常Desktop PID2384仍运行。以下安装只针对原isolated-dev-20260913，不新建环境。

## 09-22 原开发副本安装与启动

恢复快照：D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\.dsh-test\isolated-dev-20260913\backups\s6-before-account-20260922

安装证据：D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\.dsh-test\isolated-dev-20260913\evidence\s6-account-20260922

执行器仍为显式powershell.exe。s6-account-deploy.py复用既有有界安装脚本，绑定本批已验证输入与全新备份路径；s6-account-launch.py复用既有启动器并保存旧准入，不修改用户设置。助手未调用真实短信、登录、上传或生成。

| 步骤 | 新鲜结果 |
|---|---|
| python .dsh-test/s6-account-deploy.py backup | 退出0；13,657文件备份及双向哈希校验，3项日常控制文件基线。首次运行因记录中误写180项、实际179项而在任何安装修改前停止；核对原始清单并更正计数后成功，未跳过哈希检查 |
| 同脚本 pack | 退出0；102个包内文件逐字节与主源码一致；归档SHA-256为2fe73d0d22479e6773287296a89d7d4977a97fce5b074947b3c87194b45f3f65 |
| 同脚本 install | 退出0；固定私有Node执行pnpm 11.25.0，--offline --ignore-scripts，禁止自动peer安装。与09-20旧日志相同的peer提示保留；未升级或补装其他依赖 |
| 同脚本 finalize | 退出0；安装包102文件全部匹配；13,632原文件未变，25项允许的插件/安装元数据改变；其他锁文件依赖和解析位置保持，新增文件限于插件及包管理元数据；更新对应pin |
| python .dsh-test/s6-account-launch.py readmit / check / start | 全部退出0；旧admission另存，新准入绑定当前设置及新pin。未改变启动器、旧合成默认入口或运行设置；显式--s6-ui-check启动 |
| 同脚本 runtime | 退出0；02:19:23Z开发主PID33628、Host PID33372监听127.0.0.1:43121；本次run 61291909-c65c-44f2-9907-8580ef11d213 的startup.run.completed及renderer均healthy；10项旧业务/Workspace文件与3项日常控制文件哈希保持 |

旧准入字段apiBaseUrlEmpty/credentialOriginEmpty只描述历史设置为空，不再表示新产品没有API地址。新包使用发行常量，账户操作须由用户明确点击；本次未触发。实际登录、生产可达性和登录后凭据持久化未验收。Desktop、DSH、Sidebar和Cordis固定版本未变。未Git提交/推送。

## 用户返回的两项界面证据

- C:\Users\TinaD\AppData\Local\Temp\codex-clipboard-feecf6b2-6114-4836-80a6-ffbd88851d18.png，SHA-256 E7395314BE1BE11A359C46290A8C2D25067F547B2D1F773A9D9A0F3BD2723E66：原开发Desktop2.0.9原生设置显示手机验证码登录、手机号/验证码空框、发送/登录按钮及项目绑定区。旧origin/JWT/环境/默认来源/保存目录控件不再显示。截图仅展示验证码模式，密码模式交互尚未单独展示；没有登录成功证据。
- C:\Users\TinaD\AppData\Local\Temp\codex-clipboard-59dae01d-a003-44fb-be7a-ef9863f3c428.png，SHA-256 EE6133EA859D9085BCAD7B917D1CEBEF57C79FD729EBA0ABF05E403004B60CBB：workspace-b新业务任务选中本地Skills，输入为空、暂无生成内容。本地Skills未启用提示与第一张图未勾选真实模型生成一致；默认来源选择与允许真实模型调用是不同状态，不能将此图当作生成已可用证据。

本轮只登记用户截图和读取当前保存组件说明，未改代码、Profile、进程或凭据，未调用任何真实服务。两项截图文件哈希读取退出0。

## 下一步人工验收

1. 切回workspace-a，打开原有已审核合成结果，在“项目回写”点击“准备回写清单”。无需生成新内容、修改审核、开启真实模型或登录。
2. 返回“待确认目标”及文件名截图，先不点击“确认保存到项目”。检查目标确为当前workspace-a根目录；已有本地来源结果应不带_OIW，不覆盖原有子目录文件。
3. 清单正确后验证排他保存与原生文件打开。专业API的_OIW命名目前仍只有源码/合成测试证据，不用本地旧结果冒充API产物。实际登录和真实生成按用户操作/材料费用确认分开记录，不重复已完成隔离和预览测试。
