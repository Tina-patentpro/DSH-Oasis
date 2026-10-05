# S6 Fast 结果编辑与恢复验收

当前状态：PASS。仅本次 Fast 编辑新版本、不继承审核、功能再审核及正常重开恢复合同；不含专业内容质量、独立项目文件接口、整体 S6 或升级/回滚演练。

## 目标与实际操作

用户批准第 1—3 批，排除专业内容质量。只用原开发副本窗口 12192256（Desktop v2.0.9 / Host 127.0.0.1:43121），不操作日常窗口 4720302。

通过 @oai/sky Computer Use 在既有 Fast v2 点击「编辑结果」，聚焦独立「修订结果」框并定位末尾，只追加：

> 功能验收标记：S6版本编辑测试（非专业内容）

点击「保存为新版本」后出现 v3，「待审核」及可用的审核按钮；磁盘 review.status=not-reviewed。随后仅做功能性审核操作，review.status=approved；不代表内容质量或申报意见。最后切回原 v2，不覆盖旧正文文件，不保存 v3 为独立项目文件、不引用或发送 v3。

## 版本与审核证据

业务存储只读核验：D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\.dsh-test\isolated-dev-20260913\home\storages\oasis_workbench.json。

Workspace 5967c480-f400-4083-b650-9176dade70d1；task 98d68e38-3dc7-4060-9187-922a35d11b4a。

| 版本 | runId | artifact SHA-256 | 审核 |
|---|---|---|---|
| 原 v1 | run-eee145b8-cfc6-4ba9-ae7f-dab069fb688d | 66255a3d3d947d8a700bfa3dac2cf06de56344e86a7157fd28a10d5fdbddee74 | approved，原时间 2026-09-14T10:12:46.585Z 保持 |
| 原 Fast v2 | 847bc50d-0995-40ed-9e83-529c1148051e | 34fc83617cc031cb4a0a91f8f61873a6d593f0a358d14b812603fd9f9ee4802b | approved，原时间 2026-10-03T13:20:08.563Z 保持 |
| 编辑 v3 | run-aabf3fcb-e67a-4b3e-8394-83d5f8371a17 | 9d1bc33c153e83e5342d7090b1a2e45182b21dff3cf86f4610543105175bc872 | 初始 not-reviewed / 13:52:49.695Z；功能审核 approved / 13:53:21.638Z |

最终 activeRunId 回到 v2；runCount 由 2 到 3，remoteExecutionCount 始终 1。新增为本地编辑版本，未发起第二次生成。

## 草稿与文件保全

原未发送草稿仍引用 v2。操作前后 accessibility Value 的规范化文本均为 949 字符，SHA-256 均为 790d628fc7df17dbf5ab6df31bb3787a1c40dbf8fb46d5c670927bd7edc8707b。这是 UI 规范化文本比较，不是底层草稿序列化哈希。已有草稿时「在对话中使用」禁用并说明不会覆盖；没有发送或清空草稿。

以下四份文件在操作前后 Get-FileHash SHA256 一致；后验脚本逐项断言，退出 0。基目录：D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\.dsh-test\isolated-dev-20260913\workspace-a。

| 文件（基目录内） | SHA-256 |
|---|---|
| 权利要求书_20260928-103146_v2_OIW.md | 34fc83617cc031cb4a0a91f8f61873a6d593f0a358d14b812603fd9f9ee4802b |
| 权利要求书_20260928-103146_v2_OIW.oasis.json | 1a7b0a99bbca77fa5dad653f3a816200f8915863df8e1e7c4f47ccf7bef9bbaf |
| s3b-synthetic-20260914-01\claims_20260914181030_78ffa9bf.md | 66255a3d3d947d8a700bfa3dac2cf06de56344e86a7157fd28a10d5fdbddee74 |
| s3b-synthetic-20260914-01\claims_20260914181030_78ffa9bf.oasis.json | eaff6d21e268faad72b56006743ea4de2074558baf7bd100e4e2ecd74883a187 |

未新增上传/生成/费用、重装、源码修改或提交推送。单代理验收，非独立审计。正常重开后须另核 UI、审核/回写路径、四份文件及草稿；已请求用户正常退出后通过原隔离启动入口重开，不裸启动 EXE 或强制终止。

## 用户重开后的核验续记

用户回复「开发副本已重开」后重新只读核验业务存储，命令使用 powershell.exe / login:false，退出 0：activeRunId 仍为原 v2，runCount=3、remoteExecutionCount=1；表中三份 artifact 身份与审核时间均保持。v1/v2 的 writebacks ID、relativeDirectory、files/hash、reviewStatus 和 committedAt 均保持；v3 writebacks 仍为空。四份保护文件再次逐项 SHA-256 断言全部一致。

Computer Use list_apps/list_windows 精确返回原隔离 EXE 新窗口 18745860，日常窗口仍 4720302，未对日常输入。首次 activate_window 返回 `failed to activate captured window`；按技能刷新窗口并重捕获一次后，accessibility 未提供业务文档，截图与预期 DSH 工作台不一致，停止所有输入，不使用旧坐标、不操作截图中的其他应用。原因未确定，不将此 helper 问题认定为 DSH 数据丢失或已修复。

已请求用户将原开发窗口置于前台并保持未最小化；不要求再次退出、重装或清空/发送草稿。重开后的草稿、版本导航及已保存文件 UI 仍待实际捕获核验；磁盘保全不代替上述 UI 证明。

## 窗口前台后实际恢复验收

用户回复「开发窗口已在前台」后，重新通过 list_apps 精确选择原开发新窗口 18745860。实际截图和 accessibility 恢复为 Desktop v2.0.9 / Host 127.0.0.1:43121 / workspace-a；日常窗口 4720302 未输入。此前 helper 捕获异常不再作为当前阻塞，不对其根因作结论。

1. 重开后原未发送草稿可见，规范化 UI 文本仍为 949 字符，SHA-256=790d628fc7df17dbf5ab6df31bb3787a1c40dbf8fb46d5c670927bd7edc8707b，与退出前一致。
2. 通过原工作台入口打开既有权利要求任务，再选择「结果」，版本 1/2/3 均可见，原 v2 为「已审核」，已保存文件仍显示权利要求书_20260928-103146_v2_OIW.md。「在对话中使用」因现有草稿禁用，未点击发送或覆盖草稿。
3. 点击 v2「打开当前文件」，等待加载完成，DSH 原生文件 Tab 实际呈现原 Markdown 正文；未编辑或点击保存。
4. 返回工作台查看 v3，功能验收标记可见，状态「已审核」保持，未继承 v2 文件写回。最后选回 v2，草稿哈希再次保持。
5. UI 操作后只读业务存储复核退出 0：activeRunId=v2，runCount=3、remoteExecutionCount=1；三版本 artifact/审核时间及 writeback 数量分别 1/1/0 保持。四份保护文件 Get-FileHash SHA256 再次逐项匹配前表，断言退出 0。

正常重开恢复与文件打开的实际 UI 证据现已补齐，停止重复此项测试。没有重新审核、生成、上传、费用操作、下载、安装、日常输入、提交或推送；专业质量不在本合同内。
