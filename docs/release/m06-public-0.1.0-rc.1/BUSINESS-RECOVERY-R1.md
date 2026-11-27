# M06同版SDK离线业务稿恢复 R1

2026-11-07，Asia/Shanghai。**准确同版的合成业务稿修订、工程审核、保存与独立SDK冷重读限定通过。** 本件接续[首发技术事实R1](TECHNICAL-FACTS-R1.md)和[RL07准备时点](FIRST-RELEASE-CHECKLIST-R1.md)，不改其原件或赋予发布许可。

| 对象 | 本次身份 |
|---|---|
| 业务包 | oasis-professional-service 0.1.0-rc.1，123成员归档a7cf9a5d；与原公开候选相同，未重建/重包 |
| bundle | `061d3e6eb6dafb6183f0f1b3e85255010ddc741360913db997f93b17df701c9c` |
| 新根 | `/Users/tinadong7036/Documents/开发项目/DSH-Oasis/.dsh-test/m06-rc1-business-recovery-offline-20261107-r1` |
| task / run | rc1-recovery-task／`v340-18c30218-54f7-4d73-a0fb-18ccca8b6ae7`，workspace rc1-recovery-a，evidenceKind=synthetic |
| 修订版 | `revision-0c324380-1be7-459a-b737-b0afc184f521`；持久化record revision9 |
| 审核版MD SHA256 | `a18c75504f2609cf579540e80533424eaac54b0870e770b42453ce11f52b599b` |
| 业务JSON SHA256 | `c911b85a99981d671d4a9c51607bc4033e0b89da201dbf4d19c7ee9c7333e36b`；冷重读及后续负例前后相同 |

[完整机器回执](business-recovery-r1.json)与[执行记录](../../evidence/2026-11-07-m06-rc1-business-recovery-r1/execution-return.md)绑定完整hash、输入、保存回执、实际进程及命令。

通过公共服务而非手写快照形成一个run，合成执行器总计一次；后续修订、审核、保存、独立进程重读与负例没有再派发。实际使用固定SDK DomainFacility、installed JSON provider和writer租约，Context仅事件sink，不boot Host。原父稿/来源历史/七条警示保留，修订后九条警示、未评估及`not_recommended_for_filing`保持；工程approved不等专业/用户接受。

进程343保存后退出，独立SDK进程537恢复同一版本/审核/回执和文件，业务字节不变。跨Workspace、过期revision审核/保存、已有文件再次保存均拒绝；合作writer忙时子进程拒绝，关闭后可重新取得并释放。最后仅在本次合成MD追加已批准测试标记，当前文件SHA变为`4d486f429f5802215e0e546cc2dfc9431243a528a28038bf1d206c0231c6eed0`，`matchesReviewed=false`，固定审核版hash和资料正文不变，未发送对话。

保留一次初始断言失败：普通合成装配的初稿为`ready_with_warnings`，运行器误把后续修订版的`not_recommended_for_filing`要求套到初稿。核现固定源码后，仅接续已完成的同一个run，没有重建/重派；最终受审保存的是明确不宜直接申请的修订版。旧方案/样例、失败日志及初稿状态保持，不能把初始枚举当专业质量或申请就绪声明。

RL07只新增本例SDK合成业务稿恢复子证据；**当前061d零模式仍不允许原生业务写入，App/Host/UI业务恢复、完整F、升级/回退、真实新资源生成、专业/用户接受及发布未由本件关闭。** 公共服务快照中的catalog资源hash与公开M06载荷容器hash分别记录，本试验未消费模型提示载荷或认证实际一次原生llm能力。RL03原18250e4c固定稿接受不移授本例，法律复核状态不变。

新根和原已验根各123成员相符，原134＋140安装成员及22保护件保持，原公开归档/许可/技术事实和旧UNKNOWN不改。本轮未启动App、真实模型/API/上传/费用、源CI/B/A、WorkBuddy投递、提交/推送/部署/发布。新增资料为归档外sidecar，tgz仍123成员，private保持。
