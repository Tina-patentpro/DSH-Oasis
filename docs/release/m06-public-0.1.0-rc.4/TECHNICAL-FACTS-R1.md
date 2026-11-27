# M06 rc.4 诊断修正技术事实

2026-11-08，Asia/Shanghai。私有工程候选，未发布、未投递。接续[rc.3技术事实](../m06-public-0.1.0-rc.3/TECHNICAL-FACTS-R1.md)，不重签旧运行或接受。

追加授权在rc.3／bundle f1efed18上只消费一次。独立项目B任务`d8d762fe-36ae-49dd-b275-b7ffff04fda7`的run `v340-410fc6f4-6382-480b-b16c-4e23cfaa5297`／requestKey `413ac7e3-fde6-436c-b2b4-ebcf24a9d395`，于2026-11-08T21:33:08.572+08:00创建，21:34:10.980+08:00记为`failed/INVALID_OUTPUT`，没有有效正文。原项目A的UNKNOWN保持锁定，未重发。三文件、四文本、八项生成资源与批准对象一致；未发送原生对话。

原回执未保留finishKind、failureStage或usage，无法证明本次是token截断、JSON解析还是输出字段/累计装配失败；费用与用量未确认。不能从耗时推断根因，不能补写旧运行数据。两次各自明确授权均已消费，当前没有剩余真实调用额度。

## 修正与准确对象

仅补现有安全执行摘要链：native候选保留adapter的结束类型、失败阶段和token计数，JSON/字段解析失败标`result-contract`；runtime沿同一白名单持久化；旧记录的可选字段保持缺失，不自动迁移。原始响应、reasoning、错误正文、任意字段和秘密均不进入摘要。不改模型、提示词、业务资源、来源/审核/保存规则或重试策略，不放宽成功判据。

| 对象 | 身份 |
|---|---|
| private业务包 | `0.1.0-rc.4`，125成员 |
| 归档SHA256 | `1f992c4273de2feee4f49fb928935c0f069a051f3d2f80c2c84c1f77fdf9f802` |
| 同版bundle | `d98eabee9d66179ce4c86493209ea8b194184c061beb4eac4dc3c4b03a4e3532` |
| 控制器 | `2b8c3f4aa202b17bdae3ce50184ac60674b22d59cabed05d43a5441a018bb55c` |
| 相对rc.3 | 3项源码、client.js/map、package.json和PUBLIC-RELEASE.json共7项变更；118项原字节不变，无新增/删除成员 |
| 保持项 | 业务资源0.1.3-public.1及角色隔离、准确Community License和MIT通知、固定Desktop/DSH/Sidebar/Cordis/Node/pnpm |

实际成员与差异见[候选身份](../../evidence/2026-11-08-r6-execution-r1/diagnostic-candidate-identity-r2.json)。本包不含完整宿主、依赖、Profile/凭据、运行/评价材料或本sidecar。

## 已验与未验

- 3个新增定向用例先失败，分别复现token上限、无效JSON、成功结果丢失摘要；修正后与相关源码149项一起通过。用例验证安全计数、负值/任意字段过滤、原始载荷不保留、冷重读保持以及一次流调用。
- 实际归档102项定向检查通过，包含公开资源消费及旧内部确认拒绝；compiled注册0 RPC，51份自有source map与归档源码一致，17份Zod来源/通知保持。无真实模型调用。
- 构建和pack均离线、禁生命周期脚本并使用私有HOME；首次验证脚本误用source map相对路径前缀，已按实际构建路径修正，只续接验证，没有重新构建/打包。
- 原真实输出失败原因仍未定位，诊断修正不等该失败已解决。rc.4没有真实模型、原生业务UI、新稿编辑/保存/未提交编辑草稿重启、专业或用户接受证据；未取得完整发行/回退矩阵接受。

准确原位安装/保全结论只按[安装回执](../../evidence/2026-11-08-r6-execution-r1/diagnostic-install-result-r2.json)引用。当前仍为可审私有候选，新增修改的最终公开范围、独立法律复核和具名发行决定分别待办；用户“暂不发布”保持。后续真实调用必须另有准确授权，不能沿用已用两次额度。
