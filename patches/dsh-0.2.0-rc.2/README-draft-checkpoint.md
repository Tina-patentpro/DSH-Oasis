# 原生草稿 checkpoint 旁置候选

`conversation-draft-checkpoint.mjs` 只接受 Desktop2.0.17 内置 DSH0.2.0-rc.2 的 conversation/client.js，原 SHA256 为 `6dde14fc827a2c0f0daf29ab0b7b769aff103ae57bb60b75008c39feccea3b6c`。转换拒绝漂移和重复应用；不写签名 App。

`draft-checkpoint.mjs` 是通用宿主代码，插入原生会话生命周期，不引入业务规则/第二个聊天系统。IndexedDB 与同步 generation fence 保存有界纯草稿：32MiB累计字节、16附件、500000文本字符及1000引用。超过或存储失败时原输入保留并提示，不自动外传。异步恢复遇到用户修改/归属变化则不覆盖，旧快照保留，需人工处理冲突。

恢复图片仅重建本地 object URL；恢复通用文件只恢复字节及“需重新上传”的既有错误状态。旧 Host receipt 不持久化、不沿用，不自动上传/发送。只有显式重试才走原生上传路径。旧未记录的会话/附件元数据无法从孤立文件逆推；本补丁不迁移它们。

私有物化候选沿原包 manifest/Node half，client.js 为精确转换产物；版本用 `0.2.0-rc.2.oasis-draft.1` 表达自有修订，基础 DSH/Cordis/Sidebar/Desktop 不升级。**固定 Desktop 相同版本优先安装副本**，不能用一个相同版本 link 宣称已装配；须检查公开能力与新配对。此次 materialization/pnpm锁/配置及实际选择见 [本批返回](../../docs/evidence/2026-10-27-f-reviewed-reference-attachments-return.md)。最终候选仍在隔离 Profile，未装入日常环境或接受分发。

验证：`scripts/tests/draft-checkpoint.test.mjs` 测恢复/竞争/限额/失败；`scripts/tests/conversation-draft-checkpoint.test.mjs` 以固定包实际 class 和实际 SDK Store/Cordis 对照原件，验证不自动上传与明确重试。后者要求已物化的具名固定 SDK/源运行时，不跳过缺失依赖冒充通过。真实浏览器 IndexedDB/图片/引用及 Desktop 重启另外取证，不能由 Node 测试推定。

checkpoint 是异步草稿保存：事务未提交即崩溃、全部存储不可写、配额、文件清理、跨版本/多 Renderer/跨平台恢复未作保证。完整 F、真实模型/API UNKNOWN、固定超150000投影的文件引用及正式分发仍按原门单列。

2026-10-27首轮独立审计指出两项P2后，当前候选另版为 `0.2.0-rc.2.oasis-draft.2`（旧`.1`及首轮证据保留）。恢复文件在每次 Workspace rebind 都保持明确重试要求，并撤销旧Session的在途传输/receipt；普通新选文件的原行为保持。generation生成前先持久失效旧fence，fence不可写但IDB可写时写失效快照；全部存储均不可写时明确提示可能回到旧快照，不承诺持久恢复暂停。准确修复/复审另见新证据，不改签首轮失败。
