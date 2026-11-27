# 0.1.0-rc.1新隔离组合原生零生成验收 R1

2026-11-07，Asia/Shanghai；Codex单代理。用户明确允许061d3e6e／a7cf9a5d组合原生启停、M06只读预览、正常退出并重启一次；官方本地认证仅新根，model/API/upload/payment预算均0，暂不发布。原话及准确根/hash见[授权回执](authorization.json)。

## 实际结论及身份

**本组合的M06只读预览/材料准备与限定原生启停、一次正常重启通过；应用最终已停止。**

| 对象 | 本次准确身份 |
|---|---|
| 业务包 | oasis-professional-service 0.1.0-rc.1/private，123成员 |
| 安装根 | `/Users/tinadong7036/Documents/开发项目/DSH-Oasis/.dsh-test/m06-public-installed-20261107-r1` |
| bundle | `061d3e6eb6dafb6183f0f1b3e85255010ddc741360913db997f93b17df701c9c` |
| 业务归档 | `a7cf9a5dd59db1da2c7fe34fb4eac413c3dbb0d2baad7ab88147c7bfaab63bc3` |
| 固定组合 | Desktop2.0.17 / DSH0.2.0-rc.2 / Sidebar0.24.1 / Cordis4.0.4 / Node24.21.0 / pnpm11.8.0，checkpoint3 |
| 两次App PID | 88499、89560 |
| 原生客户端 | App内127.0.0.1:57619，Desktop版本参数2.0.17 |

[同版原生回执](../../release/m06-public-0.1.0-rc.1/native-acceptance-r1.json)接续安装时“未启动”的历史时点，不回写原安装/归档manifest。实际命令见[start-commands.json](start-commands.json)：仅新根冻结control/node及controller --start、干净环境；getApp仅在已取得实际启动PID后按准确App路径绑定。

[第一轮启动](first-launch.json)/[正常退出](first-exit-observation.json)、[第二轮启动](second-launch.json)/[正常退出](second-exit-observation.json)绑定本根原始launch/exit回执，两次均code0/signal null。第二次为已计划正常重启，无启动失败重试；两次均从App菜单“退出DSH Desktop”，没有强杀。菜单动作后清单短暂仍报运行，最终CUA清单“不运行”、实际exit回执及目标进程/端口不存在共同确认完成。

## 原生UI与数据边界

[实际CUA转录](ui-observations.json)来自本轮AX及截图，不是模拟UI或独立专业审阅。

1. 新根正常启动连接本地客户端，未出现需手填认证的提示，未执行额外认证命令、输入凭据、迁移旧认证或登录外部账户。通过原生文件夹选择器明确添加本根`data/workspace-a`；OS“前往”历史曾显示旧路径，已替换为新根后才确认，未打开旧项目。
2. 功能中心的新任务、网站导入和其他业务工作流禁用，M06为“权利要求初稿 只读预览”。八输入完整，两来源和生成均禁用；确认未勾选时只读准备禁用，勾选后开放。
3. 两次只读准备成功，显示“输入准备结果（未生成）”。文本SHA256 `ee846c377c0840e7a9f2c9207c5fd9f118c184c7a3c09cdcbd4eed7668a53041`，输入身份`4e5ddd6df173a8a0902937b17a8ffe0e3de6f0d77716ace6ea1cebd3bad98f39`；本项目`zero-preview-note.md`为accepted/user_file，SHA256 `75f3ad88148857961e738df40b34e1cb590136f962bffac170ae32d38821e39a`，输入身份`4e60f60f7ff35ee997432312398a6e515321fc453574535e60b62f57e75dc1a6`，与[准确公开合成输入](public-inputs.json)及磁盘文件一致。未读取客户/评价材料。
4. 输入文件字段改变即清除旧结果并撤销确认；关闭再打开预览，八输入空、无结果、确认未勾。结果保留`host-Flow-2-6-missing-upstream_md_file`、status open、model_completion“未评估”，没有把缺失前序变成已补齐。
5. 绿洲原生设置页的登录方式、手机号、发送验证码、验证码、登录、刷新登录状态均禁用；未点击账户请求。原生全局设置或默认模型标签不代表本插件调用已放行，不把本模式说成OS级全面断网。
6. 原生未发送草稿实际标记`M06RC1UNSENTRESTART20261107`正常重启后恢复；预览中的`M06_RC1_VOLATILE_RESTART_20261107`不恢复，重开M06仍八输入空、无结果/确认。原生草稿第一次AX setter/paste未产生可见值，坐标聚焦/typeText后采用实际显示的无下划线标记核对，不伪造预期输入或归因产品缺陷。没有发送消息，不把原生草稿恢复当业务revision恢复。

## 所有权、安装及历史

- 新根冻结controller在[启动前](controller-check-before-command.json)、[两轮之间](controller-check-between-command.json)、[最终](controller-check-after-command.json)均exit0。未重新安装、打包、构建、改依赖、资源、pin或Profile配置。
- [lease readmission](lease-readmission-command.json)exit0，应用退出后合作installed writer与JSON provider可重新取得并释放；最终双启动锁和57619监听均不存在。只打开所有权元数据事务，无业务后端或`oasis_workbench.json`，不声称约束任意旧writer。
- [组合核对](composition-after.json)确认旧134＋140成员及新123成员原字节、安装身份与原归档不变；UNKNOWN、受限固定稿、R3、原许可/公开范围和审阅包在[保护核对](protected-after.json)保持。新根原生工作区/会话/未发送草稿及公开合成文件属于本次获准运行数据，留在本根，不进入发行包。
- [原生日志选定诊断计数](selected-launch-diagnostics.json)仅记录已知异常/patch模式计数，原日志留新根，不复制或打印认证信息。不制造全机/全进程模型、网络或费用计数。

## 执行前变化与结论范围

[preflight.json](preflight.json)记录根AGENTS/协同全文、登记与两层followup、本项目约束及R3-03、零生成/预览合同、现安装和原证据的43项身份。中心6件文件新增GH1规划/导航，已重新读取其明确范围和差异；current_followup仍S2-R1、协同1.2.2，整体1.3.1/NS1-R1及原合同保持，GH1不产生运行/发布许可。首次前置核验因BM1父文件也变化而停止在业务动作前；补读BM1/整体GH1后记录准确新基线，未覆盖旧expected。未读历史/其他接口仅记身份。

本轮技术接受只覆盖**该准确组合的零生成预览、准备与限定生命周期**，不关闭完整R3-03、升级/业务revision恢复、真实生成/API、专业/用户业务接受、G0、WorkBuddy导入或发布。原18250e4c固定稿的15警示受限接受、不宜直接申请及独立法律复核未取得继续分别保留。没有模型/API/上传/费用、消息发送、WorkBuddy投递、源CI/B/A、提交/推送/部署或发布；不启动新自动目标，也不因本轮通过消费新调用预算。最终范围、命令和保全见[verification.json](verification.json)。
