# 开发根目录、归档和恢复映射

当前开发与 Git 根目录：`/Users/tinadong7036/Documents/开发项目/dsh-lab`。当前分支 `mac/continuity-v2`，保留原HEAD及所有既有未提交内容。

## 活跃目录

- `packages`、`docs`、`openspec`、`patches`、`scripts`、`tests`、`.dsh`、`output`：原候选内容，源码文件结构保持。
- `tools`、`vendor`：原固定工具和本地Sidebar输入。小型 `tools/bin` 包装器使用相对工具路径；二进制输入不进Git。
- `.dsh-test/mac-dev`：当前根目录对应的隔离运行模板；非日常Profile。
- `.local/build-home`、`.local/build-cache`、`.local/pnpm-store`：固定干净构建和离线依赖环境。
- `.local/stage0-20261013`：本轮操作账本、命令记录、日志、准入差异及清理清单；不进Git。

## 历史路径映射

| 原位置 | 当前位置 |
|---|---|
| `green-oasis-4.0/mac-development-candidate-v2/source` | `dsh-lab` 根目录（活跃源码） |
| `green-oasis-4.0/tools` / `vendor` | 根下 `tools` / `vendor` |
| `green-oasis-4.0/mac-handoff` | `.archive/migration-20261012/mac-handoff` |
| `green-oasis-4.0/windows-v2-received-20261012` | `.archive/migration-20261012/windows-v2-received-20261012` |
| `green-oasis-4.0/windows-recovery-v2` | `.archive/migration-20261012/windows-recovery-v2` |
| `green-oasis-4.0/source` | `.archive/migration-20261012/source`（旧Mac环境，非开发入口） |
| `green-oasis-4.0/mac-development-candidate-v2/rollback-windows-before-mac` | `.archive/migration-20261012/mac-development-candidate-v2/rollback-windows-before-mac` |
| `green-oasis-4.0/evidence` / `migration` / `external` / `downloads` | `.archive/migration-20261012` 下同名目录 |

历史记录保留旧绝对路径与哈希，阅读时按此表定位。原交接包和原样恢复内容不改写。本地Git origin仅由原mirror位置重定位到归档中的同一mirror；没有推送到任何远端。

`/Users/tinadong7036/Documents/Codex/dsh-lab` 既有兼容链接仍指向当前根目录。旧候选source路径已退出使用，不建立指回根目录的递归链接。

## 保全与回退

`.archive/pre-root-20261013` 保存：

- 整理前完整 `candidate-source`，含 `.git`、未跟踪文件及原隔离模板；外部依赖链接只保存链接本身。
- `all-refs.bundle`、refs、HEAD、分支、原Git索引清单及暂存/未暂存二进制patch。
- 4,200项文件/目录/符号链接清单及复制校验结果。

Git检查会刷新index的文件系统stat缓存；当前及快照的对象ID、stage、mode、标志和暂存patch保持，raw index检查后可能与清单初始哈希不同。恢复时分别核对源码文件哈希和Git索引内容，不把stat缓存差异当作业务内容变化。

恢复必须先保存本轮之后的当前修改，再对照清单定向操作。若需重建整理前候选，在新的空目录恢复快照并按原路径清单核对；固定工具及原依赖输入仍可从当前工具、归档和回收清单定位。不要覆盖现有根目录或重新运行旧创建脚本。

归档的外部API原文、旧运行数据和本地认证材料不复制到源码、日志或发布包；不读取认证内容。归档根及保全目录限制为当前用户访问。

## 清理原则与记录

只有通过引用、内容/哈希及使用状态核对的临时或重复对象移入独立废纸篓目录。保留每项原位置、废纸篓位置、原因、数量和校验信息，不清空废纸篓。

构建/测试日志、失败证据、密封包、Windows恢复树、回退文件、旧Mac源码、下载原件、现有docs/output都保留。不会因目录大小或文件名含temp就整目录清扫。

实际回收项目及最终验证见 [阶段0证据](evidence/2026-10-13-stage0-root-relocation.md)。
