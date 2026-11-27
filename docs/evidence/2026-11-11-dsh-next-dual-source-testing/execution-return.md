# DSH NEXT Skills 与专业 API 测试回执

2026-11-11，北京时间。受测安装为 DSH NEXT 2.0.22-next、业务包 `0.1.0-rc.5.next.10`。逐文件比对，活动安装与归档的 136 个文件全部匹配。工作树 `codex/v340-node-professional-api` 的 HEAD 为 `04c2f07ecf8a3b3166784e4106550ecd06d45d83`，安装物对应该工作树的后续未提交候选。执行采用独立测试目录和 Profile，保留现有安装与工作区运行。 [EXEC-R2 复核](execution-preflight.json)

## 实际结果

| 验证 | 结论 | 证据 |
|---|---|---|
| 已装包扩展离线回归 | 264/290，26 项失败，退出 1。19 项由旧 API 目录校验的未定义变量引起。6 项旧本地生成用例要求未随当前归档分发的 `flow-2-6/0.2.2` 资源，1 项旧 API 基线文档用例要求未随包分发的 JSON。 | [原始日志](</Users/tinadong7036/Documents/开发项目/DSH-Oasis/.local/dsh-next-dual-source-v7oj3mx2/offline-regression.log>) |
| API 目录修复 | 恢复旧绑定按已确认 endpoint 查目录的校验，继续要求单一匹配、目录 ID 和处理过程一致。修复后的项目绑定、并发保护和专业服务定向回归 39/39，退出 0。仅应用到具名 NEXT 源码工作树，当前已装包仍为原字节。 | [定向回归](</Users/tinadong7036/Documents/开发项目/DSH-Oasis/.local/dsh-next-dual-source-v7oj3mx2/api-catalog-fix-regression.log>) · [源文件](</Users/tinadong7036/Documents/Codex/2026-11-11/https-github-com-handsomestwei-patent-disclosure/work/dsh-next-github/src/oasis-remote-service.js:324>) |
| 修复候选的扩展回归 | 287/294，退出 1。19 项代码失败已消除，原 7 项旧资源和文档断言仍失败。含新增 4 个合成端到端用例。 | [修复后全批日志](</Users/tinadong7036/Documents/开发项目/DSH-Oasis/.local/dsh-next-dual-source-v7oj3mx2/offline-candidate-regression.log>) |
| NEXT 双 Skill 和服务合同 | 84/84，退出 0。第三方 Skill 的旧夹具通过设置表单写值，与 NEXT 实际使用的 Host 管理偏好不匹配。夹具改走原生偏好读写 RPC 后，验证了切换套件使旧确认失效、新确认使用正确的资源，并且假模型只调用一次。14 节点的 SDK 测试只覆盖离线装配。 | [原失败](</Users/tinadong7036/Documents/开发项目/DSH-Oasis/.local/dsh-next-dual-source-v7oj3mx2/native-suite-and-service-contract.log>) · [按 NEXT 接口复验](</Users/tinadong7036/Documents/开发项目/DSH-Oasis/.local/dsh-next-dual-source-v7oj3mx2/native-suite-and-service-managed-regression.log>) |
| 同版原生 Host | 在空业务存储、独立 Profile 和现有离线入口上，用同一份公开合成文字分别走 M06 本地 Skills 和专业 API 替身。两条路径均生成、审核、保存、原生安全预览，并在 Host 正常重启后回读相同审核版本和文件。Skills 无来源标记，专业 API 文件带 `_OIW`。两次进程均退出 0。 | [原生离线运行](</Users/tinadong7036/Documents/开发项目/DSH-Oasis/.local/dsh-next-dual-source-v7oj3mx2/native-offline.log>) · [原生重启回读](</Users/tinadong7036/Documents/开发项目/DSH-Oasis/.local/dsh-next-dual-source-v7oj3mx2/native-reopen.log>) |
| 当前真实专业服务 | DSH NEXT「绿洲工作台 → 绿洲账户」刷新后显示登录表单，复查时仍未登录。实际目录、详情、项目权限、服务报价、远端生成和账务未核。本轮未提交真实生成、材料上传或付费调用。 | 现有客户端只读界面观察 |

此前 `0.1.0-rc.5.next.6` 已分别取得绿洲慧写和中国专利 Skill 的真实生成回执。它们保留旧版证据身份，本批 `next.10` 真实生成与专业接受待验证。 [两套 Skill 旧版回执](</Users/tinadong7036/Documents/Codex/2026-11-11/https-github-com-handsomestwei-patent-disclosure/work/dsh-next-github/../dsh-next-paid/verified-runs.json>)

## 专业 API 覆盖

| 流程 | 源码固定服务 | 合成结果 |
|---|---|---|
| Flow-1-1 技术背景研究 | Pro · 220／25 | 异步提交、原 key 查询、正文及文件回执通过 |
| Flow-1-2 TRIZ 分析 | Pro · 218／42 | 文字及项目文件映射、异步回收通过 |
| Flow-1-5 技术交底书完善 | Basic · 223／41 | 文件和多图字段映射、异步回收通过 |
| Flow-2-6 权利要求书生成 | Basic · 215／46 | 异步精确路由和原 key 回收通过 |
| Flow-2-7 说明书生成 | Basic · 222／32 | 合成同步响应通过 |
| Flow-5-13 申请文件检查 | Basic · 221／43 | 精确详情 ID、项目文件、异步待结果及同 key 回收通过 |
| Flow-6-14 审查意见答复 | Basic · 213／20 | 合成异步响应通过 |
| 独立附图说明生成 | 167／34 | 同步图像映射、正文回收通过 |

表中斜线两侧为目录 ID 和执行详情 ID。测试用替身模拟同步和异步响应，Flow-2-7 与 Flow-6-14 的实服运行方式仍以登录后的详情为准。额外覆盖受理、仅进度 100%、等待停止后查原 key、费用/权限准备、旧结果保全和未决请求防重。 [合成测试源码](</Users/tinadong7036/Documents/Codex/2026-11-11/https-github-com-handsomestwei-patent-disclosure/work/dsh-next-github/test/v340-professional-services.test.mjs>)

## 真实验证接续

1. 在当前 DSH NEXT 的绿洲账户入口完成登录。先只读核对可见服务的目录/详情 ID、输入及结果 Schema、同步/异步方式、项目归属和参考价。
2. 根据实读结果固定公开合成测试材料、目的地、服务名单和费用。优先用同一组 M06 公开输入分别跑两套 Skill 和权利要求 Basic，随后扩到其余实服。对应提交经原授权办理。异步继续查原 key，失败或未知保留原回执。
3. 按各服务核正文与实际文件、专业内容、审核和保存恢复。修复版若选为实测对象，先完成相应归档和安装身份复核。

本轮是源码修复、合成与同版离线 Host 证据。R7-03 的原 B 真实稿、正式双来源 G0、专业和用户接受、安装版发行沿各自实际证据。
