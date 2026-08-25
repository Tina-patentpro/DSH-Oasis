# 第一周需求—交付—证据追溯矩阵

状态含义：`CURRENT_VERIFIED`=本轮已有当前静态或本机合同证据；`SESSION_ONLY`=仅第一周记录声明，尚待本轮全新环境复现；`INFERRED`=实现选择而非明确需求；`UNSUPPORTED`=未找到权威来源。

| 声明 | 需求来源 | 实现 | 当前证据 | 当前状态 | 审计边界 |
|---|---|---|---|---|---|
| 先制作 DSH 插件开发 Skill | 用户明确要求；第一周记录11行 | `.dsh/skills/dsh-plugin-development` | Skill内容、合同测试、DSH Provider发现测试 | CURRENT_VERIFIED | 专业内容正确性仍需逐条审查 |
| Bundle 与 Profile 分离 | PRD 177-180行；第一周记录12行 | `package.json#dsh.bundle`、`cordis.patch.yml` | 官方 publish 文档、本机 manifest、pack清单 | CURRENT_VERIFIED | 全新 Profile 安装待 Task 6 |
| Host 注册状态工具 | PRD 178行；第一周记录13行 | `src/index.js` | mock ctx 单测 | SESSION_ONLY | mock不证明真实 DSH 工具目录可见或可调用 |
| Client 为 lazy-CJS | 第一周记录14、44行；官方 Client cookbook | `tsdown.config.mjs`、`lib/client.js` | 官方文档与静态 bundle 合同 | CURRENT_VERIFIED | Browser Loader接受待 Task 6 |
| 浏览器显示“研发 / 专利”入口 | PRD 215-219行；第一周记录14行 | `src/client.js` | 第一周记录的会话观察，没有持久化原始证据 | SESSION_ONLY | 当前仅派发事件，不等于打开工作台 |
| 提供研发/专利任务受理 Skill | 用户“通用技术研发+中国发明专利撰写”；PRD 180行；第一周记录15行 | `.dsh/skills/oasis-rd-intake` | 静态合同测试 | CURRENT_VERIFIED | 只证明受理骨架，不证明完整专利撰写能力 |
| 所有运行验证使用隔离 DSH_HOME | 第一周记录16、18行；用户真实 Profile保护边界 | `scripts/dsh-isolated.cmd` | 包装器静态检查和旧 `.dsh-test` 状态 | SESSION_ONLY | 本轮须用全新临时目录复现并做前后哈希 |
| Dify和收费管理不进入内部开发/复验 | 用户明确修订；第一周记录18、85行 | 两个Skill的范围声明 | 文档和Skill静态检查 | CURRENT_VERIFIED | 插件集成边界仍可审计 |
| 三个 benchmarkDomains | 未在 PRD 或现有项目计划找到；第一周记录80行首次出现中文域名 | `src/status.js`及单测 | 全工作区搜索只命中实现、测试和第一周记录 | UNSUPPORTED | 不能作为已批准验收范围；待用户确认或移除 |

## 第一轮反思

1. 第一周成功建立了 DSH 扩展缝，但原记录把若干“会话中观察到”的结果写成稳定验证事实，没有保存可重复证据。
2. 当前按钮标题声称“打开工作台”，源码却没有消费者；合理结论只能是“入口占位和事件合同存在”。
3. 8项测试是必要的静态护栏，不足以支撑 Host、浏览器或产品可用性结论。
4. 工作区没有事前第一周计划、Git提交或强基线，导致需求来源和变更血缘只能事后重建。
