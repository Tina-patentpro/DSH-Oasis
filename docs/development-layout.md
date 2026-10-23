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

## 隔离 Desktop 地址与原生草稿恢复

阶段2实际重启验证后，开发专用Profile的 `desktop-shell.config.port` 固定57517、`networkExposure` 保持loopback。原生DSH会话草稿/Sidebar视图由浏览器localStorage持久化；原port=0每次分配不同origin，业务存储恢复但原生草稿不可见。运行同一隔离userData时须保持地址，端口冲突应显式失败，不能静默回退随机端口。此设置仅位于忽略的 `.dsh-test/mac-dev/home/profiles/desktop/cordis.patch.yml`；已审准入指纹随本地配置更新，不修改签名应用或日常Profile。复现与两次连续重启证据见 [阶段2验收](evidence/2026-10-14-stage2-desktop-closeout.md)。

必要真实验收使用显式 `tools/bin/node scripts/macos-development-launch.mjs --check --real-acceptance`，通过已审本地准入后才用 `--start --real-acceptance`。默认启动仍是合成模式。正式入口只对固定模型/网站Host提供HTTPS代理旁路，renderer继续阻断外网；原生密钥和网站登录在设置中由用户完成，不复制日常credentials。详见 [阶段3准备](evidence/2026-10-14-stage3-real-acceptance-preparation.md)，准备不等于实际双来源验收通过。

## Mac组件安全测试与独立依赖夹具（2026-10-21）

根目录执行：

```zsh
tools/bin/node --test tests/native-markdown-policy.test.mjs tests/sidebar-safe-file.test.mjs tests/web-markdown-policy.test.mjs tests/macos-safe-preview.test.mjs
```

测试先按 `.dsh-test/mac-dev/evidence/admission.json` 核对指定UI/Web/Sidebar的版本和文件hash，不检查通过或更改整套Desktop准入。原生Markdown完整渲染所需依赖另在 `.local/test-runtimes/dsh-0.2.0-rc.2-639ed015/deepseek-harness-639ed015397290b3745d163aafe02ffee4aa3f84`，禁止从已升级的签名应用node_modules补缺。不存在/漂移时明确失败，不自动联网、安装或跳过。

该测试树来自官方tag dsh-v0.2.0-rc.2的固定提交639ed015397290b3745d163aafe02ffee4aa3f84；原锁hash80fe05eae33582ae26839afd05f1965f9b0e4be11034ddf9797af6085d5ba9b1。恢复顺序为：核验固定提交归档→固定pnpm过滤ui-primitives依赖且冻结锁/忽略脚本与pnpmfile/禁止包管理器自动下载→测试副本清空年龄排除并取得严格校验完成回执→固定tsdown仅构建client/store、util/code-language、util/workspace-path支持库。输入助手另校验三个支持库输出hash，CSS只在测试加载器中忽略；不替换真实Markdown渲染逻辑。

当前完整重放命令和环境保留于 `.local/supply-mac-20261021/native-runtime-install.py`、`native-runtime-strict.py`、`native-runtime-build.config.mjs`，原source-identity/归档与上游原workspace配置也保存该处。依赖、缓存、上游源码和测试构建均忽略，不进入Git、产品包或Profile。主包的干净恢复另在 `.local/supply-mac-20261021/clean`，仍是offline/frozen/ignore-scripts，包体下载0；不能与独立测试夹具允许的固定包体下载混写。详见[供应链及Mac测试收口](evidence/2026-10-21-supply-chain-mac-tests-closeout.md)。

阶段3当前固定Mac组合的真实双来源程序验收及正常重启已收口，见 `docs/evidence/2026-10-14-stage3-independent-acceptance.md`。仅隔离Profile原生UI确认的项目关联发生写回并经单项pin复核；未改变日常配置、固定组合或默认合成入口。独立调用预算各一次已消费，不因正式入口仍存在而授权自动新增调用；旧未知记录继续保全。真实验收产物与运行数据留 `.dsh-test/mac-dev` / `.local`，不入Git或发布包。
