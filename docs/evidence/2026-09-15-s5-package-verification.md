# S5 候选包验证与剩余 Desktop 门禁

## 范围

延续已批准 V2，单代理自审。仅候选测试/隔离执行助手和证据记录；不升级版本、不安装包、不访问真实模型/API、不发送草稿，不操作日常实例。候选根为 D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\.dsh-test\isolated-dev-20260913。

## 新鲜验证

全部命令由 cmd.exe 执行，run-source-check.py 以私有 Node 和隔离 Home/cache/temp 执行。

- 构建前新增 evidence\s5-before-package-verify-20260915，保存两个 lib 文件和 package/lock 哈希；重建后四项字节哈希全部一致。
- 首次 verify 遇到 Sidebar 测试将已经安装的补丁再次作为上游输入，哈希门禁正确拒绝。仅将测试输入改为既有不可变安装前备份，并新增 11 个安装文件与补丁输出逐字节相等检查；未放宽上游哈希检查。
- 第二次测试无失败，但打包步骤找不到 npm。仅在候选 build-tools-s5-20260915 新建明确指向私有 Node/既有 npm-cli.js 的 npm.cmd，并纳入验证助手的子进程 PATH；不改系统 PATH、依赖和产品脚本。
- 完整命令 `python .dsh-test\isolated-dev-20260913\run-source-check.py --npm run verify` 最终退出 0。452 项中通过 450、失败 0、跳过 2；build 和 npm pack --dry-run --json 完成，归档清单 93 项。记录 evidence\s3-check-1789442082325735700.json / .log。
- 两个跳过项均来自 native-offline-runtime.test.mjs，条件是旧 stage2-desktop 测试目录不存在；不声称这两项已执行，不创建伪目录绕过条件。
- 单独执行 `python .dsh-test\isolated-dev-20260913\run-source-check.py --test test/s3c-native-markdown-policy.pending-ssr.mjs`，5/5、无跳过、退出 0。记录 evidence\s3-check-1789442115733117700.json / .log。这是实际 React SSR，不冒充浏览器 DOM 证据；已安装 UI/资源证据见 S3C 第三轮报告。
- inspect-ui-receipt.py 退出 0：原任务仍一次 completed/synthetic 运行、approved、一次回写；正文和两份已保存文件哈希不变。
- inspect-restart-receipt.py 于 2026-09-15T03:16:23Z 退出 0：开发主进程 24404、Host 31760/43120，renderer healthy；日常主进程 48704、Host 49052/43121。仅当前观察，不据端口推定永久身份。

历史失败日志保留：s3-check-1789441783932828000、s3-check-1789441806694108400。构建检查助手首次控制台编码失败，改为 Python -X utf8 后退出 0；不属于产品故障。

## 剩余门禁

完整 Desktop 跨版本升级/回滚仍未验收；之前原生 JSON backend/domain 的克隆顺序读写与旁路恢复不替代它。当前开发实例仍在运行，完整一致快照必须等用户正常退出并只读确认 Host 消失。日常实例无需退出。随后仅使用新建旁路克隆，核对路径归属和 pin 后演练；不能让两个 Host 写同一存储，也不能让克隆回指原 Workspace。

## 退出、快照和保护差异复核

用户随后明确“开发副本已退出”。backup-s5-final-checkpoint.py 首尾确认候选 Desktop/private Node 不存在，退出 0；2026-09-15T03:24:10Z 完成新备份 backups\s5-before-desktop-rehearsal-20260915，13648 文件、1012 目录、838206864 字节。包括 Home/userData/A/B Workspace、启动与 pin、业务包及当前 EXE/ASAR；源读前/复制/源读后及末次全清单哈希均一致。其他应用文件仍靠原目录及 pin 保留，不能把此快照称为全应用独立发行包。未启动克隆。

verify-s5-current.py 保留历史基线，日常程序/选定 Profile 元数据改用用户升级后已建立的基线，其他控制文件仍对最初基线；36618 项检查退出 1，仅三项控制文件不同：

- C:\Users\TinaD\.dsh\settings.yaml
- C:\Users\TinaD\Desktop\DSH Desktop.lnk
- C:\Users\TinaD\AppData\Roaming\Microsoft\Windows\Start Menu\Programs\DSH Desktop.lnk

记录 evidence\s5-current-artifact-verification-20260915.json。日常当前程序树、旧副本程序树、候选 pins、归档内容、主业务源快照检查未报失败；source_changes 是候选相对初始源快照的已发生差异列表，不是新的主仓库修改。旧归档 SHA 仍为 4957e97d2663d69f742639414d0322631a8ebc243d4f3a947bd339444d09ce2b。

inspect-s5-daily-controls.py 只读调查退出 0，记录 evidence\s5-daily-control-drift-inspection-20260915.json：两快捷方式均指向日常安装 EXE，无额外参数，不指向开发副本；修改时间分别为 2026-09-14T22:49:07Z 和 2026-09-15T01:09:17Z。settings 修改时间为 2026-09-15T02:56:56Z，早于本批 verify，文本未发现开发根路径。没有输出配置值或凭据，没有修改/重置日常配置，也没有把当前哈希写成替代通过基线。仅凭这些证据无法还原配置语义变化或断言三项均由升级造成。

另有只读克隆路径检查发现原 workspace 注册包含一个候选外路径（既有 .dsh-test 工作区）；A/B 均位于候选内部。故复制数据后不得直接启动，须逐项确认克隆路径重绑定，不允许旧注册引回原目录。

当前 S5 整体状态：BLOCKED_WAITING_FOR_USER。开发退出及一致快照门禁已满足；待用户确认日常设置仍符合其预期，保留三项历史差异后再继续旁路克隆。包级命令成功不代表完整升级、真实业务生成或发布完成。
