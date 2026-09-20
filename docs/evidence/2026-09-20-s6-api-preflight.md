# S6 统一 API 运行前核对（3b.2）

日期：2026-09-20。当前目标状态：**STATIC_ONLY**。用户批准继续下一步；本批只做 Host/RPC 离线接线和隔离测试，不是统一 API 执行、Desktop 或真实业务验收完成。

## 范围裁决

核对当前源码、S6 OpenSpec、阶段 5 接入计划及 2026-09-13 至 2026-09-20 相关证据后，TXT 接受性、省略其余章节字段和实际权利要求正文返回仍无验证记录。不能把本地映射或已保存 schemaHash 当作这些语义成立。因此先将准备快照接入既有服务的只读运行前核对，而不是猜测创建合同或扩大测试基础设施。任务 3b 仍未完成；代价是实际执行与共同结果链路尚不能交付。

本批不修改任何服务端或日常 DSH；不读取真实凭据，不安装、不启动 Desktop、不真实上传/生成/轮询/流水查询，不提交或推送 Git。

## 实现

包根：D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\packages\oasis-professional-service

- src/oasis-remote-service.js：提取原本本地只读的 prepareClaimsMapping 供复用，新增 checkClaimsMapping；不改变 legacy start/continue、存储 schema 或上传状态机。
- src/workbench-rpc.js、src/workbench-connection.js：新增精确 task/check-api；严格接收 Workspace/task、业务/原生设置 revision、准备哈希及 remoteReadConfirmed=true。额外正文、材料或身份参数拒绝；不自动调用该入口。
- 先从权威唯一草稿重新准备并核对哈希，过期时不解析凭据或访问网络。捕获一次 runtime，核对环境/origin；认证账户正确后才读取目录、选定服务详情与指定后台项目。
- 使用现有客户端的四个元数据接口及其解析链；只发送既有服务名称/项目 ID，不发送交底正文、文档或 Skill。精确核对账户 ID、服务 ID/endpoint/process/schema、folder ID、参考价格和余额；不会根据同名猜测绑定。
- 读取后检查冻结 runtime，再重新检查本地准备，拒绝期间草稿/设置/Workspace/绑定变化。返回观察到的非秘密身份、参考价格/余额和准备哈希，不返回原始账户或详情响应。
- 始终 status=unverified、canSubmit=false，保留 REMOTE_DOCUMENT_CONTRACT_UNVERIFIED 和 UNIFIED_API_EXECUTION_NOT_CONNECTED。观察值不是费用确认、可复用提交许可或专业质量证明。
- 凭据捕获及 API 错误返回有界 RPC 失败；真实 captureOasisRuntimeCredential 的 REMOTE_RUNTIME_CHANGED 被保留为安全错误码，不输出异常原文。认证失败不重试。

## 红绿及最终验证

执行器：cmd.exe。复用隔离 runner：D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\.dsh-test\run-promotion-check.py。其 HOME/DSH_HOME/缓存/临时目录均在既有隔离构建树，不使用主项目旧 node_modules。

实际 Node v24.19.0；目标隔离 @deepseek-ai/dsh-client-connection 包版本 0.1.5-rc.1，沿用其精确 Fetch/RPC 接口。未执行全局 DSH/pnpm 或安装任何依赖。

日志目录：D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\.dsh-test\source-promotion-20260915

| 回执 | 结果 | 证据 |
|---|---|---|
| check-1789877532348242100 | 20 项：2 通过、18 失败，退出 1 | 新入口未注册/未知路由，目标行为缺失；两项非法参数拒绝是既有行为，不算新增实现证据 |
| check-1789877599038998700 | 96/96，退出 0 | 第一轮新功能与受影响回归 |
| check-1789877658637226800 | 24 项：22 通过、2 失败，退出 1 | 补充真实凭据冻结函数后发现错误码丢失、捕获异常未转安全 RPC 失败 |
| check-1789877679797441300 | 143/143，退出 0 | 修正后最终定向回归 |
| check-1789877680661775600 | 526 项：524 通过、0 失败、2 跳过，退出 0 | 完整 npm run verify，构建与 pack --dry-run 94 项完成 |

最终定向命令参数：

```text
python .dsh-test\run-promotion-check.py --test test/claims-api-preflight.test.mjs test/claims-api-preparation.test.mjs test/oasis-upload-checkpoints.test.mjs test/oasis-remote-service.test.mjs test/oasis-runtime-snapshot.test.mjs test/oasis-workspace-binding.test.mjs test/host-tool.test.mjs test/host-runtime.integration.test.mjs test/workbench-connection.test.mjs test/workbench-rpc.test.mjs
python .dsh-test\run-promotion-check.py --npm run verify
```

新测试使用真实 repository、RPC/精确路由、真实 API client/normalize 链；仅持久层底座、原生设置/运行时边界与 fetch 响应用合成替身，未建立 HTTP 服务或实际外联。补充真实凭据捕获函数验证。断言无业务/设置写入、无上传/创建、交底不进入请求、原始身份字段不进入响应，以及检查前/期间变化拒绝。

两项既有 stage2 隔离路径条件跳过：approved isolated Home admits only the explicit native offline flag；isolated Host declares native services before accessing Cordis context。不是本批回归失败，也不冒充本批 Desktop 验证。

## 保全和自审

- 开始时前批 164 项输入及两份 lib 与前批 SHA 一致；结束 165 项源码/测试/包输入与隔离测试副本逐项一致。
- 相对前批仅三项源码变更、三项精确路由注册数断言更新及一个新测试文件。依赖/锁文件/补丁/构建配置、两份 lib 和已有候选 pin 文件哈希不变；主目录原有未提交修改保留。
- 权威 API 文档 SHA-256 仍为 429357F3E60E39AEAAE1C879C475D629633E88F5A1F71975C618C6899768FEB1。
- 机器可核查清单和日志 SHA：D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\.dsh-test\s6-preflight-20260920\verification.json；生成命令退出 0。git diff --check 退出 0，仅既有 LF/CRLF 提示。
- 单代理逐项自审：不重建引擎、不创建第二份用户草稿、不把观察结果升级为已验证服务；无独立审计证据。未声明日常安装全树重新验收，仅本批未写入/启动。

## 下一项真实前提

需要服务方非秘密说明或有界实测证据，证明当前“权利要求书生成-Fast”接受 TXT 技术交底、允许省略未映射章节，并返回所需权利要求文字。已询问用户有无说明/成功示例；若没有，应先制定具体合成材料、接收方/账户/项目、最多上传/创建次数及费用上限的受控实测方案，获明确批准后才可调用。

统一执行/共同结果接线、原生绑定选择 UI、隔离 Desktop 验收仍未完成；不将本批 24 个新测试计作业务完成。
