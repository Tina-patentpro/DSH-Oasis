# Week 3 全面独立审计报告

- 审计日期：2026-08-29
- 审计基线：`02b3eb7e40ff230689be8cae4218180869de836e`
- 证据根：`D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\docs\evidence\week3-comprehensive-audit-2026-08-29`
- 最终裁决：**FAIL**

本报告独立复核当前文件系统中的全部 Week 3 tracked/untracked 实现，不继承此前关闭结论。审计没有修复产品代码，没有启动真实 Profile 中的 DSH，也没有涉及 Dify、收费管理、真实模型、生产环境或真实专业服务。

## 1. Findings first

### W3A-01 · P1 · 持久化结果的阻断门和预览字段没有纳入完整性校验

**位置**

- `packages/oasis-professional-service/src/workbench-domain.js:47-71`
- `packages/oasis-professional-service/src/workbench-service.js:299`

`assertRunIntegrity()` 只复算 canonical input SHA-256 和 `artifact.body` SHA-256。它没有绑定 `result.contentStatus`、`sections`、`risks`、`questions` 或 `disclaimer`。但审核服务直接信任 `result.contentStatus` 决定阻断结果能否批准。

审计使用真实 `local-mock` 生成一个 `blocked` 专利结果后，仅把持久记录中的 `contentStatus` 改为 `warning`。记录仍通过 `parseStoredWorkbenchRecord()`，随后服务允许将原阻断运行批准；其他四类预览字段改动也全部被接受。

**影响**：存储损坏或非预期修改可以改变用户看到的结果、风险提示及审核门，而 artifact body/hash 保持不变。此前 W3R-03 所称的“持久记录完整性 fail-closed”并未覆盖全部业务门控字段。

**证据**：`probes/result-integrity-output-v2.json`。该结果重新打开 W3R-03。

**修复方向**：对确定性 local-mock 从权威 input snapshot 重新生成并比较完整结果，或引入覆盖全部门控/预览/Artifact 元数据的版本化 result digest；不能只扩展 UI 校验。

### W3A-02 · P1 · 当前目标 Profile 与绿洲布局适配器确定性冲突

**位置**

- `packages/oasis-professional-service/src/client/layout-adapter.js:202-203`
- `C:\Users\TinaD\.dsh\profiles\web\package.json`
- `C:\Users\TinaD\.dsh\profiles\web\node_modules\dsh-better-sidebar\src\client\index.tsx:209`

真实 Web Profile 已把用户有意安装的 `dsh-better-sidebar@0.15.2` 列入 bundles。该插件挂载时必然创建 `[data-dsh-better-sidebar]`；绿洲适配器发现任何该标记便返回 `better-sidebar-present`，进入 conflict 并把面板隐藏。

**影响**：按当前真实目标配置同时加载两个客户端时，绿洲右栏无法显示。现有 Week 1/2/3 浏览器验证使用精简隔离 Profile，没有加载这个真实 bundle，因此绿色浏览器结果不能覆盖该目标兼容性。

**证据**：`probes/better-sidebar-compatibility-output.json`。这是当前文件与 Profile 的静态确定性组合结论；本审计遵守 Profile 只读边界，没有把产品写入真实 Profile 做浏览器复现。

**修复方向**：需要明确产品决策：实现一个经测试的共存/协调合同，或把停用 better-sidebar 定义为显式安装前提。不能简单移除 fail-closed 检测后让两个插件同时写 `#root`。

### W3A-03 · P2 · store 卸载在触发 abort 前等待远程保存

**位置**：`packages/oasis-professional-service/src/client/workbench-store.js:765-772`

`dispose()` 先等待所有 `flushWorkspace()`，之后才设置 `disposed` 并调用 `controller.abort()`。若远程 `replace()` 只会在该 signal abort 后结束，dispose 会等待自身尚未触发的 abort。

审计普通生命周期探针确认 `replaceStarted=true`，150 ms 后 `dispose()` 仍未完成。

**影响**：Host/Connection 不响应时，插件卸载 promise 可无限悬挂。布局适配器在当前客户端清理顺序中会先恢复布局，但完整客户端生命周期无法结束。

**证据**：`probes/store-dispose-output.json`。

**修复方向**：先阻止新操作并触发 abort，再对已承认的保存采用明确、有限的 drain 策略；为卸载加入不响应 remote 的回归测试。

### W3A-04 · P2 · 浏览器验证硬编码项目显示名，不能从等价隔离副本复现

**位置**

- `tests/integration/week1-supplement-browser.test.mjs:165`
- `tests/integration/week2-persistence-browser.test.mjs:152,161,170,176,192`

第一次隔离回归使用 117/117 哈希一致的副本，但因目录末级名称不是字面量 `9、绿洲慧写4.0预研`，Week 1 在查找 Workspace treeitem 时超时。把同一文件复制到保留该末级名称的第二隔离目录后，Week 1/2/3 全部通过。

**影响**：仓库移动、重命名或标准临时审计副本会产生假阴性，削弱验证器可复现性。

**证据**：`runtime/week1-verifier.txt`、`baseline/browser-audit-copy-comparison.json`、`runtime/week1-verifier-attempt2.txt`。

**修复方向**：验证器把当前 `projectRoot` 的显示名或 workspaceId 作为显式输入传给浏览器测试，不允许测试正文硬编码本机目录名。

## 2. W3R-01～W3R-06 独立复核

| 项目 | 本次结论 | 独立证据 |
| --- | --- | --- |
| W3R-01 写回身份窗口 | 维持关闭 | prepare/commit 身份、revision、单目标锁和最终 rename 前重验均存在；176 项包级测试通过 |
| W3R-02 提交后清理 | 维持关闭 | 成功 rename 后直接返回预构造记录；提交后文件系统调用测试通过 |
| W3R-03 持久完整性 | **重新打开** | W3A-01 证明门控/预览字段未被完整性绑定 |
| W3R-04 整个真实 Profile 保护 | 维持关闭 | 13,746 entries / 530 links，前后摘要相同；Week 3 内部比较亦相同 |
| W3R-05 静态包审计降格 | 维持关闭 | `scope=STATIC_PACKAGE_ONLY`、`semanticProof=false`，真实工作树 tarball 静态结果 `CLEAN` |
| W3R-06 治理 supersession | 机制维持；旧关闭结论被本报告取代 | 历史证据 1,220 项保持不变；本报告明确给出新裁决 |

## 3. 目标追踪矩阵

| Week 3 合同 | 静态/单元 | Host/浏览器 | 结论 |
| --- | --- | --- | --- |
| Host 工作流目录 | catalog schema/测试 | 真实 chooser | 通过 |
| Schema 表单 | 严格 DSL、预算和服务端复验 | 浏览器输入/保存 | 通过 |
| 项目相对材料 | 路径、扩展名、大小、reparse 检查 | Host 材料登记 | 通过 |
| 流式 SHA-256、正文不持久化 | 文件句柄前后 fingerprint/测试 | Host 证据 | 通过 |
| 不可变输入快照 | canonical hash/深冻结 | Host1/Host2 恢复 | 通过 |
| 确定性 local-mock | 两类 workflow 和输出预算测试 | 真实生成 | 通过 |
| 预览与运行历史 | Client 状态机/纯文本 React 渲染 | 浏览器历史切换 | 通过，但持久完整性见 W3A-01 |
| 人工审核与 blocked 门 | schema/服务门 | 浏览器阻断 | **失败：持久门控未被哈希绑定** |
| 两阶段 no-overwrite 写回 | 故障注入、单 rename、恢复清单 | Host/浏览器写回 | 通过 |
| 项目切换与恢复 | repository/CAS/store 测试 | Workspace A/B、Host1/Host2 | 通过 |
| 目标布局兼容 | rc.2 DOM/几何测试 | 精简隔离 Profile | **失败：真实 better-sidebar bundle 与绿洲确定性冲突** |

## 4. 新鲜验证结果

| 验证层 | 结果 | 证据 |
| --- | --- | --- |
| 包级构建/测试/干跑打包 | 176/176，0 fail | `runtime/package-verify-attempt3.txt` |
| 根级脚本与 Skill | 34/34，0 fail | `runtime/root-tests-attempt2.txt` |
| Week 1 | 第二隔离副本通过；首次目录名假阴性保留 | `runtime/week1-verifier.txt`、`runtime/week1-verifier-attempt2.txt` |
| Week 2 | 通过 | `runtime/week2-verifier.txt` |
| Week 3 | 通过 | `runtime/week3-verifier.txt` |
| Week 3 浏览器 | 198 requests，0 non-loopback，0 console problem，0 page error | `week3/browser/*` |
| 实际原工作树 tarball | 33 entries，SHA-256 `b921f576bd1d3611d287e9d82c0ee043d203e536e0e5df650dab7bfe7eca95f8`，静态 `CLEAN` | `package-original/package-audit.json` |
| 保全基线 | 产品、真实 Profile、历史 evidence 均 0 changes；Workspace 契约和 Git HEAD 相同 | `baseline/closing-comparison.json` |
| Git whitespace gate | exit 0 | `runtime/git-diff-check.txt` |

隔离副本第一次包验证因默认 npm cache 不可写而失败，第三次使用隔离 cache 后通过。隔离副本实际 tarball 的 source map 因 `node_modules` junction 包含真实绝对路径而触发静态检查；直接打包原工作树时该伪影不存在，原 tarball 静态检查为 `CLEAN`。两类失败均原样保留，没有覆盖。

## 5. 证据边界与未验证范围

- 没有接入 Dify、收费管理、真实模型、真实专业服务或生产环境。
- 没有证明技术研发结论或中国发明专利正式稿的专业质量。
- 没有执行新增对抗性安全探针；只使用源码审查、标准测试、普通损坏/生命周期故障注入、loopback Host 和本地浏览器。
- 没有写入真实 `C:\Users\TinaD\.dsh`；真实 better-sidebar 兼容性结论来自当前配置和双方挂载代码，未做真实 Profile 浏览器安装实验。
- 没有暂存、提交、重置、恢复或推送任何现有工作树内容；仅新增本次审计证据。

## 6. 最终裁决

**FAIL**

包级、Host、浏览器和保全验证均为绿色，但 W3A-01 和 W3A-02 是当前目标内可行动的 P1：一个允许持久结果的业务门控脱离完整性证据，另一个使用户当前有意保留的目标 Profile 无法显示绿洲面板。因此 Week 3 不能保持“已关闭”状态，必须先制定并执行修复计划，再重新取得相同层级的独立证据。
