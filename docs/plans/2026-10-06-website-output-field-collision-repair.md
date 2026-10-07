# 网站输出字段同名漏项修复实施计划

> 执行方式：用户“按此计划执行”；单代理原地实施，使用 superpowers:executing-plans 与 test-driven-development。无安装、生产调用、提交或推送授权。

## Goal / Contract

修复复审 P2：outputs 中名为 data/outputs 的明确文件对象或一层文件数组不得被误当作响应包装层而静默丢弃。解析器签名、records 协议2、列表/下载接口及安全限制不变。

Spec：D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\openspec\changes\import-website-project\specs\record-materials\spec.md。

## Architecture / Constraints

- 包装位置与终端输出字段分开处理：record.outputs、response.outputs、response.data.outputs、output 的对应位置是输出字段容器；其 data/outputs 字段使用既有 outputFile 校验，不继续解包装。
- response/output 的已知非终端 data、outputs 包装保持有限层读取和兄弟 file_url/file_output；明确文件标记优先作为文件候选校验，未知结构显式不支持。
- 保留输入仅 remote_url、输出 remote_url/tool_file、URL/Windows文件名/预算/重定向/Bearer/归属/revision/冲突/无覆盖规则。不扫描正文、任意递归或增加 Host/Client 协议。
- 使用既有固定依赖副本 Connection 0.1.5-rc.1 / Cordis 4.0.2 与 Node 24.19.0；隔离 HOME/DSH_HOME 与外部 fetch guard。主目录旧依赖不升级，宿主不启动。
- 起点是已有 dirty V2 + 四项修复；建立全部 Git 文件强哈希基线及199项插件输入副本，不能覆盖无关编辑。

## Task 1: 同名字段解析和消费端回归

- [x] test/website-record-files.test.mjs：data/outputs × 根 outputs/response.outputs/response.data.outputs/output.data.outputs × 对象/JSON × 单文件/一层数组，断言角色/名称/地址及无不支持项。
- [x] 非法地址、未知 type/transfer、终端未知嵌套对象明确不支持；已知包装的兄弟附件、去重与冲突保持。
- [x] test/website-record-client.test.mjs：可见附件、complete、合成下载无Bearer/无重定向；元数据变更旧revision拒绝；非法同名字段为partial而非完整空材料。
- [x] 先运行解析/客户端测试，确认目标断言红灯，再最小修改 src/website-record-files.js。不得以删测试或扩展递归消除失败。

## Task 2: 验证与记录

- [x] 定向运行 website-record-*.test.mjs、website-import*.test.mjs、workspace-operation-race.test.mjs，要求退出0、失败0。
- [x] 集成候选运行既有 build / 全部 test/*.test.mjs / npm pack --dry-run --json --ignore-scripts --offline；分别记录退出码与现存skip/提示，不安装。
- [x] 前后主目录/固定副本/验证清单哈希一致；Git基线仅本修复源/测试/必要产物与文档可变化；git diff --check退出0，HEAD/暂存不变。
- [x] 更新本计划、OpenSpec任务、当前状态与本批证据；单代理自审不得称独立审查。离线候选结果不升级为Desktop或生产验收。

## Review Focus / Stop Conditions

同名字段、包装兄弟附件、终端未知结构、文件安全及revision、输入回显排除均由任务1测试覆盖。合同冲突、依赖缺失/漂移、基线外变更或范围外失败停止扩展并报告；不写日常/Profile/远端。

## Execution Ledger

- 2026-10-06：计划获批后建立新批次 baseline；主目录与固定副本199项输入等于复审候选。分支 codex/2026-10-05-save-project-changes；没有暂存变更。
- Process decision：用户/项目默认单代理、保全且不提交，本批不用 Skill 的自动派发、提交或清理步骤；复用已批准固定副本，仅保留本批新输出证据。
- Task 1 complete：50条新回归先红（48通过/50失败），最小修复后98/98；位置容器与终端命名输出分离，保留已知有限路径和outputFile安全校验。
- Final self-review：仅作者自审，非独立审查。补10条标记碰撞保护回归，其中7条分别以4/2/1失败红灯复现，3条不完整文件标记为既有校验保护；最终185/185定向退出0。已知outputs容器/附件集合优先按所在位置识别，不因标量type/transfer_method元数据改变容器身份。
- Task 2 verification：最后候选完整831项，829通过/2既有条件跳过/0失败；build/test/pack各退出0，110包文件。主目录/固定副本/最后verified清单199项一致，仅1源/2测试变动，lib字节不变。待文档完成后执行最终保全检查，证据另存post-verification.json。
- Final acceptance：离线候选STATIC_ONLY；3034项Git文件基线的限定变更、HEAD/暂存、diff check、API文档和最终199项输入核对记录见post-verification.json。不扩展为安装/生产/独立审查完成。
