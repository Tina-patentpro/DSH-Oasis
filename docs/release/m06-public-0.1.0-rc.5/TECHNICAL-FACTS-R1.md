# M06 rc.5限定技术事实

## 后发真实运行接续（2026-11-09）

本版追加一次明确授权已消费，实际同版run `v340-c72ecef4-2cfd-4db1-9680-638738db5cff`为**failed/INVALID_OUTPUT**，安全摘要`stream/max-tokens`、outputTokens8192；没有有效正文。诊断链已在本次真实失败中保留结束类型和安全用量，但不等业务生成成功。费用金额未知，不反推旧两次原因或本次推理/正文分配。未重试、改参数或增加预算，剩余真实调用额度0；菜单正常退出code0。原A和B旧run均保持。[原结果及验证](../../evidence/2026-11-09-r7-execution-r1/real-call-verification-r1.json)／[有界分析](../../evidence/2026-11-09-r7-execution-r1/token-limit-analysis-r1.md)。

新真实稿编辑再审/保存/恢复及专业/用户接受仍未完成，暂不发布。下文为此前无生成检查及提案形成时点的技术事实；其中“尚未真实调用／本轮0”由本段仅对该一次实际运行接续，工程身份与旧收据不改。

2026-11-09，Asia/Shanghai；私有开发候选，未发布、未投递。接续[rc.4事实](../m06-public-0.1.0-rc.4/TECHNICAL-FACTS-R1.md)，不重签两次旧运行或旧稿接受。

## 当前交付

R7-01已在现有开发安装完成安全诊断细分及一次无生成原生检查。既有B失败任务能恢复并显示“本次生成失败（INVALID_OUTPUT）；未取得正文，不会自动重试。”正常菜单退出code0／signal null。没有新有效正文，也没有修复原真实输出失败的结论。

| 对象 | 准确身份 |
|---|---|
| 私有业务包 | `0.1.0-rc.5`，125成员；工作区主包版本仍为`0.0.1` |
| 归档SHA256 | `e94f9136f7d93373569444180fb2351b09db52ba2851fb84411e5125a56a0bc5` |
| bundle SHA256 | `947574a6ac282eec308f16125640eb085f0148493b11ba7dd8f4be0290e4428b` |
| 控制器SHA256 | `34cfa35cb3e62d004fedd13e06f7270932743e287931bb1ce1b5ee18224f982b` |
| 安装根 | `/Users/tinadong7036/Documents/开发项目/DSH-Oasis/.dsh-test/m06-native-business-recovery-20261108-r1` |
| 固定组合 | Desktop2.0.17／DSH0.2.0-rc.2／Sidebar0.24.1／Cordis4.0.4／Node24.21.0／pnpm11.8.0／checkpoint3 |
| 资源 | `0.1.3-public.1`，容器`e06aa1523338af87b255cbdcb428ae7e693765791820dedc94f69a26ddc37f1d`；8生成可见，2 operator-only不发送 |

相对rc.4仅7业务成员变化：`local-run-summary.js`、`v340-native-model.js`、`v340-runtime-service.js`、client.js/map、package.json和PUBLIC-RELEASE.json；118成员原字节相同。固定资源、提示词、许可与MIT通知、模型/参数/重试配置保持。包内未加入测试、运行证据、Profile或凭据，技术事实位于归档外。

## 诊断能力及证据边界

- 沿原`failureStage`白名单增加`result-json`、`result-schema`、`result-assembly`，分别标JSON解析、模型输出结构校验、Host累计文稿/来源政策装配失败；旧`result-contract`继续可读，不迁移或补写旧记录。
- 固定DSH LlmRuntime/BlockAssembler和离线provider验证5种分支：三类结果失败、max-tokens、有效正文。三类失败先RED，修正后通过；计数过滤、无原始载荷、冷重读及仅一次流调用均在同一用例检查。不是官方云端模型实测。
- 相关源码99项、实际归档102项exit0；实际归档包含公开资源消费和旧内部确认拒绝检查。51份自有source-map内容匹配归档，17份第三方来源保持。只验证受影响范围，不宣称全量产品通过。
- `result-assembly`仍合并来源政策、累计关系及最终文稿容量等内部细因；仅定位边界，不输出具体字段/原文/错误堆栈。若下一次落在该边界，先按已固定合同做针对性离线分析，不自动调用第二次。
- 旧A UNKNOWN、旧B INVALID_OUTPUT没有finish/usage证据，不补推截断或费用。SDK或提供方未返回的用量仍未知；诊断摘要不保证提供方一定返回计数，也不是账单。

准确证据：[执行前复核](../../evidence/2026-11-09-r7-execution-r1/execution-preflight.json)、[实际归档](../../evidence/2026-11-09-r7-execution-r1/archive-identity.json)、[同版原生结果](../../evidence/2026-11-09-r7-execution-r1/native-result.json)。离线原位升级后，新schema只读解析现有A/B记录通过；原生只观察B，不把schema读取说成A界面验收。

一次原生检查前后：A revision118／5任务、B revision80／2任务和全部旧run保持，业务及Workspace JSON原字节相同；未编辑、审核、保存、发送、重启或确认生成。原48条保护清单中46路径当前存在，2份旧临时候选在本次原位升级前首次核对时已缺失，缺失时间/原因未核；45份现存文件原字节保持，B原生会话压缩文件变化，未建立逐事件差分，不声称全部文件未变。正常退出后安装租约和JSON所有权可复取释放。

## 未完成与后续条件

本轮没有新增真实调用；两项旧一次许可均已消费，当前新增调用须沿[具名提案](../../evidence/2026-11-09-r7-execution-r1/one-call-proposal-r1.json)另有明确授权。该提案绑定同一公开三文件/四文本/八载荷、官方deepseek-flash、最多一次、输出8192、SDK重试0，失败/UNKNOWN不重试；不复制密钥或扩展访问权限。

输入身份用准确字段区分：`prepared.inputHash=a34ae147…`，完整`preparedSHA256=fb01f3ab…`；两次旧真实运行的prepared内容相同。R7中的“prepared hash”标签在此澄清，不是输入或历史hash变化，旧计划与回执保持。

没有新有效正文，因此当前真实稿编辑再审/保存/未提交结果编辑草稿重启、专业与用户接受仍未完成；旧固定稿接受不移授。仅在本版同范围具名接受和发行条件具备后才能声明业务交付；当前继续暂不发布。已采用Community License范围保留，新增贡献公开范围与独立法律复核分别待办，不把该许可称OSI批准，也不扩大到整个宿主bundle。

Fast39、PDF/DOCX及WorkBuddy各按R7-05直接输入独立推进。其旧离线、有限实测或静态包不能推定当前正式绑定/完整资格/真实导入；不成为固定本地M06的共同前置。
