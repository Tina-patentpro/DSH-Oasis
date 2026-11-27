# R4-01同版已安装SDK业务稿恢复执行回执 R1

2026-11-07，Asia/Shanghai；Codex单代理。用户在已交准确方案和下一步说明后要求“按计划继续推进下一步”，本轮执行新根061d/a7cf的SDK离线合成业务稿恢复；不启动App/Host、不真实调用或发布。准确范围见[authorization.json](authorization.json)，没有重复消费旧真实调用许可或旧原生启停次数。

## 实际结果

**方案所选的公共服务→实际安装Domain/JSON→修订再审/无覆盖保存→独立SDK进程冷重读及直接负例限定通过。**

新根为`/Users/tinadong7036/Documents/开发项目/DSH-Oasis/.dsh-test/m06-rc1-business-recovery-offline-20261107-r1`。业务包0.1.0-rc.1、原123成员归档a7cf9a5d与bundle061d3e6e保持；固定Desktop2.0.17／DSH0.2.0-rc.2／Sidebar0.24.1／Cordis4.0.4／Node24.21.0／pnpm11.8.0和checkpoint3未升级。

| 步骤 | 实际操作/结论 | 具名证据 |
|---|---|---|
| 新根旁置安装 | 原冻结rc1控制器官方离线安装exit0；无已有根覆盖、Profile/认证/旧存储复制；依赖由原固定pnpm离线/frozen/ignore-scripts物化 | [install-command](install-command.json)及原stdout；本根最终controller --check exit0 |
| 公共建稿 | 实际installed writer＋c5 createSingleOwnerJsonBackend＋固定DomainFacility，公共createV340Task/updateV340Draft/createV340Run；一次synthetic执行完成 | [初始运行观察](initial-run-observation.json)；[初次命令](create-command.json)保留exit1断言失败 |
| 修订/审核/保存 | 接续同run；V1最初not-reviewed，未审保存被V340_REVIEW_REQUIRED拒绝，再工程审核并prepare/commit保存成功，V0/表格/输入历史和原警示保留 | [continue-command](continue-command.json)exit0、[continue-result](continue-result.json)；没有再次创建或执行器调用 |
| 独立进程冷重读 | 写入进程343关闭后，进程537重新取得writer/JSON并读取同record revision9、run/V0/V1/审核和保存回执；MD hash正确，业务JSON字节相同 | [cold-command](cold-command.json)exit0、[cold-result](cold-result.json) |
| 项目/revision/覆盖负例 | B读取A结果被V340_RESULT_UNAVAILABLE拒绝；旧revision审核返回revision-conflict，prepare保存抛REVISION_CONFLICT；重复保存被WRITEBACK_TARGET_EXISTS拒绝；无业务/文件覆盖 | [negatives-command](negatives-command.json)exit0、[negatives-result](negatives-result.json) |
| 当前文件/固定版本区分 | 仅追加本次样例中已定的用户文件标记；resolve返回current-file/matchesReviewed=false，业务记录和审核hash保持；固定版本对话资料含审核正文/hash、不含磁盘追加标记，未发送 | 同上；当前MD hash与固定结果hash分别记录 |
| 所有权 | 业务SDK持租约时有限子Node取得同根writer被F_INSTALL_BUSY拒绝；各阶段关闭后另一个Node可复取释放；退出后双锁均无残留 | [lease-busy-observation](lease-busy-observation.json)及阶段回执 |
| 同版/保全 | 新根123、原rc1根123、旧134＋140成员相符；各原安装身份、UNKNOWN、受限固定稿、许可/采用/审阅包及22保护件保持 | [composition-after](composition-after.json)、[verification](verification.json) |

本次运行器只在本证据目录保存，不修改产品代码、白名单、Profile模式、资源pin或冻结控制器。公共服务经自己原合同生成/持久化run、revision、审核和writeback；未用state/replace、任意repository.mutate、table.put或手写业务JSON预置completed/approved状态。

## 准确版本与字节

[runtime-identities.json](runtime-identities.json)记录公共服务实际产生的身份，而非将样例模板hash当业务hash：

- workspace `rc1-recovery-a`；task `rc1-recovery-task`；run `v340-18c30218-54f7-4d73-a0fb-18ccca8b6ae7`；修订`revision-0c324380-1be7-459a-b737-b0afc184f521`。
- inputSha256 `1ac889f30f246338f0dc28e4bd390d544b3f2b544158a0787118fe68a332fb24`；公共catalog资源`6858c8edee9de850d60e927a9fdc8bd3bfbfe4a8785ee50c79fd62337787e761`；公开M06载荷容器仍e06aa152，二者不混同。本试验不执行公开M06模型载荷/原生候选确认。
- 原保存稿`claims_20261107202437_0c324380.md`，审核结果SHA256 `a18c75504f2609cf579540e80533424eaac54b0870e770b42453ce11f52b599b`；writeback `writeback-3cc8a034-5050-4570-a19d-a4756740e20f`，record revision9。
- 冷重读/后续负例的业务JSON SHA256均`c911b85a99981d671d4a9c51607bc4033e0b89da201dbf4d19c7ee9c7333e36b`。显式磁盘追加后当前MD为`4d486f429f5802215e0e546cc2dfc9431243a528a28038bf1d206c0231c6eed0`，不冒充审核版或迁移成功。

初稿七条警示；修订保留七条并新增两条，共九条，未评估及不宜直接申请保持。该数目属于本次公开合成输入，不是旧固定稿的15条警示；旧稿MC01—04专业/用户受限接受不移授本例。

## 原失败、诊断及有界接续

首次命令exit1发生在一次合成run已经completed、但尚未审核/编辑/保存时。运行器误将最终修订版`not_recommended_for_filing`断言用到原始装配初稿，实际枚举为`ready_with_warnings`。使用systematic-debugging核对`assembleV340Document`按开放警示分类、`reviseV340Document`明确强制不宜直接申请的源码落点，见[initial-status-investigation.json](initial-status-investigation.json)。初稿虽有M06受限警示，该枚举仍不是专业/申请就绪证明。

保留[sdk-recovery-attempt1.mjs](sdk-recovery-attempt1.mjs)、原失败JSON/日志和初始运行观察。第二次只在公开API打开后逐字核已有completed记录，复用同run/request/input，不调用创建或执行器；修订版明确验证not_recommended_for_filing。旧方案、样例、pin、产品代码和原初稿status没有改写，未用换expected或新请求掩盖失败。续接函数另明确区分子进程回执外层与result层，未重跑建稿。

总合成执行器调用仍为1；continue/cold/negatives各为0，持久化只有一个run。三后续阶段的fetch/socket/未允许进程及意外派发计数均0；有限子Node只探合作租约，未打开业务后端。该计数不是全机网络/模型/费用监视证明，也不是OS级安全隔离保证。

## EXEC-R2与范围结论

[preflight.json](preflight.json)记录75输入、根AGENTS/协同全文、登记两层current_followup和适用NS1/BM1/S1/S2/GH1约束、准确方案/案例/交付身份。相对上轮只有四项已明确追加的项目导航，核其上轮after hash；中心合同、职责、版本及S2-R1 followup不变。原R3/R4、方案/样例和首发事实R1作为冻结输入不改，普通进度不改中心登记。

本轮仅接受R4-01所选的**同版新根SDK合成业务稿恢复子集**。原生App/Host/UI业务恢复、完整R3-03/F、真实升级/回退、新公开载荷真实生成、专业/用户接受、Fast39正式绑定/G0、独立法律复核及发布仍各自未完成。当前061d零生成RPC四项白名单原样保持，不能因SDK公共服务试验通过就在原生预览开放写入。

[发行SDK回执](../../release/m06-public-0.1.0-rc.1/business-recovery-r1.json)和[同版技术事实接续](../../release/m06-public-0.1.0-rc.1/BUSINESS-RECOVERY-R1.md)只新增归档外资料，原123成员归档、140采用范围和独立法律复核未取得等原状态不重签。没有新设计/通用诊断平台、App启动/消息发送、真实模型/API/上传/费用、源CI/B/A、WorkBuddy导入/投递、提交/推送/部署/发布。单代理作者自查，非独立审计。
