# S6：用户确认 TXT 与极简输入合同

日期：2026-09-20。本批状态：**STATIC_ONLY**。单代理自审，无独立审计；服务接受性来自本次用户明确确认，不伪装成助手已进行真实调用。

## 用户决定及其边界

用户确认：“可以接受txt文件，也允许用户极简输入，省略其余章节字段”。该确认回应前一轮针对“权利要求书生成-Fast”的询问，解除 TXT/章节省略语义不明对后续离线接线的阻塞。不再以缺服务方说明为由反复询问同一事项。

本地统一表单仍以非空技术交底为前置，不要求完整章节或新增最小字数；“极简”不静默解释为完全无输入生成。附图说明、撰写要求、用户指令继续可选。真实上传/生成及费用、真实服务的实际正文返回与人工质量验收仍未执行/授权，不把用户确认改写成运行时 PASS。

## 本批变更

文件根：D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\packages\oasis-professional-service

- src/claims-api-document.js：空可选字段从 API inputs 省略，不发送空 User_input/drawings_explain_TD，不补“无”等默认值。非空字段原文及既有独立标题保持；TXT 仍原文 UTF-8，不拆造章节。
- 映射版本更新为 claims-document-2，准备哈希随映射版本变化；即使可选字段齐全、映射值恰好不变，也拒绝客户端继续使用旧版准备哈希。没有迁移、重算或覆盖历史记录。
- 两项已有测试文件增加极简输入/分别填写可选字段以及旧准备失效验证。本批只有一项生产源文件的三行变更；其余前批未提交修改保留。
- 未新增 UI、配置项、上传器或执行入口，未宣称统一执行及共同结果链路接通。task/prepare-api、task/check-api 的现有未实测/不可提交状态保持；用户确认不是这两个入口的自动激活指令。

## 新鲜验证

执行器 cmd.exe，复用 D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\.dsh-test\run-promotion-check.py 与既有隔离测试依赖。

日志根：D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\.dsh-test\source-promotion-20260915

- 红灯 check-1789878066430553700：30 项中 6 失败，退出 1；旧映射仍发空字段，旧准备仍越过哈希检查进入禁止的运行时边界。
- 绿灯 check-1789878092493943100：116/116，退出 0。命令为 `python .dsh-test\run-promotion-check.py --test test/claims-api-document.test.mjs test/claims-api-preparation.test.mjs test/claims-api-preflight.test.mjs test/oasis-api-contract.test.mjs test/oasis-remote-service.test.mjs test/oasis-upload-checkpoints.test.mjs`。
- 完整 check-1789878093421509900：`python .dsh-test\run-promotion-check.py --npm run verify`，529 通过、0 失败、2 项既有 stage2 路径条件跳过，总 531，退出 0；构建和 pack dry-run 94 项完成。
- 165 项包输入与隔离测试副本一致，相对前批仅 src/claims-api-document.js 及两项测试变化；依赖/锁文件/构建配置、两份 lib、候选 pin 哈希不变。验证回执：D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\.dsh-test\s6-minimal-input-20260920\verification.json，退出 0。
- 未启动 DSH、安装、读取真实凭据、实际上传/调用、修改日常副本、提交或推送。git diff --check 退出 0（既有换行提示不作为失败）。

下一主项仍是将冻结四字段与文档回执接入既有执行状态机和共同结果；本次确认足以继续该离线实施，不再等待相同语义的重复批准。实际外传/费用及安装 UI 的授权和证据分别处理。
