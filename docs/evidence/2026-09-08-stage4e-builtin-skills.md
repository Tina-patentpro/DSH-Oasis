# 阶段4E：内置Skills文稿、加载器与公开原生服务集成

日期：2026-09-08。授权：用户“同意执行”。执行器：cmd.exe；PowerShell仅显式读取和运行已有关闭检查。单代理自查，不称独立审计。

**状态：STATIC_ONLY。** 已有本地文件、加载器单测和原生服务离线集成证据；当前index/RPC/UI未接入加载器或合同2，未取得此新装配的Desktop普通产品路径证据，4E整体未完成。本状态不抹除原生服务离线证据，也不将其提升为真实模型/安装包证据。

## 本批交付

1. 开发文稿包 `.dsh-test/stage4e-authoring/oasis-patent-claims-v0.2/`：SKILL.md、两份references、输出模板和manifest.json。四份文本13,960字节；frontmatter和引用路径已检查，资源指纹已生成，未交给产品loader或模型。沿用Git忽略，不属于公开分发；未建立加密或访问控制。原v0.1保留，review-notes.md标注业务顺序及持续输出的纠正。
2. `src/builtin-skill-loader.js`：只读、固定四资源布局、独立清单pin、Skill身份/版本和三项执行合同比对、有限UTF-8文本、逐文件与组合指纹、不可变快照、安全错误；不跟随Markdown链接、不执行脚本、不发模型请求。无注册入口、UI、RPC、网络请求或新配置owner。
3. `test/builtin-skill-loader.test.mjs`与公开fixture：实际磁盘文件和junction验证，不读取私有草案/附件。
4. `tests/integration/stage4e-builtin-skill.test.mjs`：使用项目已安装DSH 0.1.2-rc.1的llm、session、persistence和export模块；原生服务上下文与测试提供方全部在当前Node进程内，持久化仅写入新建的`.dsh-test/stage4e-native/run-*`，不是正在使用的Desktop/Profile。

## 模型调用事实与保密边界

通过的最终集成运行有三次**离线提供方**调用：

- 一次业务调用：加载的四份公开资源实际进入system，模型消息只有一份用户输入、没有tools。经既有统一服务形成未审产物，再审核并准备对话资料。该动作只在测试仓库执行，没有发送真实对话。
- 一次错误对照：提供方错误包含公开指令标记，适配器输出固定安全错误，不返回原始异常正文。
- 一次复述对照：提供方把公开指令标记作为正常text返回，适配器将其视为完成正文。**modelEchoCanExposeInstruction=true**。这是保留的风险反例，不是模型能够遵守保密约束的证据，不通过增加字符串过滤制造绿色结论。

原生会话先写入一条公开测试输入，确保真实持久化日志非空；随后调用前后events和原始日志不变，原生导出生成的条目内容与原始日志一致，没有资源标记。此处没有运行Desktop `/export` UI，也未取得4E浏览器ZIP下载闭环；不替代4D的独立交互关注项。

公开替身是旧合同1/unified-text-1/single-call-text-1，用于证实资源加载能接入既有原生调用和统一产物。v0.2文稿声明新合同claims-disclosure-2/claims-cumulative-2/single-call-cumulative-1；测试已确认清单与期待合同不符时拒绝加载，不能把替身证据称为新业务表单已实现。

## 命令与新鲜结果

| 命令/检查 | 结果 |
|---|---|
| 包内 `node --test test/builtin-skill-loader.test.mjs`（先红） | 退出1，缺少目标模块ERR_MODULE_NOT_FOUND。 |
| 同命令最终运行 | 7/7，退出0；资源/清单/合同/路径/UTF-8/大小/冻结/安全错误。 |
| 包内 `node --test test/builtin-skill-loader.test.mjs test/dsh-generation-adapter.test.mjs test/local-generation-service.test.mjs` | 20/20，退出0；没有重跑整批verify。 |
| 根目录 `node --test tests/integration/stage4e-builtin-skill.test.mjs` | 1/1，退出0；一次业务调用加两个对照；public原生服务，不是真实模型或Desktop。 |
| 包内 `node --test test/package-contract.test.mjs` | 6/6，退出0。 |
| 包内 `npm pack --dry-run --json --cache ../../.tmp-npm-cache` | 退出0，64项；包含新loader，不含SKILL.md、指令references、输出模板、测试或开发状态。仅dry-run，未打包发布。完整清单见2026-09-08-stage4e-pack.json。 |
| `node .dsh-test/stage4e-authoring/finalize.mjs` | 退出0；生成文稿资源清单与独立作者侧pin记录，没有导入产品loader。 |
| `git check-ignore` | v0.2入口和manifest均命中已有.dsh-test/忽略规则。 |
| `node .dsh-test/stage4e-check-preservation.mjs` | 退出0；与4D证据比对九份相关源码/构建哈希、四条运行、保存正文均一致；客户端无新loader及公开canary。见2026-09-08-stage4e-local-check.json。 |
| 已有 `stage3-check-closed.ps1` | 退出0；DesktopProcesses=0、IsolatedPortListeners=0。本轮没有启动Desktop。 |

两处测试修正也保留说明：首次目录测试使用Windows跨盘relative得到绝对路径，改为真实相对路径`.`后验证；首次原生导出检查因未建立可持久化事件而没有raw日志，添加独立公开输入种子后验证非空日志。两者是测试设置修正，不通过削弱断言或伪造导出绕过。

本轮不运行真实Profile，不读取凭据，不修改现有隔离Desktop数据。没有新的真实Profile全量前后哈希比较，因此不拿4D的20,533条结果冒充本轮新扫描。Git中的既有4A/4B/4C改动保留；新增源码只有加载器，其余为定向测试和文稿/计划/证据。未暂存、提交、推送、发布、安装依赖或调整上游版本。

## 尚未完成及下一步

- 真正“填写技术交底→生成权利要求”的统一输入合同2、API映射以及累计产物格式接入尚未实现；现有claims必填仍是旧实现，不是新业务要求。
- 原生适配器当前返回纯文字，文稿定义的JSON业务响应与Host累计Markdown组装尚未实现。状态/来源/警示不能靠提示词或关键词匹配冒充已接线；文稿目录中有完整格式约定，但需要后续代码落实。
- 加载器知道可信装配root与pin，不自行决定安装位置或业务Workspace权限。必须在受控Desktop实际装配上验证普通文件入口和资源可见性；函数拒绝junction不等于安装级访问隔离。
- 加载器尚未接入index，缺资源只表现为固定内部错误；未来组合层需把它映射为受影响来源禁用，不能关闭整个工作台或误落到真实模型。不能声称这项UI行为已通过。
- G-SKILL仍未通过。私有资源不能被装入当前运行，真实模型复述风险没有被此离线对照解决。下一批只推进合同和非秘密装配；真实外传、费用、私有运行及发布仍需对应授权。
