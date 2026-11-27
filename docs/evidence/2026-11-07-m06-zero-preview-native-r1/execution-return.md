# M06只读预览 V0.1 新组合原生零生成限定验收

2026-11-07，Asia/Shanghai；Codex单代理。用户对call_65ae8c6653a64b42b5ea2f11ab029ec9第0项明确答复：“同意该新组合的零生成验收”。[授权回执](authorization.json)绑定新根及准确版本，不改旧准备记录的历史`current_AppStartAuthorized=false`。

## 结果

**7aca55e9／5160c4e9的M06只读预览、材料准备及原生启停/重启，在本次零生成范围内通过。** 本轮实际两次启动原生Desktop，两次从App菜单正常退出，均code0/signal null；第二次为已计划的正常重启，不是失败重派。最终App已停止，目标进程/端口和双启动锁释放，installed writer及JSON provider所有权可重新取得并释放。

原1c5b/6f2f上“新版任务创建未完成”的实际失败保留；新组合实际可进入八输入只读页面，未再出现该错误。没有创建业务任务、审核稿或生成正文，`oasis_workbench.json`在打开、准备、两次退出后均不存在。

## 准确目标及启动

| 项目 | 本次实际对象 |
|---|---|
| 安装根 | `/Users/tinadong7036/Documents/开发项目/DSH-Oasis/.dsh-test/m06-zero-preview-installed-20261107-r1` |
| bundle SHA256 | `7aca55e9d5ccf7be21d20a3a33a7a02cbac256b7e725e69bca913ae03d624af5` |
| 业务归档 SHA256 | `5160c4e910018e71cdd3f46452a2cc80b1cab6aab810bd4ae23dc5b5a7a89785` |
| 固定组合 | Desktop2.0.17／DSH0.2.0-rc.2／Sidebar0.24.1／Cordis4.0.4／Node24.21.0／pnpm11.8.0，checkpoint3 |
| 实际客户端 | 原生App内`127.0.0.1:57619`，Desktop版本参数2.0.17 |
| 两次实际App PID | 35965、36430 |
| 启动方式 | 本根冻结`control/node control/scripts/f-installed-runtime.mjs --start`，干净环境；不使用getApp自动另起应用或新启动器 |
| 预算 | model/API/upload/payment全部0；四项业务只读RPC白名单保持 |

[start-commands.json](start-commands.json)记录实际命令/执行session；[第一轮](first-launch.json)、[第一轮退出](first-exit-observation.json)、[第二轮](second-launch.json)、[第二轮退出](second-exit-observation.json)分别关联本根原控制器的原始launch/exit回执。原始stdout/stderr在各prefix所在的`data/evidence`中，没有复制认证或本机日志到公开包。

## 原生UI实际观察

[ui-observations.json](ui-observations.json)为本轮CUA实际AX/截图的明确转录，不是模拟UI或独立专业审阅。

1. 新Profile的首次引导选择“跳过→跳过设置”，未配置手机/通知，未登录外部账户。通过原生文件夹选择器添加本次`data/workspace-a`，未选择旧根；新根内官方本地控制通道初始化按原生流程完成，未读/迁旧认证。
2. 进入绿洲工作台后，新建任务、网站导入、旧业务入口及非M06工作流显示禁用；M06入口为“权利要求初稿 只读预览”。实际出现原八输入：前序累计文稿文件、技术交底文件/文本、附图说明文件/文本、权利要求撰写要求文件/文本、用户指令。来源停在本地Skills，两来源按钮与生成按钮禁用。
3. 材料读取确认未勾时“核对本项目材料（只读）”禁用，勾选后开放。公开合成技术交底首次准备成功，显示“输入准备结果（未生成）”。文本收据SHA256为`ee846c377c0840e7a9f2c9207c5fd9f118c184c7a3c09cdcbd4eed7668a53041`，与[精确输入](public-inputs.json)逐字节一致；输入身份为`4e5ddd6df173a8a0902937b17a8ffe0e3de6f0d77716ace6ea1cebd3bad98f39`。
4. 在本次项目目录新建并明确选择`zero-preview-note.md`（公开合成材料）。填写文件名后旧结果消失、确认变为未勾，重新确认后第二次准备成功。文件收据`accepted/user_file`，SHA256为`75f3ad88148857961e738df40b34e1cb590136f962bffac170ae32d38821e39a`，等于磁盘原文件；输入身份为`4e60f60f7ff35ee997432312398a6e515321fc453574535e60b62f57e75dc1a6`。没有读取库中评价答案或客户材料。
5. 结果保留`host-Flow-2-6-missing-upstream_md_file`警示、status open及model_completion“未评估”。只读准备成功不等缺失前序已补齐或业务正文可生成/可提交。
6. 关闭预览后重开，八输入均空、无准备结果、确认未勾。原生“绿洲工作台”设置页展示零生成说明；登录方式、手机号、验证码、发送验证码、登录、刷新登录状态均禁用，未点击账户请求。
7. 为区分原生草稿和预览内存，在新会话输入但不发送`M06_NATIVE_UNSENT_RESTART_20261107`，在预览另填`M06_VOLATILE_BEFORE_RESTART_20261107`而不准备。正常重启后，原生工作区/会话及未发送标记恢复；功能中心恢复，重新打开M06时八输入为空、无结果、确认未勾，预览标记未恢复。没有把原生草稿恢复当业务revision恢复。
8. 两次均使用App菜单“退出DSH Desktop”，没有强杀。菜单点击后即时App清单短暂仍显示运行；实际controller exit0、最终CUA清单“不运行”及进程/端口复核共同确认退出完成，不以发出退出动作代替退出结果。

## 安装、数据及所有权保全

- 启动前、两轮之间及最终本根冻结controller `--check`均exit0，仍为7aca55e9；[前](controller-check-before-command.json)、[中](controller-check-between-command.json)、[后](controller-check-after-command.json)及各完整log保留。没有改pin、资源、依赖、Profile配置或重新安装/打包。
- [lease-readmission-command.json](lease-readmission-command.json)退出0；[结果](lease-readmission.json)证明应用退出后合作installed writer、JSON provider可重新取得并释放。仅打开所有权元数据事务，不启动Host或业务后端；不声称约束任意旧writer或形成OS级全面断网证明。
- [protected-after.json](protected-after.json)核原6f2f/5160及相关原归档、M06业务资源、旧安装身份/controller、合成UNKNOWN和18250e4c固定稿、R3批准原字节保持。新业务文件在两次退出后均不存在；原已安装c3保全另在本轮最终核对记录中列出。
- 新根的原生项目/会话、官方本地初始化、原生未发送草稿及合成项目文件属于获准的隔离运行数据；不迁到日常Profile或旧根，不进入发布包。没有模型生成、专业API、上传/费用、消息发送、WorkBuddy导入/投递、源CI/B/A、提交/推送或发布。

## 执行前复核与结论边界

[preflight.json](preflight.json)记录本次重新读取根AGENTS全文/EXEC-R2、协同全文、登记与两层current_followup、本项目规则/当前入口、R3-03及适用BM1/IC-ARTIFACT等的准确原字节身份和实际读取范围；仅身份核对的历史条目不冒称全文已读。协同仍1.2.2，整体1.3.1/NS1-R1＋适用BM1-R1/S1/S2-R1/G1、S2-R1 followup未变。输入在收口前无漂移，历史入口按追加接续保存，不回写旧失败或旧授权。

本轮完成的是**该新组合的零生成原生预览/准备和限定生命周期**，不是完整R3-03、真实生成/API、业务revision保存恢复、所有格式或首发验收。准备只执行两次只读RPC；预算/守卫/操作留证，不编造全机或全进程模型/网络/费用计数。页面显示的原生模型名称及因未发送草稿而启用的原生发送按钮不在本次使用范围。

Tina D对原18250e4c稿MC01—04及保留15警示的受限接受、not_recommended_for_filing保持；本次UI事实不扩其范围，也不代签新组合的用户接受。正式许可采用/公开投影、真实生成与业务恢复、G0/三方绑定、WorkBuddy实际导入及发布继续分别办理；不因本轮通过重跑已验Fast39/PREP2或开启新调用。下一步回到首发许可/公开范围与同版发行清单收口，应用保持退出。
