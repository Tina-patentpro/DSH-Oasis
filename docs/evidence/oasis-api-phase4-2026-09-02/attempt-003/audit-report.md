# 第四批 prepare 正式副本复验报告

状态：**STATIC_ONLY**

阶段 A / prepare 已完成；第四批整体仍未完成。此次未启动 DSH CLI、Host、浏览器、mock HTTP 或真实业务调用，也未安装 better-sidebar。两个模式名仅表示各自独立的准备副本，不构成布局兼容证明。

## 授权及执行

用户已明确确认“DSH 任务已暂停”。执行范围依照：

D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\docs\plans\2026-09-02-oasis-api-follow-up.md 的阶段 A。

Shell：cmd；工作目录：D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研。

```cmd
node scripts/verify-oasis-api-phase4.mjs --stage prepare --evidence docs/evidence/oasis-api-phase4-2026-09-02/attempt-003 --modes standalone,better-sidebar --offline
```

外层命令退出 0。验证器命令记录覆盖 2026-09-02 11:36:29 至 11:38:51 UTC（北京时间 19:36:29 至 19:38:51）；12 个记录子命令全部退出 0、closed=true，无 spawn error 或超时。

本机 Node 实测 v22.19.0；DSH 安装清单只读核验为 0.1.1-rc.2。没有为版本核验运行 DSH CLI，也没有升级或安装任何依赖。

## 新鲜验证结果

| 检查 | 结果 |
| --- | --- |
| 已批准 runner / 合同测试 / 权威 API 哈希 | 均与计划一致 |
| 第三批冻结包输入 | 83 项，0 漂移 |
| 真实 Profile 前置静止检查 | 三次快照一致；每次间隔包含至少 5 秒等待 |
| standalone 副本标准构建 / dry pack / 实际 pack | 三条命令均退出 0 |
| better-sidebar 命名副本标准构建 / dry pack / 实际 pack | 三条命令均退出 0 |
| 每份依赖复制 | 2,942 个普通文件，646 个副本内部目录链接；没有扁平化 |
| tsdown / ansis 解析 | 独立复核均位于本模式副本 node_modules 内，未回链源目录 |
| client.js | 两副本与原冻结文件逐字节哈希一致 |
| source map | mappings、sourcesContent、41 项解析源内容一致 |
| 实际 tarball | 每份 43 项，文件清单/内容哈希校验完成；两个归档 SHA256 相同 |
| 保护性后检 | 7 项均 checked 且 ok=true，无主错误、清理错误、保护错误或证据写入错误 |

共同 tarball SHA256：`58C4FC11EB0C12468C13E41372E482DA7888E878C5C0D0FC9EC90804AF573423`。

client.js SHA256：`009546E17BB871F33C43768AEE90A4FB759067950C9BFACBDC6BD551D641B604`。

本轮未修改代码，未重跑单元/合同测试；此前 43/79/271 的测试计数不作为本轮测试结果。此次新增的是此前缺失的真实已安装依赖副本构建与打包证据。

## 保护与新增范围

- 真实 Profile 快照覆盖 15,218 个目录/文件/链接条目；三次前检、两模式构建前检查以及最终后检未发现内容、集合或元数据漂移。凭据只读哈希，未解析、输出或复制原值。
- 冻结的 2,766 个既有工作区文件全部无变化，0 个读取错误；API、HEAD、暂存区及新增路径检查均通过。
- HEAD 仍为 `3c2bd5a469b67ed4070b0b9beacc30212cd038e3`，暂存区仍空。既有 dirty 变更没有被覆盖、恢复、暂存或提交。
- 权威 API SHA256 仍为 `429357F3E60E39AEAAE1C879C475D629633E88F5A1F71975C618C6899768FEB1`。
- 仅新建本 attempt 下的证据/复核/报告及系统临时根 C:\Users\TinaD\AppData\Local\Temp\oasis-dsh-p4-dOwJbR；临时副本与旧现场均保留。
- runner 的 resources 检查执行时包含前 9 条命令，后续又执行 3 条只读 Git 后检；独立复核已对完整 12 条记录确认退出 0 且已关闭，未将中间计数当成最终计数。

## 限制及下一步

- git diff --check 新鲜执行退出 2，仍为原 lib/client.js 第 2082、2090、2125、2133 行模板空白；本轮该文件哈希未变，不属于新增失败，未扩围修正。
- 全局 Git ignore 不可读警告及 LF/CRLF 警告保留；保护结论限于明确冻结集合与 Profile 快照，不冒充全磁盘审计。
- 归档可构建/可打包不等于可安装、可加载或公共 UI 可用；未取得 live Slot、设置/凭据界面、Host 重启、双模式浏览器或真实 API 证据。
- 下一步为计划阶段 B：先审查未开放的离线安装分支，再做隔离平台契约探测。它需要独立批准，不因 prepare 成功自动启动。

机器证据位于本目录的 commands.json、evidence-ledger.json、各模式 dependency-copy/product-tarball JSON、逐项后检 JSON 以及 independent-review.json；后者记录了退出后独立复核的时间、输入与断言。汇总字段为 stageComplete=true、phase4Complete=false。
