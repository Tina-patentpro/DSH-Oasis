# S6 原开发副本离线安装与首次启动

日期：2026-09-20。当前目标状态：**BLOCKED_WAITING_FOR_USER**（待实际界面验收及正常退出/重开）。已安装并首次启动，不表示 S6 真实 API 验收完成。

## 授权及边界

用户明确沿用原开发副本、不新建第三套环境，并同意执行调整后的方案；本次用户回复“开发副本已退出”后再次查进程为空才实施。方案见 D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\docs\plans\2026-09-20-s6-existing-desktop-acceptance.md。

唯一目标：D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\.dsh-test\isolated-dev-20260913。未操作日常 DSH、全局 CLI、真实 API 或模型；未提交/推送。单代理自审，无独立审计。未重复已完成通用隔离及预览演练。

## 新鲜执行证据

命令执行器 cmd.exe；辅助脚本内进程读取使用 PowerShell -NoProfile -EncodedCommand，安装子进程通过 Python 参数数组与隔离环境启动。以下辅助脚本位于 D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\.dsh-test。

| 步骤 | 结果 |
| --- | --- |
| s6-ui-preflight.py --settings-only | 07:09:27Z 进程为空；原生 settings.yaml 无绿洲 namespace，实际插件安全默认值为 API 空、本地模型关闭。没有打印凭据 |
| s6-ui-deploy.py backup | 退出0；13,648文件逐项备份/源与副本哈希校验，退出后再次复核源稳定；保存3项日常控制文件哈希 |
| s6-ui-deploy.py pack | 退出0；97个包文件与已验证主源码/lib逐字节匹配，本批173项输入及lib仍匹配源码验证回执 |
| s6-ui-deploy.py install | 退出0；固定pnpm11.25.0，--offline --ignore-scripts，禁自动peer安装；只加入本地tgz |
| s6-ui-deploy.py finalize | 退出0；97安装文件等于tgz，13,620个备份文件原样，28个原文件变化只在绿洲包及必要安装元数据；其他依赖内容与锁条目不变，Profile bundle组合不变；日常3项控制文件哈希不变 |
| 私有Node --test .dsh-test\s6-launch.test.mjs | 修改前2项按预期失败；修改后2/2通过，退出0。覆盖默认合成模式保持、同一Home/参数、新模式不继承生成标志、无证明/设置漂移/危险标志/错误Home拒绝 |
| s6-ui-launch.py admit / check | 均退出0；设置与部署配置无API启用，localModelDisabled；原Home/userData、EXE/ASAR、安装pin及私有Node预检通过 |
| s6-ui-launch.py start | 退出0；原开发Desktop PID20856，显式 --s6-ui-check，未启动第二套环境 |
| s6-ui-launch.py runtime | 07:18:07Z退出0；Host仅127.0.0.1:43120，startup run db8d7186-78a3-45f9-8b14-9b27642c007a completed，rendererStatus=healthy；10项既有业务存储/Workspace文件及3项日常控制文件哈希不变 |

包 SHA-256：987db36318feeecfee1813ce61a4373fd85a4f80f179aa54510f76c50ea79e2d。

安装器提示 peer dependency warning，本批没有以此更新宿主依赖。日志的 downloaded=1 是本地归档输入计数；实际命令为 --offline，包与锁文件/其余依赖已逐项复核。Host启动与renderer健康不等于已证明所有绿洲界面加载，后者仍待人工截图。

## 保存位置

- 备份：D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\.dsh-test\isolated-dev-20260913\backups\s6-before-ui-20260920。包含原插件、安装元数据、Home/业务/界面状态、Workspace、启动器与旧pins；不是可运行第三套环境。
- 归档：D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\.dsh-test\isolated-dev-20260913\delivery-s6-20260920\oasis-professional-service-0.0.1.tgz。
- 回执：D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\.dsh-test\isolated-dev-20260913\evidence\s6-ui-20260920（artifact、install、installation-verified、admission、check/start/runtime及launch-green日志）。
- 红灯日志：D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\.dsh-test\s6-launch-red.log。

## 启动与恢复规则

仅原 launch.mjs 增加 --s6-ui-check；默认 start-development.cmd 仍沿用原合成模式，不修改快捷方式或日常安装。新模式不设置 OASIS_UNIFIED_FIXTURE / OASIS_NATIVE_OFFLINE，同一Profile/锁/私有环境及原代理约束保持。

Ruling：不向启动器增加另一个YAML依赖。由既有解析器只读核对实际原生设置/部署层并产生本地admission（只有布尔结果和哈希），启动器必须读取并验证当前 settings.yaml 和配置/pin 的精确字节。设置变化后拒绝使用旧admission，必须重新只读核对；不静默覆盖设置，不接触凭据。此次namespace缺省且源码默认值已核对，API/真实模型均不启用。代理不是唯一控制。

如需回退，先正常退出并保留失败现场及新增数据，再成套恢复备份中的插件/元数据/启动器和相应业务快照；不能只降插件。当前没有执行回退或删除任何历史证据。

## 本次人工验收

保持API未配置、本地真实模型关闭，不点击读取远程目录、上传、生成或对话发送。

1. 选择workspace-a，打开DSH原生设置中的“绿洲工作台”，确认“当前项目 API 绑定”区域和未配置时的禁用状态，提供截图。
2. 回到绿洲工作台，新建本次验收任务，用极简合成文字填写技术交底；仅切换“本地 Skills / 专业 API”，确认文字保持且出现需配置原生设置的提示，提供截图。
3. 查看原任务结果/审核/保存路径仍在；不修改原结果。之后正常退出，由助手复查并用同一显式验收模式重开，验证新任务草稿保留。

实际账户目录/服务绑定、上传费用确认、真实正文及专业质量不在本次授权范围。现有合成/离线测试只作为源码证据，不用于替代这些验收。

## 用户截图与只读复核（07:36:20Z）

### 后续重开复核（07:43:54Z，覆盖下文待退出状态）

用户明确已退出后，只读确认进程退出、API及credential origin为空、本地真实模型关闭。`s6-ui-launch.py readmit`归档旧admission并生成pre-restart-1789890072866801800.json，未写设置或业务存储；readmit/check/start均退出0。同一原开发目录、Home及userdata以--s6-ui-check启动，PID50044，回执start-1789890223727778900。

`s6-ui-launch.py runtime`退出0：新startup run 7980a556-1e4e-459b-a083-cd3f80c64dbd于07:43:46.476Z完成且renderer healthy，Host为127.0.0.1:43120，3项日常控制文件哈希不变。工具对升级前业务存储的比较为false，是此前用户修改原任务草稿/来源所致，不是重开丢失。

`s6-ui-post-restart.py`退出0：与本次重启前快照比较，设置、完整业务存储及9个Workspace文件共11项SHA全部一致。`s6-ui-screenshot-check.py`退出0：旧runs/remoteExecutions不变，用户输入标记仍在，默认来源oasis-api，远端配置为空且本地模型关闭。当前目标状态BLOCKED_WAITING_FOR_USER：仅待重开界面确认，不用此前截图替代本次证据。无第三套环境、真实调用或Git提交/推送。

### 首轮截图记录

用户提供三张当前Desktop截图：原生“绿洲工作台”设置包含当前项目 API 绑定，Workspace ID 为5967c480-f400-4083-b650-9176dade70d1；读取账户/服务/目录按钮禁用。展开配置显示非生产、API origin空、尚未配置凭据、本地真实模型未勾选。统一业务页选择“专业 API”，技术交底保留“本次仅测试界面”，核对按钮禁用并显示需在DSH原生设置配置专业API/绑定的提示。

截图右侧仍显示旧的“本地 Skills · 合成验收 · 已审核”结果，这是原生成版本的来源，不是当前来源切换触发新API结果。只读检查确认用户实际修改了原任务草稿，而非新建任务；本次接受它作为同页切换与历史结果保全证据，不声称完成新任务默认来源验收，也不覆盖用户改动。

`python .dsh-test\s6-ui-screenshot-check.py` 退出0：业务存储仅5处预期差异（原任务disclosure_text、generation/source及修订/时间戳）；全部runs和remoteExecutions与升级前备份一致，9项Workspace文件哈希不变。当前设置API/credential origin仍空、本地模型仍关闭，默认来源已由用户保存为oasis-api。原审核/结果/保存记录没有变化，未出现新增生成执行。截图原文件SHA及检查回执保存于原开发 evidence\s6-ui-20260920\screenshot-check-*.json。

三张图片路径分别为 C:\Users\TinaD\AppData\Local\Temp\codex-clipboard-fe2cca7f-5aa4-42b1-bd22-9339107749c2.png、C:\Users\TinaD\AppData\Local\Temp\codex-clipboard-47916a89-d2b5-4f0e-8cfb-f7eef3891a3f.png、C:\Users\TinaD\AppData\Local\Temp\codex-clipboard-de241082-051a-43d8-a397-3d21ba53f870.png。

当前待用户正常退出开发副本，由助手重新核对设置并更新准入回执后用同一--s6-ui-check模式重开；不让用户经默认合成入口重开。本步设置已发生用户预期变更，旧admission不得直接复用。重开后的实际草稿/来源/旧结果持久化验收仍待完成，整体仍为BLOCKED_WAITING_FOR_USER。
