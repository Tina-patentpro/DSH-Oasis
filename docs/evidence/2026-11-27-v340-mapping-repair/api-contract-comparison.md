# V3.4.0 冻结映射与当前 API 合同差异核对

2026-11-27，Asia/Shanghai。Codex 按用户明确授权处理主工程 47 项映射校验失败，限离线修复、验证、提交和 GitHub 推送；新增业务调用及费用为 0。

## 原因与身份

10 月 23 日 B 批清单 `docs/business-baseline/v340-source-mapping.json` 固定了当时 API 归一化源码的哈希，旧校验器却始终从当前运行源码路径读取。后续合法的结构化结果支持改变了源码，导致校验在业务字段检查之前以 `MAPPING_RESOURCE_DRIFT` 退出。47 项红例并非 47 个独立映射缺陷。

| 对象 | 原始 SHA256 / 来源 | 用途 |
| --- | --- | --- |
| 原冻结清单 | `1b084249ab889083287ec0050e232b7a5f372581efba8e300d9da2d1efe65245` | 原字节、2026-10-23 日期、14 节点、28 来源单元及 114 缺口保留 |
| 原 API 源码 | `8b56d9374c508304bef84d6f2bf5b7257b633230af5a118532e8e031653f785f` | 原清单 `api-contract` 静态历史证据，不是部署或服务绑定 |
| 当前 API 源码 | `16e993ef1dbd7d3ee1152a89a18bce4e47ac0bccc292735940f539ffb6bcabe7` | 本次独立核对的当前归一化合同 |

历史源码从既有 Git 提交 `035fe82b3f97b983bb561fbefff9ae1ea9d42862` 的 `packages/oasis-professional-service/src/oasis-api-contract.js` 恢复，Git blob 为 `b706977a37bd5ae7d4bf766370f3ab1fc7a337b9`。恢复后的原字节与旧清单哈希完全相同，保存为 [历史文本快照](../../business-baseline/v340-source-mapping-20261023/oasis-api-contract.js.txt)，不会被运行、导入或打入插件发布包。该文件是本次取回的历史副本，没有改签旧证据。

当前变更来自既有提交 `30031b589d4ff7108ed5df16b698351ad4a45f37`，其字节也与分支归并前 `9d3bee244ad1f7e6475b3263728fdc618a2b4d0d` 一致，并非本次合并引入。原文件、历史失败日志和原 API 基线均保留。[完整差异](api-contract.diff)

## 逐项语义核对

| 接点 | 旧版本 | 当前版本及影响 |
| --- | --- | --- |
| `normalizeWorkflowCreateResult` | 解析正文和文件 URL；两者均空时为未解析 | 增加独立深拷贝 `enhancedFragment`，保留 `structured_result` 或 `structured_result_error`；两种键同时存在则拒绝 `INVALID_RESPONSE` |
| 仅增强片段响应 | 无正文/URL，无法保留增强内容 | 有增强片段即可记录收到响应；`resolved=true` 只说明响应可归一化，错误片段、空片段、partial、业务失败或正文合格须下游另验 |
| `normalizeWorkflowProgress` | 透传正文/URL | 额外透传同一增强片段；沿既有进度接口，没有新增或证明正文恢复服务 |
| `createOasisApiClient` | 返回旧结果投影 | 额外透传增强片段；仍执行原 URL、凭据、项目/任务及错误边界 |
| 请求和服务身份 | 原方法、路径、五键请求、输入映射、项目权限要求 | 本差异未改变；不由增强字段猜测服务 ID、Schema、项目绑定或部署能力 |
| 旧返回兼容 | 字符串正文、`answer_text`、`file_url` | 保持；不为旧响应合成增强结果，不把 URL 当已交付正文 |

复用 `oasis-api-contract.test.mjs`、`m06-fast39-transport.test.mjs` 以及主工程已有的 Fast39 证据、持久化和远端服务反例。测试中的传输由本地替身响应，不连接专业 API。增强错误片段保留、冲突拒绝、深拷贝、旧投影和单次派发分别有原回归覆盖；本次不回滚已交功能。

## 修复边界

旧清单及其 `EVIDENCE` 的原路径/日期/哈希不变。校验器只把该固定历史 API 证据的读取位置显式绑定到上述快照，并继续用原哈希验证；另行固定本次审阅的当前 API 源码哈希。所有路径均由代码固定，清单不能指定新读取路径。两份文件都沿原有安全读取边界，任何一份缺失、漂移、符号链接或未经核对的回滚均拒绝。

返回摘要明确列出 `apiContractEvidence.historical` 与 `apiContractEvidence.current`，以及 `verificationScope=historical-mapping-and-reviewed-current-api-source`。本次日期只属于当前静态代码审阅，不写回旧清单。以后当前 API 再改版，需再次逐项核对和定向验证，不自动接受任意新哈希。

通过只表示历史映射证据和本次已审当前 API 源码一致。原清单中的 `dispatchEnabled=false`、`realCallVerified=false`、未绑定的 API 字段和 114 缺口仍保持。后发真实运行继续引用各自具名证据；本校验不提升或覆盖专业/用户接受、Host 验收、正式服务绑定及发行状态。
