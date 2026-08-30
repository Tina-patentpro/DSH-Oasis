# Week 3 Task 5 实施证据台账

- 日期：2026-08-26
- 范围：确定性 local mock、canonical input snapshot、不可变运行历史、幂等、审核门、Host/Client RPC
- 明确排除：Task 6 写回、Task 7 UI、材料正文解析、网络/Dify/收费管理、专业正确性与法律结论
- Git 起点：`main` / `02b3eb7e40ff230689be8cae4218180869de836e`；工作树包含同一 Week 3 Task 1～4 尚未提交的已验证改动
- Profile 裁决：用户已确认 `better-sidebar` 安装为有意操作；Task 5 不修改、回滚或测试该插件

| 层级 | 证据 | 当前结果 | 证明边界 |
|---|---|---|---|
| Task 5 before | `baseline/*-before.*` | PASS：source 88、Profile 13708/530 links、workspace contracts 4、toolchain failures 0；Profile SHA-256 `3B5AADD3C5A26B200F0D673EE94A0FDE38C5B45A5FB49169D12537061A14EEB5` | 用户确认外部安装后的只读基线；不证明后续无并发变化 |
| Runner RED/GREEN | `runtime/local-mock-runner-red.txt`、`runtime/local-mock-runner-budget-red.txt`、`runtime/material-list-budget-red.txt`、`runtime/local-mock-runner-green.txt`、`runtime/runner-purity-audit.txt` | PASS：缺失模块 RED；最大表单/64 材料组合预算先 RED；最终 4/4，forbidden dependency matches 0 | canonical hash、确定性正文、八章节、Markdown/HTML 安全引用、技术 5 类、专利 6 类、blocked/warning、256 KiB 产物预算；不证明专业正确性 |
| Service/Repository RED/GREEN | `runtime/run-service-repository-red.txt`、`runtime/run-service-repository-green.txt`、`runtime/request-key-contract-*.txt` | PASS：运行/审核与 repository no-op 初始 16/21；最终 21/21；请求键合同 7/7 | 权威草稿、材料复检、同键幂等/异快照冲突、8 次上限、旧运行字节不变、审核门、重开恢复 |
| RPC/Client RED/GREEN | `runtime/run-review-rpc-red.txt`、`runtime/run-review-rpc-green.txt`、`runtime/catalog-output-contract-*.txt` | PASS：端点缺失初始 13/16；最终 16/16；目录输出合同 6/6；Task 5 聚焦总计 55/55 | strict `task/create`/`task/review`、拒绝 Client evidence、shared authoritative response；不证明浏览器已调用 |
| Task 5 全包验证 | `runtime/package-verify.txt` | PASS：build；135/135 tests；`npm pack --dry-run --json` 发布清单 28 项 | 本地 Node、Domain fixture、真实临时文件系统与包合同；不证明 Task 6～7、Desktop/浏览器或专业能力 |
| Task 5 after | `baseline/*-after.*`、`baseline/profile-diff.json`、`baseline/source-diff.json` | PASS：source 90、Profile 13708/530 links、Profile SHA-256 与 before 完全一致；17 项源码/测试/生成 bundle/台账变化全部命中精确 allowlist，unexpected 0；workspace contracts 完全一致；toolchain failures 0 | 本批对真实 Profile 为只读，未修改或回滚 `better-sidebar`；只证明采样时点的文件系统状态 |

## 实现结果

- 纯 `local-mock-runner` 仅依赖 SHA-256；不访问 repository、时钟、随机数、文件系统、网络或环境变量。
- canonical input hash 包含 workflow、版本、表单和稳定材料证据；排除 `capturedAt`/材料 `observedAt` 等观察时间，使相同权威内容跨复检保持幂等。
- 主 Markdown 恰含 PRD 固定八个 H2；用户内容以非执行代码块进入正文，外链/HTML/Markdown 不作为可执行内容解析。
- 技术结果固定为 warning 和 5 类结构；专利结果含 6 类结构，存在 `unconfirmedFacts` 时为 blocked，且不产生授权前景、侵权或有效性结论。
- 最大合法输入采用有声明的确定性预览摘录；完整表单与材料证据仍保留在 input snapshot，artifact 保持在 256 KiB 内。
- `task/create` 只从 Host 权威记录捕获表单和复检后的材料；同键同 hash 返回现有 record 且不加 revision，同键异 hash 冲突，第 9 个运行拒绝且不裁剪历史。
- `task/review` 只修改目标 run 的 review；changes-requested 必须有说明，blocked 不得 approved；run/review 可经 repository 重开恢复。
- `requestKey` 唯一性进入完整 Domain schema；目录 `outputSections` 与 runner 的 5/6 类结构保持同一合同。

## 当前结论

`STATIC_ONLY`：Task 5 的本地实现、Node 测试、构建和打包证据完整；尚未执行 DSH Desktop/浏览器中的生成、历史切换和审核交互，也未开始 Task 6 写回。

## 停止条件

- runner 需要访问 repository、时钟、随机数、文件系统或网络；
- 同一 canonical snapshot 不能产生稳定的 input/artifact hash；
- 用户 HTML/Markdown 可作为可执行 HTML 进入主结果；
- `task/create` 接受 Client 提交的 snapshot/result/material evidence；
- 幂等键可绑定不同 snapshot，或运行上限通过裁剪历史满足；
- blocked 结果可以 approved，或 review 改变非目标运行；
- 真实 Profile 出现未归因的新变化；
- 本地 mock 被表述为真实专业结果、法律意见或生产运行。
