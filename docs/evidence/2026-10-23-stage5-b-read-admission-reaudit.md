# 阶段5 B批两项P2修复全面复审

日期：2026-10-23。项目`/Users/tinadong7036/Documents/开发项目/dsh-lab`，分支`mac/continuity-v2`，HEAD `84c0cc5bd103a1860e2490494f3f50a1be8404d1`。

**结论：本轮指定Mac离线范围未发现需修复的P1/P2、原46/新增13覆盖中的实质遗漏或新回归。** B-R1读取边界及B-R2干净回归修复保持，正式全量1148/1148、定点59/59、干净最小依赖副本59/59和额外19项时序/I/O检查通过；正式撤回反例仍有效。本轮只复审，没有修改实现、正式测试、测试辅助或台账。

## 复审范围与判断

| 重点 | 实际核对和补证 | 判断 |
|---|---|---|
| 父目录重定向 | 原正式清单/资源重定向；新增在父目录stat后、文件stat前切换的独立调度 | Darwin内核拒绝重定向路径；未取得仓库外文件描述符，未读取仓库外正文 |
| A→B→A | 分别验证打开前恢复A、打开时仍为B后恢复A、已绑定A的描述符后路径发生ABA | 打开前恢复时只打开原dev/ino并正常核验；打开时B被拒绝；既有描述符不转读B。瞬态路径变化不等于读取外部内容，不要求安全的原身份读取也一律失败 |
| 读取前身份绑定 | 全路径检查、实际打开后的fstat/路径复核；打开前后替换根目录，并以硬链接保留最终文件dev/ino | 根身份独立生效，不能用最终同inode或同hash绕过；拒绝前没有读取目标内容 |
| 句柄释放 | 正式13的成功/拒绝对照；额外注入open、读取前/后fstat及第二次read失败 | 成功及错误路径均无活句柄；额外使用原始FileHandle.stat确认EBADF，没有只依赖close计数或让探针清理掩盖泄漏 |
| 容量与短读 | 原正式增长后限额用例；实际2MiB−1、2MiB、2MiB+1清单及17字节分块短读 | 两个界内值读取完整并通过；超限在正文读取前拒绝；短读正确累计，不将短读当EOF。原2MiB准入未扩大 |
| 读取中内容ABA | 首次实际读取后将同一文件内容改B再恢复A | post-read大小/mtime/ctime复核拒绝，未把最终相同正文当稳定读取证据 |
| 干净副本 | 原正式13中的缺.local原46子进程；本轮另复制全部明确依赖，不预建.local，直接运行46+13 | 同字节59/59通过；未借用当前工作区.local，也未把NODE_TEST_CONTEXT造成的空输出当成功 |
| 台账/禁用/历史兼容 | 起点指纹、正式全量及只读核验CLI | 台账14节点/136输入/28格、114缺口及全来源禁用保持，原资源/容量/旧数据源码和活跃lib未改 |

本轮独立调度补证是同一作者新增的审计探针，不代表独立代理或新上下文审查。检查实际采用的Darwin整路径标志组合及读取前元数据绑定，没有发现放宽回退；Linux描述符分支仍只有代码复核，未获得Linux真实运行证据，其他未实现平台保持显式拒绝。本轮不外推跨平台或Desktop验收。

## 原46及新增13的有效性

原46准备临时目录的单行修复保持，断言与正文未改；新增13及其辅助文件与上轮收口指纹一致。正式测试直接调用当前校验器并操作真实合成文件，覆盖成功/拒绝/增长/缺目录，未发现为通过测试而弱化原冻结合同。

本轮在上轮保留的旁置副本重新运行**同字节最终13及辅助文件**：两项均撤回为2通过11失败；仅撤回读取修复为3通过10失败；仅撤回.local准备为12通过1失败。退出码均为1、失败均是预期业务/夹具拒绝断言，说明两项修复分别受到正式回归保护。当前实现没有回退，旧日志没有覆盖。

额外19项探针使用真实文件、原始系统调用和受控时序；根替换使用同最终inode排除仅靠文件哈希/ino误判通过的可能，句柄核验使用原始stat函数确认操作系统描述符已经关闭。所有临时文件均由本轮创建并按所有权清理，没有读取真实Profile、凭据或用户材料。额外探针不计为正式新增数量。

## 新鲜命令与结果

方式：zsh调用仓库固定`tools/bin/node`。日志根为`.local/stage5-b-read-admission-reaudit-20261023/`。

| 命令/验证 | 退出码与实际结果 | 日志 |
|---|---|---|
| `OASIS_UNIFIED_FIXTURE=1 tools/bin/node --test --test-concurrency=1 packages/oasis-professional-service/test/*.test.mjs` | exit 0，1148/1148，无跳过 | full.log |
| `tools/bin/node --test packages/oasis-professional-service/test/v340-source-mapping.test.mjs packages/oasis-professional-service/test/v340-source-mapping-admission.test.mjs` | exit 0，59/59，无跳过 | formal59.log |
| 缺.local的明确依赖副本，同字节46+13，`--test --test-concurrency=1` | exit 0，59/59，无跳过 | clean-both59.log |
| `tools/bin/node --test .local/stage5-b-read-admission-reaudit-20261023/read-contract-boundaries.mjs` | exit 0，19/19，无跳过 | read-contract-boundaries.log、read-contract-summary.json |
| 同字节新增13，两项均撤回 | exit 1，2通过11失败 | both-before.log |
| 同字节新增13，只撤回读取修复 | exit 1，3通过10失败 | withdraw-read-only.log |
| 同字节新增13，只撤回.local准备 | exit 1，12通过1失败 | withdraw-local-only.log |
| `tools/bin/node scripts/check-v340-source-mapping.mjs --manifest docs/business-baseline/v340-source-mapping.json` | exit 0，14节点/28格/114缺口；dispatchEnabled=false、realCallVerified=false | mapping-summary.json |

19项不是新增正式回归；正式数量仍1148，不能相加为新的正式总数或换算产品进度。先前补充150没有在本轮重跑，不把旧150结果算作本轮新证据。

## 保全与仍未验收事项

执行起点3327个非忽略文件及上轮修复全部产物指纹已冻结并匹配；报告写入前3327文件完全不变。最终仅给`docs/project-current-state.md`增加复审结果前缀，原状态全文作为完整原字节后缀保留，并新增本报告。源核验脚本、正式46/13、辅助文件、B JSON/Markdown、原16/16/28、生产src/lib、旧资源、容量/历史兼容合同、旧报告/FAIL、依赖/锁/pin均保持起点字节，HEAD/分支不变。

具体指纹、日志/命令摘要及保全结果见`.local/stage5-b-read-admission-reaudit-20261023/audit-summary.json`与`preservation.json`。运行包未改，未重复构建/pack或运行会覆盖活跃lib的verify。

本轮单代理作者复审，未取得独立代理或独立新上下文背书；结论限所核对合同及本地实测，不声称全部文件系统故障组合穷尽。未启动Desktop/实际DSH、浏览器/loopback或新增真实模型/API、登录、上传、费用，未安装/升级、改Profile/pin或提交/推送/发布。API实际绑定、C/D/E接线、当前候选Desktop/正常重启、真实双来源及阶段5整体收口仍未完成，本轮不推进其他批次。
