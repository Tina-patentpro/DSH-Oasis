# 全部变更提交与分支合并回执

2026-11-27，北京时间。用户授权“提交所有的变更，合并所有的分支”。已分别提交三个工作树的应入库内容，并将全部 9 个本地分支及本次取回的可见远端分支归并到 **mac/continuity-v2**。源分支保留，三个工作树在审计记录提交前均为 clean。已验证的集成提交为 `bfb5851dde25e4358469906fbd0eba65b54721c7`；本目录及当前状态入口随后另作审计提交，最终提交号以 Git 为准。 [复核](execution-preflight.json) · [核验](verification.json) · [分支祖先核对](all-branches-proof.json)

| 工作树/分支 | 本次保全提交 | 文件数 |
| --- | --- | --- |
| codex/pdf-m06-minimal-20261029 | 9d3bee244ad1f7e6475b3263728fdc618a2b4d0d | 2364 |
| codex/pd-m06-action-note-20261026 | 252f0689c44d03844eb1de96000decf9fe6b5f51 | 85 |
| codex/v340-node-professional-api | f1668d79ef9cf19cc0b707e592bbd42e3c340a22 | 24 |

主开发线先快进到包含全部累积改动和 M02 回执的提交，再三方合并 M06 工作树。18 处冲突保留后来已加入的双 Skills、原生恢复、设置和候选身份约束，并合回旧分支独立工程记录入口及非冲突增量。该入口保持可信代码组合显式选择，默认入口/Config/RPC 不启用，不触发实际运行。旧副本及全部分支历史已先保全。 [冲突记录](pd-conflict-resolutions.json)

GitHub 文档线合回当前 README 中，保留协同治理导航和原公开更新说明。独立预览线使用独立根历史且将插件作为仓库根包，直接合并会冲突于主工程布局；采用带该分支父提交的子树合并，将 **139 个原始文件逐字迁入 packages/oasis-dsh-next-preview**，主包仍在 packages/oasis-professional-service。原预览文件的许可证和版本记录保留，其原发布凭据不自动覆盖新增未发布改动。 [逐字核对](preview-tree-proof.json) · [预览目录说明](../../../packages/oasis-dsh-next-preview/INTEGRATION.md)

| 验证 | 结果 |
| --- | --- |
| 主包客户端构建 | 退出 0。 |
| 主包最终完整离线测试 | 1,687 项：1,636 通过、47 失败、4 跳过。 |
| 遗留失败对照 | 合并前快照的定向子集已有 48 项失败，其中 47 项同属旧映射检查，另 1 项是过时的包清单断言。后者按已采用的许可证/通知文件修正后通过。 |
| 47 项失败根因 | 2026-10-23 冻结校验要求旧 oasis-api-contract.js 哈希；现文件与合并前快照逐字相同，旧固定 hash 不符。保留其 MAPPING_RESOURCE_DRIFT，不修改 expected hash 冒充通过。 |
| 4 项跳过 | 旧固定 DSH Desktop 的提供方文件已不存在；测试明确标记缺少原环境，不拿 NEXT 或其他版本替代。 |
| 合并冲突定向回归 | 35 项：31 通过、4 项上述固定 SDK 环境跳过。 |
| NEXT 独立预览 | 13/13 合成合同测试通过；固定依赖下客户端离线构建退出 0，输出至私有临时目录，原预览包字节保持。 |
| 主包 npm pack dry-run | 离线、忽略生命周期脚本、私有缓存，退出 0；153 文件，不含测试、依赖或运行数据。 |
| 协同结构 | PASS，仅证明结构，不代表业务/发布验收。 |

[主包完整测试](main-tests-final.log) · [合并前对照](baseline-tests-final.log) · [冻结漂移](legacy-mapping-drift.json) · [定向回归](merge-targeted-tests.log) · [预览测试](preview-tests.log) · [主包构建](main-build.log) · [预览构建](preview-build.log)

提交前对 2,473 个应处理文件进行了令牌/私钥模式扫描，未发现命中。所有工作树的未提交文件和原始 Git patch 另存私有保全目录，完整 Git bundle 已 verify，并保留原 stash `c91b5710f82b1d69bcd2ea55aa0199d50c8a2c50`，没有恢复此前回退的 next.7。凭据、依赖、运行数据、归档、Finder 元数据及预存的旧头比较临时文件保持本地，不强行入库或删除。

最近 M02 的隔离修订以源码差异及具名回执入库，旁置 Profile 和私有候选副本不因 Git 合并转为主包部署。原 FAIL/UNKNOWN、调用许可已消费、专业/用户与发布状态保留。没有模型、专业 API、登录、上传或费用操作；没有升级依赖、改日常 Profile、安装、推送或发布。本轮仅完成本地提交和合并，47 项遗留测试失败仍明确保留。
