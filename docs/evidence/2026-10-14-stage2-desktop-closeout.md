# 阶段2：当前根目录无模型 Desktop/Host 验收

阶段2完成；这是当前固定 Mac 组合的实际合成运行证据，不是阶段3真实模型/API成功证据。用户已批准阶段1–3连续执行和分阶段Git提交。未推送、未修改日常Profile或签名应用。

## 实际装配与操作

从当前根目录执行固定 Node 的 `scripts/macos-development-launch.mjs --check` 退出0，再由 `--start --acceptance` 启动独立Home/userData。Desktop2.0.17、DSH0.2.0-rc.2、Cordis4.0.4及Sidebar0.24.1补丁组合实际显示绿洲入口。官方初次认证初始化沿正常流程，外部登录跳过。所有生成均为 `unified-fixture`；实际模型/上传/专业API执行为零。

| 合同 | 当前证据 |
|---|---|
| 原生项目归属 | A=`a78c38cf-b15e-4bab-a5ad-d07f22c08907`、B=`36fd99fa-15f6-4478-a4e6-e58eff05cf2b`；各由原生目录选择器注册，canonical根分别为隔离workspace-a/b |
| 同页切换/一份输入 | A四字段与公开样本逐字相等；B四字段使用独立标记。两项目各在共同表单切换来源，不产生运行；A最终API，B最终本地 |
| 合成结果/编辑/审核 | A本地v1审核，编辑成未审v2/v3，再审v3；API合成v4审核。业务存储共4运行、0远端执行；B没有运行 |
| 保存/无覆盖 | 本地v3保存普通.md，API v4保存_OIW.md，同存A根；重复保存返回WRITEBACK_TARGET_EXISTS。正文及伴随元数据均按记录哈希核对 |
| 原生打开 | 两文件均由公开原生文件接口实际打开，Sidebar文件Tab显示A根的相对/绝对路径 |
| 固定审核版本对话使用 | 本地v3与API v4各准备完整资料草稿，含选定run/artifact标识；有草稿时禁用，防止覆盖/重复插入。只准备，未发送 |
| 原草稿保全 | A单行测试草稿逐字导出，两次准备资料后还原。解锁后再次核对API后还原成功；固定地址正常重启仍显示原标记 |
| 正常恢复 | A/B四字段、来源、任务、4运行、审核和两个唯一writeback完整存储快照在三轮正常退出/重启后深比较相等；文件字节/hash保持 |

本地保存文件 `权利要求书_20261014-061043_v3.md` SHA-256=`ededde063d20038c70f7b74089a93b004d5aed5132b4b869f10e9b0aa53fdabe`；API保存 `权利要求书_20261014-061643_v4_OIW.md` SHA-256=`ca66aab7e760a4ecd7b3816a87f8223fccc43b82938ae83d45b9c41989c09638`。合成输出中的旧business_version/skill描述属于替身标记，不作为真实Flow-2-6/0.2.2执行证据。

## 发现与最小修正

初次重启Host地址从57517变为61985，业务记录恢复，但原生对话草稿及Sidebar本地视图丢失。固定安装包 `dsh-client-store/lib/index.js` 的公开persist实现使用localStorage；原生conversation声明每Session持久化，浏览器origin改变使其不可见。仅将隔离 `desktop-shell.config.port` 从0改为57517，`networkExposure: loopback`保持；没有补写原生store或复制草稿进私有结构。

保持原 userData，固定回原始地址后，无手工粘贴即恢复A原草稿及两个文件Tab；再次正常退出/启动仍恢复。对应launch runId为1791930693261（随机地址复现）、1791930818623（固定地址恢复）、1791930837908（连续恢复）；前三次正常退出code0。原始生成启动runId1791928144421正常退出code0。所有启动前check退出0。

Profile原哈希`6568542a835f444ca88ef9c75c509370a6f748f4d3a8f0bf5e42acb2890a0752`，固定端口后`d4f835b94afced0ec7519041a1c8a00da13a646ea67639f0843e80fac8f3f41e`。单行替换精确断言通过，其余31项准入哈希未变；保全旧配置和pin后只更新已审这一项。此前官方首次设置的键顺序重排另有原件/diff。固定端口被占用应报告启动失败，不能自动切随机地址冒充草稿恢复。

原生Hero的“选择工作区”会把未发送草稿/附件移往所选Session，这是固定上游公开实现的行为，并非绿洲业务草稿串项目。不能据此声称两个原生composer各有独立草稿；绿洲输入草稿、运行与文件归属独立已验证。测试B临时对话标记另存本地，最后按原生选择返回A并保留A标记。AX折叠多行空白，固定正文按非空可见行、完整性和artifact标识核对；不声称多行AX是底层字节哈希。

## 定向验证及证据位置

zsh执行固定Node：Mac启动、conversation-draft-bridge、native-composer-input、unified-generation-ui四份定向测试42/42、0失败、0跳过，退出0。另API/账户/映射8份合同测试130/130、0失败、0跳过；两处Mac tmpdir夹具以realpath修复，生产路径安全合同未改。没有重复运行全包verify，集成收口保留到阶段3。

本地 `.local/stages1-3-20261014` 保存完整A/B重启前后快照、AX、配置/pin原件、测试日志和截图；不纳入Git。可读截图含stage2-a-input-full、edited、file-open、conversation-prepared、api-saved、api-file-open、b-input及fixed-port-recovered。早期小缩略图不作为可读证据。

阶段3仍需正式运行配置、原生模型凭据和网站登录/项目关联、当前schema与费用预览、双来源成功正文及全链验收，一次集成verify。旧Windows未知运行不重发，不因本阶段合成通过标记真实通过。
