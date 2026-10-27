# F原生磁盘文件桥接兼容修复实施计划

> **执行者：** 使用superpowers:executing-plans单代理实施；用户指定GPT-6.1/max子代理仅独立审计。沿用户已授权F范围定向修复，不引入新业务设计或重开旧阶段。

**Goal:** 修复固定Desktop公开文件路径桥接与固定DSH原生引用入口不一致，验证磁盘非图片文件恢复既有当前文件引用流程。

**Architecture:** 小型通用Host扩展沿已存在的`webserver/index-inject`公开事件在head注入能力别名脚本；完全复用原生路径解析、引用及文本草稿持久化，不建立附件恢复存储。

**Tech Stack:** Desktop2.0.17、DSH0.2.0-rc.2、Cordis4.0.4、Sidebar0.24.1保持；原UI前端补丁`.1`、Node24.21.0、pnpm11.8.0保持。新旁置通用扩展固定0.0.1。

**Spec:** [准确断点/方案及范围](../superpowers/specs/2026-10-26-desktop-host-file-path-bridge-design.md)、原后续计划F、FH-A01/P2审计。

## Global Constraints

- 签名App、旧前端/准入、业务源/lib/主锁与历史证据不改；无真实调用、消息发送或上传到外部服务。
- 仅接既有公开File能力，不猜路径、不覆盖已有owner、不放宽CSP、不访问私有Map/DOM/store。
- 新准入逐项绑定公开扩展/脚本/manifest/配置和固定组件，旧失败不改签。图片/Blob/旧上传附件/完整F继续开放。

## Review Focus

- 普通浏览器缺能力时不得造路径；单元执行测试验证没有新增桥接。
- 既有原生owner不可覆盖；测试预置owner并验证其身份/行为保持。
- 真实File判定与空路径/异常沿原生函数；测试不允许用文件名或吞错替代。
- 新脚本沿现有head注入、不得改变认证/CSP或根fallback；真实Cordis事件与实际GUI验证非上传分支。
- 重启、A/B切换及已有文本不能错归属；真实无模型GUI和持久化状态核对，仍禁止发送。

## 任务1：适配器及公开事件挂接

**Create:** `patches/desktop-2.0.17/host-file-path-bridge.js`、`host-file-path-bridge.mjs`、`package.json`、`cordis.patch.yml`。
**Test:** `scripts/tests/desktop-host-file-path-bridge.test.mjs`。

- [x] 先写执行测试并运行，记录未接能力的预期失败；不得先写产品实现。
- [x] 实现短的启动适配脚本，只暴露`pathFor(File)`→原生`getPathForFile(File)`。
- [x] 用`apply(ctx)`注册公开`webserver/index-inject`，仅追加固定head script；不用根fallback或修改编译模块。最初HTML link方案已按实际GUI失败退回，原字节/日志保留，不能复用其绿色测试当实际挂接证据。
- [x] 固定Node运行该测试文件，确认通过且不启动应用/网络。当前8通过、0失败/跳过，退出0。

## 任务2：旁置配对与实际恢复

**Artifacts:** `.local/oasis-follow-up-20261026/host-path-bridge/public-injection/`内新无模型Profile准入及证据；失败HTML候选另存，不覆盖上一批。

- [x] 冻结四个通用扩展成员及当前固定公共接口；原前端/签名App和业务候选不改。
- [x] Profile本地link用固定pnpm离线生成新路径锁、冻结后物化；所有模型/账户/自动生成/更新关闭，独立端口57523。
- [x] 先`--check`再启动当前固定App；原生选择公开普通/长Markdown，观察原生文件引用及已有草稿，不发送。
- [x] 正常退出/重启及A/B归属核对，保存新鲜截图/状态/hash/退出码及未验边界，不能以芯片外观代实际投影。恢复为纯文本@路径、结构化occurrence未恢复；仅文件codec为identity，无模型实际消费证据。
- [ ] 交原GPT-6.1/max独立审计；更新当前入口，仅登记实际通过的子集，完整F/P2其余范围不减。

本批结果见[返回](../evidence/2026-10-26-f-host-file-path-bridge-return.md)及[执行清单](../evidence/2026-10-26-f-host-file-path-bridge-execution.json)。局部复选框不改变原后续计划出口。
