# 逐文件代码、架构与专业能力审计

## Findings

### P2-S01：按钮文案承诺“打开工作台”，但不存在消费者

- `packages/oasis-professional-service/src/client.js:6-13`只派发`oasis-professional-service:open`。
- 全工作区搜索该事件只命中源码、构建文件和source map；没有监听器或面板。
- `src/client.js:19-20`的title/aria-label却是“打开技术研发与中国发明专利工作台”。
- 影响：浏览器测试即使成功点击，也只能证明事件发出，不能证明工作台被打开；用户看见的是无反馈按钮。
- 旧验证遗漏：只检查按钮出现、点击无异常，没有检查可观察后置条件。
- 最小修复方向：第二周实现事件消费者/面板；在此之前将结论限定为“入口占位与事件缝”。

### P2-S02：DSH可执行文件和Provider路径绑定默认全局npm布局

- `scripts/dsh-isolated.cmd:9`固定调用`%APPDATA%\npm\dsh.cmd`。
- `tests/skills/dsh-plugin-development-discovery.test.mjs:7-10`固定读取`%APPDATA%\npm\node_modules\@deepseek-ai\dsh\...`。
- 当前机器恰好符合该布局，但`where dsh`失败；其他npm prefix、pnpm全局安装或POSIX环境将失败。
- 影响：开发Skill声称通用，但验证入口是机器特定的。
- 最小修复方向：允许显式`DSH_BIN`/包根参数，或从已解析shim的真实路径推导包根；测试先验证解析结果。

### P2-S03：三个benchmarkDomains没有权威需求来源

- `src/status.js:1-5`将三域写入公开状态合同；`status.test.mjs:22-26`把它们冻结为测试期望。
- PRD、商业方案和现有计划没有这组三域；第一周记录只在“尚未开展”中提及。
- 影响：实现选择被测试固化为产品验收范围，造成需求反向生成。
- 最小修复方向：由用户确认后写入正式计划，或在确认前从状态合同移除/标为候选。

### P2-S04：第一周真实Profile保护结论缺少历史强基线

- 现有第一周记录声称未修改真实Profile，但任务开始前没有完整哈希或快照。
- 当前只能证明manifest现在未列目标插件，并能证明本次审计前后不变。
- 影响：不能追溯证明第一周全过程没有写入或短暂改动其他Profile文件。
- 最小修复方向：所有后续DSH验证必须在执行前后哈希真实Profile，并在任何写命令前断言隔离根。

### P3-S05：Loopback API工具缺少协议、端点和DSH身份约束

- `scripts/dsh-local-api-smoke.mjs:8-18`只限制hostname。
- URL归一化允许`../`逃出`/api/`前缀；任意loopback端口和endpoint均可被POST。
- 非loopback拒绝已通过负向用例，因此不是外网SSRF；当前影响是误操作其他本机服务。
- 最小修复方向：只允许`http:`/`https:`，endpoint使用固定allowlist，并先验证DSH健康/版本响应。

### P3-S06：研发/专利Skill是受理骨架，不是完整撰写能力

- `.dsh/skills/oasis-rd-intake/SKILL.md`覆盖任务类型、证据状态、技术问题/特征/效果和人工复核。
- 它没有权利要求层级、说明书支持映射、术语表、实施例真实性、单一性、清楚/支持/充分公开或交付模板。
- 第一周记录把它称为“任务受理Skill”，该表述准确；任何“已具备中国发明专利撰写能力”的外部表述都应撤回。
- 最小修复方向：第二周以后按独立Skill/模板和专业验收案例建设，不在当前受理Skill中堆入全部逻辑。

### P2-S07：API烟雾脚本把RPC失败当作成功退出

- 对`session.create`发送缺少DSH envelope的请求时，HTTP为200、响应`result.ok=false/bad-request`，但脚本退出0。
- `scripts/dsh-local-api-smoke.mjs:22-34`只依据`response.ok`决定退出码；没有expected Skill名称时不检查RPC的`result.ok`。
- 影响：Host返回业务错误时，自动化仍可能记录绿色退出码，直接破坏Evidence Ledger可靠性。
- 旧验证遗漏：只对成功的`skill.list`分支检查业务数据，没有失败RPC回归用例。
- 最小修复方向：统一解析DSH envelope；任何`result.ok!==true`均退出非0并输出结构化错误。

## 通过项

1. Host纯状态函数与Cordis注册适配分离，状态对象及域数组均冻结。
2. Host工具的`inject`、`defineTool`、输出schema和render结构符合固定官方文档。
3. Client使用button、type、title和aria-label，基础可访问性合格；slot注入方式符合官方生命周期合同。
4. 隔离包装器使用`setlocal`、绝对项目根和显式shim，解决了当前机器裸命令错误指向/不可解析的问题。
5. Loopback脚本会在读取请求文件前拒绝非本机目标，并对HTTP失败设置非零退出码；RPC失败处理仍有上述P2缺口。
6. 静态凭据扫描无匹配；当前官方漏洞数据库查询为0项已知漏洞。
7. `oasis-rd-intake`明确禁止虚构实施例、实验数据或检索结论，并要求工程/专利人工复核。
