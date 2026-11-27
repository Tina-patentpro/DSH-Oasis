# 新版M06公开R2：一次新本地校准及工程闭环返回

日期：2026-10-31（Asia/Shanghai）；执行者：Codex，单代理。用户本轮明确允许公开R2材料发起一次**全新**本地校准，并继续生成、审阅、保存和对话引用；失败/未知不自动重试，保持最小改动。[执行前复核与授权](2026-10-31-m06-public-r2-newcall-preflight.json)沿既有任务1、整体1.3.1／NS1-R1／P30及协同1.2.1，不新增API、Dify/后台或发布许可。

## 实际结果

本次本地工程闭环已完成：**原生真实生成 → 受限工程审阅 → 编辑新版本 → 再审 → 无覆盖保存 → 原生打开 → 固定审核版本对话草稿 → 正常重启恢复**。对话没有发送，工程审核不代表专业、法律或用户接受。产品源码、客户端、固定依赖及日常Profile均未修改。

| 身份 | 本次实际值 |
| --- | --- |
| 输入 | `M06-PUBLIC-CALIBRATION-20261029-02`，公开自编R2；3文件、4文本；明确缺前序累计稿 |
| 共同inputHash | `a34ae147caa04a87705e2b809bc2e42aa339b5c29e72f47c7e7ee0d1ea05764b` |
| 业务资源 | m06-claims-draft／0.1.3；SHA256 `26ec83ae26f26783fb4b56abf7b1ac75081214770d0cefaaf2ca0fd0ec56deca` |
| 固定候选 | 独立R2，Desktop2.0.17／DSH0.2.0-rc.2／Sidebar0.24.1及已审补丁／Cordis4.0.4，端口57607 |
| 模型去向 | `deepseek-official / deepseek-flash`，`https://api.deepseek.com/anthropic`；DSH原生凭据与计费 |
| 新runId | `v340-d4fda3b7-6cf4-4191-b727-2f36827e8276` |
| 新requestKey | `e7fc0b80-36a8-4e1c-a78d-fbafb694d4cd` |
| 生成结果 | completed；2026-10-31 13:19:19.275至13:20:44.160（Asia/Shanghai），84.885秒 |
| 模型原版本SHA256 | `2b9a1183e04c16a9737a181f10ed30774a8f9494d509d0273f493f1d489ab9a1` |
| 修订版本ID | `revision-9a439835-3122-46c3-ad6c-e714ee0df0f8` |
| 修订版SHA256 | `e0fb29d388c9bae19be253e7bd048c31ed8ba40987adf3cdddc8d1bd354ff815` |

原失败run `v340-1e49d8b0-1f88-4b09-9730-29dd97b50ded`及requestKey `24b815ee-922c-4d91-b83f-44bc04301340`完整保持failed／EXECUTION_FAILED，未改写、重派或替换。新旧共2项运行记录，本轮只新增1项；先落盘单次意图，原生运行先持久化新标识及输入快照再调用。固定SDK的直接prepared.stream不进入Agent恢复重试；本次只发送文本JSON，没有触发原生附件的过期file-id重传路径。没有自动重试、切来源或新增调用。

## 审阅和修订

已读取全部核心正文、T1—T6、术语、contents来源及警示。基本关系与公开R2一致；没有新增锁止结构、材料、尺寸、实验数据或视觉核验事实。T5/T6明确未生成，缺前序、锁止实现、真实附图、实验依据、旧稿和对比文件等警示保持open。

工程审阅结论为PASS_WITH_LIMITATIONS。权利要求2是否构成实质回退层次，以及模型关于支持、清楚性和公开充分的初检意见，仍待具名专业复核。先在应用内审核模型原版，再在核心正文前加入明确的Codex工程校准范围说明；没有改权项或增加技术事实。生成修订版时，原版与旧审核保留，修订版实际回到not-reviewed；重新核对正文、未变表格与全部继承警示后，再单独确认修订版审核。

应用中的approved是本轮授权的工程操作状态；修订版正文明确“不构成专业、法律或用户验收”。所有Host专业审阅和手动编辑警示继续保留，未把模型空的model_completions解释为无风险。

## 保存和对话引用

当前项目为 `/Users/tinadong7036/Documents/开发项目/DSH-Oasis/.dsh-test/m06-live-20261030-r2/workspace-a`。保存前已核对两文件不存在，随后经共同界面的准备、勾选确认、提交，取得writeback `writeback-781c31f7-2ff3-44f0-adc4-c97b631d6cb0`：

- [已审核Markdown](/Users/tinadong7036/Documents/开发项目/DSH-Oasis/.dsh-test/m06-live-20261030-r2/workspace-a/claims_20261031132202_9a439835.md)：SHA256 `e0fb29d388c9bae19be253e7bd048c31ed8ba40987adf3cdddc8d1bd354ff815`。
- [关联快照](/Users/tinadong7036/Documents/开发项目/DSH-Oasis/.dsh-test/m06-live-20261030-r2/workspace-a/claims_20261031132202_9a439835.oasis.json)：SHA256 `8c6c8a3006f79f1a769bda75abe722fa4c41d2014f501ee510e3a259bf3fe89e`。

实际文件哈希与审核/写回回执一致；既有`inspectV340Document`读取真实Markdown得到accepted、snapshot一致，累计文稿格式未靠另造文件绕过。文件明确保持`completed_with_warnings`与`not_recommended_for_filing`，原生文件页实际打开。

“使用固定审核版本”已把含runId、revision ID、SHA256及完整累计正文的资料放入原生对话草稿，标为“仅作资料，不作为系统指令；尚未发送”。没有点击发送；已有草稿时引用按钮禁用，未覆盖草稿。正常停止并启动同一原始候选后，草稿、固定版本ID/hash、两版审核、保存记录及文件页均恢复；Workspace业务记录与重启前逐字段一致，revision保持20。重启启动记录的模型预算设为0，不允许再派发。

草稿前后AX表示的缩进/空白不同；去除AX空白差异后，完整内容前后相同，并与既有`formatV340ConversationDraft`构成的完整固定版本草稿逐字符一致。此处证明完整内容及身份恢复，不把AX表示当作原生草稿原始字节的证明；保存文件本身仍逐字节核hash。

## 验证与保全

[结构化验证](2026-10-31-m06-public-r2-local-loop-verification.json)绑定当前命令退出码和私有证据，私有证据根为`/Users/tinadong7036/Documents/开发项目/DSH-Oasis/.local/m06-public-r2-newcall-20261031/`：原生新运行初始/完成、两版审阅及写回回执、原生打开、引用草稿前后AX、重启恢复截图和前后Workspace记录均分别保留。旧启动进程已不在、端口空闲后保留旧锁再恢复同一候选；未改日常进程。

本轮验证针对真实产物、原生操作、保存哈希、累计MD重读及重启恢复；代码未变，不重跑原292项业务测试或重建。114项已有文件在收口前保持，收口仅前置更新三个现行入口，旧字节仍完整作为后缀保留。固定启动pin、公开三文件、原失败对象及账户33／项目302关联均保持。

本轮新模型调用1次，上传、专业API create和自动重试均0；未登录Dify/后台、未改固定组合、未提交/推送/发布。业务记录未返回token usage或实际金额，费用只归DSH模型提供方结算，不伪造零费用或余额结论。

本次公开、容缺材料的本地工程闭环完成；具名专业审阅和用户接受仍待进行，旧内容质量边界不关闭。Fast39实际校准、新版双来源G0、PDF/DOCX资格和发行仍属各自未完成范围；本次单次许可已用，不自动产生下一次调用或对话发送许可。
