# 第四批验证器修复记录

状态：**BLOCKED_WAITING_FOR_USER**

代码修复与本地回归已完成；正式 prepare 构建/打包复验尚未运行，等待用户确认真实 DSH 写入已暂停。本状态不是测试失败，也不表示第四批完成。

## 修改范围

仅修改两个批准文件：

- D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\scripts\verify-oasis-api-phase4.mjs
- D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\tests\scripts\oasis-api-phase4-contract.test.mjs

其他新增文件均为本 attempt 内的冻结快照、RED/GREEN、命令记录及报告。业务源码/产物/依赖清单/锁文件、API 文档、原 fixture、旧验证器与所有旧 attempt 均未修改；未暂存、未提交、未切换分支。

## 已实现及验证

1. **独立后检**：资源、Profile、保护文件、API、HEAD、暂存区及新增路径逐项检查；一个失败不跳过其他项。保留主错误、清理失败、保护失败与证据写入失败；不可读项明确记录。台账写入失败不能得到完成状态。
2. **命令生命周期**：记录 spawn error、实际 close code、退出码、信号和起止时间；构建超时 120 秒、其他命令 60 秒。只终止持有的子进程并等待 close。测试实际验证不存在 executable 与超时子进程退出。
3. **依赖复制**：复制物理树后重建副本内部目录链接；拒绝外部、断裂、文件目标链接、重复目标及复制中内容/元数据变化。合成多级、多版本 pnpm 拓扑通过真实 Node ESM 导入；不扁平化、不手动补 ansis、不回链源目录。
4. **Profile 静止门禁**：三次快照、间隔五秒；内容、集合、链接、元数据或读取竞态异常均拒绝。逐文件哈希前后比对 stat，外部链接不遍历。此逻辑仅在合成目录/可控时钟下验证，本轮尚未对真实 Profile 执行静止门禁。
5. **阶段隔离**：新增显式 prepare；默认完整模式和 integration 在准备前拒绝，明确列出缺失的浏览器驱动和公共配置 UI 前提。prepare 在副本构建/打包后停止，保留但不进入旧的未验收集成分支。没有创建空浏览器文件或用 skip 冒充完成。
6. **归档验证**：使用本机已有 npm tar 读取器只读检查归档，不解压、不引入依赖；对实际归档的路径、类型和文件哈希与预期逐项比较。合成归档的正确、额外/缺失预期、哈希不符场景通过。
7. **create 负向用例修正**：用正确的 id/key/inputs/api_process/folder_id 仅增加 extra 字段，另起 fixture 证明正确 wire body 能成功，不再混入命名错误影响断言。

## TDD 与新鲜回归

独立新增断言分批红灯再实现；日志及结果见本目录 red-green-ledger.json。后检批第一次 GREEN 中发现 Windows spawn 错误的 close code 为 -4058，已区分“没有进程退出码”和“原始 close code”，后续通过。复制元数据变化用例也确认先失败再修复。

最终修改后的命令结果：

| 检查 | 结果 | 边界 |
| --- | --- | --- |
| node --test tests/scripts/oasis-api-phase4-contract.test.mjs | 43/43，退出 0 | 原 19 项 + 新增 24 项；合成目录/本地 HTTP |
| node --test tests/scripts/*.test.mjs | 79/79，退出 0 | 包含上述 43 项，不重复计算 |
| node --test packages/oasis-professional-service/test/*.test.mjs | 271/271，退出 0 | 业务包既有单元、合同、in-process 集成，不是新 CLI Host |
| 两个修改文件 node --check | 退出 0 | 语法 |
| 未跟踪修改文件逐行空白检查 | 0 项 | 补足 git diff 对 untracked 的盲区 |
| git diff --check | 退出 2 | 原 lib/client.js 四处既有模板空白，未修改 |
| scripts/tests/src/test 限定 git diff --check | 退出 0 | 未新增已跟踪源码空白错误 |

实际测试 argv、cwd、executable、时间和退出码保存在 all-final-commands.json；最终复审后重跑的日志以 post-review 开头。RED/GREEN 早期起止时间没有单独仪器记录，不伪造时间；保留 TAP 和工具调用退出结果的对应台账。

## 保护结果

- 冻结 2,731 个已有文件：仅两个批准文件变化，其余 2,729 个无变化；0 个读取失败，0 个额外新增路径（除本 attempt 允许输出）。
- 第三批 83 个冻结包文件重新哈希：0 漂移。
- API 文档 SHA256 未变：429357F3E60E39AEAAE1C879C475D629633E88F5A1F71975C618C6899768FEB1。
- HEAD 仍为 3c2bd5a469b67ed4070b0b9beacc30212cd038e3，暂存区仍空。
- git 全局 ignore 不可读警告如实保留；清单结合本次 Git 列举和历史冻结文件，不将已知保护项因列举变化排除。结论限于明确冻结集合，不冒充全磁盘审计。
- 本轮修复/回归没有运行真实 Profile 快照或 DSH CLI，没有读取/写入真实凭据，没有停止用户进程；合成 fixture 与测试子进程均在测试生命周期内关闭。

## 尚未完成与下一步

用户确认 C:\Users\TinaD\.dsh 的写入已暂停后，才能运行以下已批准的正式准备复验：

工作目录：D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研

```cmd
node scripts/verify-oasis-api-phase4.mjs --stage prepare --evidence docs/evidence/oasis-api-phase4-2026-09-02/attempt-003 --modes standalone,better-sidebar --offline
```

目前没有创建 attempt-003，也没有创建本轮真实包准备运行根。正式复验仍需验证：真实已安装依赖副本、两个独立副本标准构建、client.js 字节/map 一致、43 项真实打包内容，以及真实 Profile 前后保护。不能以合成依赖/归档测试替代这些结果。

原第四批的公共 Settings/Credentials 产品界面、浏览器驱动、CLI 安装、live Slot 树、Host 重启和双模式浏览器矩阵仍未执行，继续受独立门禁约束；不通过配置文件或内部 RPC 绕过。未调用真实非生产或生产业务 API。
