# 第三批审计修复执行台账

日期：2026-09-02。状态：STATIC_ONLY。

## 目标契约与状态卡

- 目标来源：用户批准“同意修复”；执行已确认的 F1–F5 修复及本地复审方案。
- 对象：D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\packages\oasis-professional-service。
- 当前阶段：修复执行及本地复审完成；未进入真实 DSH、浏览器、真实 API 或生产验收。
- 成功标准：原反例被安全拒绝，正常管线仍工作，测试/构建可重复，非修复范围字节不变。
- 方案：D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\docs\plans\2026-09-02-oasis-api-phase3-remediation-reaudit.md。该历史方案保持原文，其“等待执行”状态是制定时快照；本台账记载批准后的执行状态。
- 权威 API 文档：D:\OneDrive\4、董娣相关\3、绿洲慧写3.0\绿洲前端\API接口文档-用户端.md，SHA-256 `429357f3e60e39aeaae1c879c475d629633e88f5a1f71975c618c6899768feb1`，执行前后未变。不从前端实现或 query 的附加字段反推新 API 契约。
- 不修改：依赖/锁文件、历史审计证据、权威文档、Profile、全局 Skill/记忆；无提交、暂存、推送、安装或远程写入。
- 执行方式：单代理，cmd，先红灯后最小修复，再写独立安全断言；复审不是第二位独立审计员背书。
- 停止条件：沿用方案中的范围漂移、真实写入、新 P0–P2 等门槛；本轮未触发范围升级。

## 实际变更

1. F1：共享文件 URL 安全规则同时用于 adapter、Domain 和回写出口；拒绝 userinfo、非空 query、fragment。回写 provider 仅保留五个既有白名单字段。
2. F2/F4：continuation 和流水读取绑定 execution 环境；只有通过 key 校验的 create 响应能够记录 `recordIdSource: create`。query 不能补填或覆盖，冲突安全失败；旧无来源 ID 只返回不可验证。
3. F3：对完整流水页先校验再筛选；异常未命中项不能被忽略，多候选拒绝；observed 增加关联未验证标记和交叉字段验证，Client 检查请求 runId。
4. F5：每页观察拥有独立 entry identity 和 AbortController；移除 Workspace、关闭页面和 dispose 时取消并清理状态，旧响应不能覆盖新请求或重建页面。
5. 相关 UI：候选流水而非“已关联”；流水观察不再显示无效停止按钮，工作流等待保留停止。
6. 派生文件：标准 tsdown 重建，不手工处理依赖模板字符串的行尾空白。

总计在本次基线上修改 17 个已有文件：8 个源码、7 个测试、2 个派生产物；均在批准清单。其余 2489 个基线文件哈希不变。没有把原第三批全部 dirty diff 冒认为本次修复；`before` 保存修复前包文件，`source-review.stdout.log` 为逐次基线对比。

## 红绿验证记录

证据目录：D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\docs\evidence\oasis-api-phase3-remediation-2026-09-02。

以下 label 对应同目录的 `.json`（命令/参数/cwd/起止时间/退出码）、`.stdout.log`、`.stderr.log`。计数为用例，不重复汇总成独立覆盖数量。

| 修复 | 红灯 | 绿灯 | 说明 |
|---|---|---|---|
| F1 | f1-red：38/42，exit 1 | f1-green：42/42，exit 0 | 三层 URL 拒绝与回写白名单 |
| F2/F4 | f2-f4-red：8/14，exit 1 | f2-f4-green：24/24，exit 0 | 环境、来源、错 key、冲突与历史兼容 |
| F3 | f3-red：46/51，exit 1 | f3-green：51/51，exit 0 | 整页结构及消费合同；initial 轮 47/51 为 required marker/createTime 正常夹具未同步，记录保留 |
| F5 | f5-red：30/34，exit 1 | f5-green：34/34，exit 0 | 移除/恢复/关闭/dispose；红灯阶段异步拒绝警告通过提前观察测试 Promise 处理，不屏蔽断言 |

## 最终命令与关键结果

包工作目录：D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\packages\oasis-professional-service。

| label | 实际子命令（完整 argv 在 label.json） | 结果 |
|---|---|---|
| full-tests-final | `node --test test/*.test.mjs` | 271/271，exit 0，重建后运行 |
| focused-final | `node --test` 加七个修复测试文件 | 102/102，exit 0 |
| host-inprocess-final | `node --test test/host-runtime.integration.test.mjs` | 1/1，exit 0，仅进程内集成 |
| independent-final | `node --test` 加复审目录 safety-probes.test.mjs | 10/10，exit 0，包含多组循环反例及真实本地文件输出 |
| build | `node node_modules/tsdown/dist/run.mjs --config tsdown.config.mjs --no-clean` | exit 0 |
| isolated-build | 同一构建入口/config，加新证据目录 `--out-dir` 与 `--no-clean` | exit 0 |
| artifact-checks | `node` 加复审 verify-artifacts.mjs | exit 0；client.js 字节一致，map 标准化 sources 后完全相等 |
| pack | `node` 加已安装 npm-cli.js，`pack --dry-run --json --ignore-scripts --offline` | exit 0；43 项，白名单未扩大，证据/测试未打入包 |
| diff-check | `git diff --check` | **exit 2**；仅生成 bundle 4 处模板字符串空白 |
| source-diff-check | `git diff --check -- src test` | exit 0 |
| scope-freeze | `node` 加复审 freeze.mjs | exit 0；2506 基线、17 批准改动、2489 不变、0 越界、0 暂存 |

独立探针首轮为 9/10：测试误将已有 single-use token 错误码预期成 `WRITEBACK_TOKEN_INVALID`，实际为 `WRITEBACK_TOKEN_USED`。核对代码后仅修正新测试预期，原日志保留；并非业务缺陷修复或放宽拒绝要求。

构建摘要：client.js SHA-256 `009546e17bb871f33c43768aee90a4fb759067950c9bfacbdc6bd551d641b604`。两个 map 文件物理哈希不同是不同输出目录下 sources 相对路径差异，mappings/sourcesContent/解析路径相等。4 处行尾空白位于当前 bundle 第 2082、2090、2125、2133 行，均为 Zod 生成代码模板字符串；不宣称全量 diff-check 通过。

## 变更保护与证据索引

- HEAD 未变：`3c2bd5a469b67ed4070b0b9beacc30212cd038e3`，暂存区为空。
- `baseline.json` / `preservation.json`：前后基线及初次后检。
- D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\docs\evidence\oasis-api-phase3-reaudit-2026-09-02\scope-and-inputs.json：严格白名单、新路径边界检查，包输入最终哈希、探针哈希。
- Git 输出曾提示读取用户全局 ignore 无权限；没有修改配置。实际基线枚举、内容哈希、暂存检查及限定输出目录检查均完成。
- 新本地探针输出仅在新复审目录的 `run-*` 中，无真实文件下载或已有项目目录写回。

## 反思与运行建议

此前遗漏来自只测单一正确来源、先筛选再验证、只比较 origin 和正常页面存活路径。本轮通过三层 URL 拒绝、全页污染、来源冲突、异步晚到双分支与完整本地回写闭环补足。无跨项目复发证据或全局修改授权，故不修改共享 Skill/记忆。

目前不建议直接进入真实远程运行。修复和本地复审不是 DSH Profile/Host/浏览器或真实 API 证明；签名 URL 策略、历史数据恢复、create.id/link_id 关系及原有 artifact/预览等价性缺口仍须按复审报告处理。
