# 4F 最小修订：运行摘要与失败反馈

日期：2026-09-10。当前修订证据等级：**STATIC_ONLY**。用户“同意进行下一步”批准上一轮提出的现有运行记录/结果页最小修订，不包含真实调用、安装、提交或发布。

## 目标合同与实施范围

已证实的问题是错误记录信息丢失，不是已找到两次真实生成失败的根因。按以下三步实施：

1. 在既有测试中先断言原生结束原因/用量能够到达运行记录，业务格式失败与流失败分开，历史记录无摘要仍可读。
2. 仅修改既有适配器、Host 服务、持久化合同和结果页；新增一个小型共享摘要合同模块，不增加 RPC、后台观察器、事件日志服务或诊断入口。
3. 定向离线回归、包级验证、固定 Desktop Node 原生替身集成及单代理自查；到本地证据边界停止，不再发模型请求。

范围之外：不改 DSH/Sidebar/Desktop 版本、原生模块、模型/密钥设置、120s 超时、16384 上限、Skill/输入/成功合同、未知运行锁或重试策略；不迁移历史记录，不补写历史原因或用量。

## 实现

- `src/local-run-summary.js`：共享 `executionSummary` 合同。仅允许失败阶段 preparation/stream/result-contract，结束原因 stop/max-tokens/tool-calls/error/aborted，以及五项非负安全整数 token 计数。适配器与服务只复制白名单自有数据属性，不执行 metadata getter，不保留额外字符串、正文、推理、headers、原始异常或凭据。缺失用量不置零；usage 是最后一次报告的快照，不累加重复事件。
- `src/dsh-generation-adapter.js`：保留接收到的有限结束原因/数值用量，成功和失败均返回快照；仍拒绝非 stop 或无效流，原 failureCode 和 unknown 语义不变。
- `src/local-generation-service.js`：在现有终态提交中保存摘要；累计结果解析失败明确标记 result-contract，仍为 failed/INVALID_OUTPUT、result=null。适配器错误保持自身阶段，不把未知情况推断成截断。存储冲突与人工停止沿用旧机制，不用晚到结果覆盖已经结束的 unknown；因此强制中断/旧记录可能仍显示“未记录”。
- `src/workbench-contract.js`：仅对 dsh-local 增加可选严格摘要；旧记录没有字段时不新增默认值，prepared 不接受完成摘要，completed 不接受失败阶段。没有改变已有输入/产物哈希或执行身份。
- `src/client/UnifiedResultPanel.js`：只有明确 stream/max-tokens 才提示输出上限，result-contract 提示结果格式不合格；unknown 仍提示状态未确认而非取消或退款。折叠的“调用记录”展示阶段、结束原因及用量，缺失显示“未记录”；数值明确为提供方报告的 tokens，不等同实扣。编辑版本沿用的摘要标注“原始调用记录（非新增调用）”。未新增重试按钮。
- 客户端 `lib/client.js` 和 source map 已由现有构建更新；实际 Desktop 尚未加载本次构建。

以上 `src/`、`test/`、`lib/` 均位于 `packages/oasis-professional-service/`。本轮保留开始时已有的 4F 资源版本和其他未提交变更，未进行无关清理。

## 新鲜验证证据

| 检查 | 结果与范围 |
|---|---|
| 测试先行：adapter + native-model-service | 实现前 15 项中 4 项因缺少 executionSummary 失败，退出 1；不是测试编写 TypeError |
| 修订后上述测试 + 固定原生集成 | 24/24（含父测试）、退出 0：stop 有统一产物；length 无产物且摘要可区分；合同失败保留 stop/usage 并标明 result-contract |
| 包内 `npm run verify` | 构建、380/380 测试、pack dry-run 85 项全部完成，退出 0；日志 `.dsh-test/stage4f-summary-verify.log` |
| 相同 Desktop.exe 的 Node 24.18.1 | `node .dsh-test\stage4f3-output-boundary-run.mjs`：29/29（含父测试）、退出 0；覆盖 adapter、local service、native-model service、固定 DeepSeek 原生集成。结果 `.dsh-test/stage4f3-baselines/output-summary-check.json`；上轮 output-boundary-check.json 保留不覆盖 |
| 原生补丁保全 | 上述执行脚本先对 DeepSeek/checkpoint 两模块核对 manifest 中恢复后的 SHA，一致后才执行测试；未再次插入原生观察代码 |

其中 UI 是真实组件的静态 HTML 断言，不是浏览器/实际 Desktop 验收。固定原生集成的凭据/fetch 是内存替身，不调用模型；普通 repository/writeback 回归使用内存或专属临时目录，不打开用户真实 Profile/旧业务 repository。没有读取实际密钥，没有新的提供方用量。

自查重点：白名单之外不进入记录；NaN/Infinity/负数/字符串/越界整数不成为用量；缺失不伪装零；结果合同失败仍无正文；旧记录解析前后相等；unknown 锁定、晚到成功不覆盖、确认失效及不重试保持原回归。只有单代理自查，不称为独立审计。

## 未验证与下一步

- 修复的是后续失败的可解释性，不能恢复两次历史调用未保存的结束原因，也不能证明历史根因已修好。
- 本轮不启动 Desktop 界面；实际窄栏/折叠交互和当前构建加载尚未验收。
- 4F 仍没有可用真实产物，4G 无正文可继续。真实起草质量及实扣均未获新证据。
- 下一步可先在隔离 Desktop 无模型调用地检查现有失败页和摘要展示；真实复验必须再确认调用方案、费用剩余额度及人工生成门禁，不自动进行第三次请求。
- 未提交、推送、发布或修改真实 Profile。已有未知记录保持原样，不因本轮离线通过而解锁。
