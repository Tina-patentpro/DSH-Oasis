# 阶段0：dsh-lab根目录提升、保全与清理（2026-10-13）

结论：**PASS_WITH_CONCERNS**。已完成用户授权的Git/未提交内容保全、候选源码及.git提升、当前路径和本地依赖闭合、恢复材料归档及可撤销清理。新根目录构建、受影响测试及清理后的 `--check` 通过。保留的关注是固定pnpm的新路径供应链政策校验未完成；不将失败过程记录为安装成功。

## 授权与范围

用户明确要求使用 `/Users/tinadong7036/Documents/开发项目/dsh-lab` 作为直接源码/Git根目录，并批准阶段0构建、定向测试及准入检查。不启动DSH，不发起真实模型/API调用，不提交/推送。默认单代理；本轮为作者复核，没有独立审查。

没有产品业务行为修改。未进行GUI、登录、模型/API、材料上传或发布；未改签名应用、日常Profile、全局PATH/HOME或shell配置。归档旧数据通过目录移动保全，不读取其中认证内容。

## Git与文件保全

- 分支仍为 `mac/continuity-v2`，HEAD仍为 `73b826f05c64142ea7bf866d10bc67e10da809be`。
- `.archive/pre-root-20261013` 保存完整候选快照（4,200个目录项）、原.git/index、refs、HEAD、分支、暂存/未暂存二进制patch、未跟踪与原隔离模板、全refs bundle。
- 快照逐项复制核对通过；严格 `git fsck` 和bundle verify退出0。提升后，在任何路径修改前，再次核对原文件、HEAD/refs/index及二进制差异一致。
- 原源码文件结构保留。README和项目说明改成当前入口，原文在完整快照中保留；AGENTS保留历史规则并补当前根目录条款。
- 本地origin仅重定位到归档中的同一 `windows-recovery-v2/git-mirror.git`，没有推送或改变其Git内容。
- 后续Git只读检查刷新了当前和快照index的文件系统stat缓存；对象ID、stage、mode、索引标志及暂存patch均保持。初始raw index哈希在原清单中保留，不声称检查后的index文件与初始逐字节一致；恢复核对以这些内容/暂存语义为准。

## 路径与依赖

源码及.git直接位于根目录；固定工具/vendor提升至根目录。迁移父目录归档于 `.archive/migration-20261012`。活动主包不再链接旧Mac `source/node_modules`；固定依赖在根下自己的主包node_modules，store为 `.local/pnpm-store/v11`。

修改和核对范围：Profile的4个link specifier/锁路径、2份安全测试资源URL、工具包装器/工具链接、32项准入路径及当前开发导航。Profile link元数据由固定pnpm11.8.0离线/冻结锁/ignore-scripts/禁止包管理器自动下载真实物化，退出0；4项实际链接逐个核对目标。未手写元数据或升级依赖。

主包manifest与pnpm-lock逐字节保持；依赖正文及相对链接与原输入哈希一致。59个变化仅为实际pnpm生成的.bin包装器或元数据。构建出的client.js只改变依赖来源路径注释；source map只改变对应sources路径，61份sourcesContent、mappings及其他字段保持。准入哈希变化限这份生成文件和两份已审Profile路径文件。

### 保留的pnpm失败

最初复用依赖的快速离线检查退出0，却保留旧storeDir；因此先保留中间副本，再尝试固定store离线重新物化。依赖图、包装器和新store元数据已由实际pnpm产生，但新路径触发锁文件供应链政策验证；带 `--offline` 时仍查询npm元数据/attestations，全部查询被阻断代理拒绝（ECONNREFUSED）。首次180秒超时；后一次发现同一路径仍等待后，精确SIGTERM停止自有pnpm进程（exit -15），不停止其他应用。

未关闭政策/完整性校验，未改锁或下载包，不伪造校验缓存。随后独立逐文件核对依赖正文与原库存一致，固定工具和构建实际可用。本轮本地目录/构建验证通过，**新路径的pnpm供应链政策验证仍未完成**；也不宣称独立离线重新安装全过程通过。未来重新安装需要合法的验证元数据/缓存或另行批准的来源核验范围。

## 实际验证

入口shell为zsh，命令由私有Python以subprocess `shell=False`执行；Node任务使用空继承环境、私有HOME/cache/temp、独立DSH_HOME、合成标志及阻断代理。完整命令/cwd/时间/退出码在 `.local/stage0-20261013/*.json`，stdout/stderr在同名log。

| 检查 | 实际结果 |
|---|---|
| 整理前Mac合同/启动器基线 | 16通过、0失败，退出0 |
| 新根目录固定tsdown客户端构建 | 退出0；生成client.js/map，差异为依赖来源路径 |
| 新根目录Mac合同/启动器 | 16通过、0失败、0跳过，退出0 |
| 新根目录编译安全组 | 21项：17通过、4既有条件跳过、0失败，退出0 |
| 实际Host导出的隔离fixture gate | 1通过、0失败，退出0 |
| `--check`路径更新前 | 退出1，Invalid Mac admission；预期的旧路径拒绝，未启动 |
| `--check`路径更新后及清理后 | 均退出0；root-relocated-build-tests-only; Desktop-not-run |
| 工具包装器语法/目标/版本 | Node24.21.0、npm/npx11.19.0、pnpm11.8.0、Python3.14.8匹配 |
| 本轮修改的已跟踪文件diff --check | 退出0 |

安全组4项跳过因当前输入已经带安全补丁，`patchedMode=false` 下的再次变换/拒绝重复补丁测试未执行；不把跳过算通过。不重打固定补丁、不重复全套verify，不将合成合同扩为GUI或真实提供方验收。

整个既有工作区的 `git diff --check` 仍退出2：227条current-state、192条host-tool、11条fixture-gate的CRLF相关尾随空白诊断。与整理前快照的退出码和逐文件诊断数一致，本轮不清扫用户既有换行。

## 原件与清理

原密封Mac补包SHA256继续为 `3749a9ecdf4e5fb1717c8589e3c822e60491fa66f67c163c2e271bddb4426969`，内层清单、Windows交付清单及原Git bundle哈希在移动前后均保持。Windows接收/恢复、旧Mac源码、定向回退、下载原件、原始成功/失败日志、现有docs/output保留。

移入 `/Users/tinadong7036/.Trash/dsh-lab-stage0-20261013` 的10项：

- 展开Desktop副本：26,174项与当前独立安装应用一致（忽略Finder元数据），约1.30GB；当前准入明确指向现用应用。
- 已完成用途的主包依赖中间副本；原依赖仍归档保留，当前正文哈希匹配。
- 与最终文档相同的README/项目说明中间稿2份。
- 旧候选source/build-home/build-cache空目录3项。
- 当前及迁移目录中的Finder元数据3份。

总计逻辑字节 `1339640815`（约1.34GB），移动后原位置不存在、目标inode保持，废纸篓没有清空；此数字不是已释放磁盘空间。原路径/目标/理由/文件数见 `.local/stage0-20261013/cleanup-manifest.json` 和废纸篓内RESTORE-MANIFEST.json。

## 下一步

继续阶段1：用既有证据和无模型替身诊断流生命周期，不把历史unknown运行改为成功，不清未决锁，不消费旧调用许可。首模板双来源程序闭环后再做界面优化；路线见 [开发计划](../plans/2026-10-13-oasis-development-roadmap.md)。
