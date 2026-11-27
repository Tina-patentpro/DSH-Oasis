# M06 rc.3 技术事实接续 R1

2026-11-08，Asia/Shanghai。供发行审查和后续说明使用；未投递WorkBuddy、未公开。原rc.1事实及冻结包保持；本目录是归档外sidecar。

| 对象 | 本版事实 |
|---|---|
| 业务切片 | M06／Flow-2-6权利要求初稿，八项共同输入、七字段模型输出；不等完整申请文件或14节点完成 |
| 业务包 | private `0.1.0-rc.3`，125成员，归档SHA256 `b54454a5de8d18851288e73aae7d186c5e4562f029674f0f7ef615f430fa60b6` |
| 相对rc.1 | 新增2、修改15、不变108、删除0；准确成员和hash见[差异清单](member-difference-r1.json) |
| 资源 | `0.1.3-public.1`，容器`e06aa1523338af87b255cbdcb428ae7e693765791820dedc94f69a26ddc37f1d`；8项生成载荷、2项operator，不向模型发送operator |
| 当前安装 | 沿用`.dsh-test/m06-native-business-recovery-20261108-r1`，未另建环境；最新bundle `f1efed185c033c2e6e00c8dcd97642370c73537bc4d73fa0239174ee10316144`，控制器`d64bdcf2ba12be2520d7aeed92234d66e2c962a8541cd68607b0e7ecd79a520d` |
| 固定宿主 | Desktop2.0.17／DSH0.2.0-rc.2／Sidebar0.24.1／Cordis4.0.4／Node24.21.0／pnpm11.8.0，不替代其他版本验收 |
| 正常入口 | 包内既有`./m06-controlled-host-013`；恢复入口/零生成入口保持各自预算和guard，不混用 |
| 模型去向 | DeepSeek官方，provider `deepseek-official`／model `deepseek-flash`，`https://api.deepseek.com/anthropic`；maxTokens8192，SDK重试0；不等离线或免费 |

## 本版实际证据

- rc.3恢复入口的一次原生启停及UI-RC2-01针对性复验已通过；旧合成稿三版本、警示和文件保持。rc.2的工程编辑、审核、无覆盖保存、安全打开、固定资料到未发送草稿及已保存业务重启恢复可按原组合引用。
- 用户授权后通过DSH credentials单项复用`DEEPSEEK_API_KEY`，原引用和其他引用保持，值未进入命令、日志或文稿。普通设置、账户/财务职责仍归各自原owner。
- 在bundle `a470a67a`上只确认生成一次。原运行`v340-4b14edd7-b895-4db1-88af-9fde2177c1c4`／requestKey `07e23fdf-2864-4f6a-aef0-426aa49ec56e`记为UNKNOWN／EXECUTION_UNCONFIRMED，无正文，无usage/费用结论；没有重发、换来源或补造成功。
- 查得Desktop把浏览器阻断代理应用到Host。现已仅为批准端点补Host代理例外；固定厂商模块离线验证修正前经过阻断代理、修正后直连，其他外网仍阻断。37项相关测试exit0；仅控制器变化，业务包未变。修正已离线原位安装，尚无修正后原生运行或真实模型成功证据。
- 本地App/依赖完整bundle不是拟公开业务包，不随125成员范围自动获再分发许可。当前控制器的`realCallBudget:1`表示该模式每运行上限，不是剩余授权；此前一次额度已消费，新增请求须另有明确范围。

## 许可、内容与首发条件

许可正文及通知与rc.1一致。已采用OasisIntWrite Community License 1.0准确正文SHA256 `5127ea772ba201b71404949456ebf43a193f79d1b0161f8e65172873d6ffc1f4`；按源码可用社区许可表述，保留第三方MIT，不称OSI批准。旧140成员处置及123派生采用保持；新2成员与15项修改的最终公开范围尚未具名接受，独立法律复核未取得。

Tina D对旧18250e4c固定稿MC01—04和15条警示的受限接受不移授本次输入、合成稿或未来输出。本次无正文，故新稿专业/用户接受、编辑再审保存、未提交结果编辑草稿跨重启均未完成。专业API/Fast39仍为原partial及开放条件，不声明新版双来源已验。

后续按[RL01—09清单](first-release-checklist-r1.json)逐项接续。用户“暂不发布”保持；没有Git提交/推送、npm发布、部署或运营投递。当前仅交可审材料，不能宣传可用业务Skills已正式上线。

原始依据：[R6回执](../../evidence/2026-11-08-r6-execution-r1/execution-return.md)、[原运行](../../evidence/2026-11-08-r6-execution-r1/real-generation-original-run.json)、[固定模块离线代理证明](../../evidence/2026-11-08-r6-execution-r1/native-proxy-offline-proof.json)、[修正安装回执](../../evidence/2026-11-08-r6-execution-r1/native-proxy-fix-install-result.json)。
