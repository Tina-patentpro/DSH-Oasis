# 网站记录导入四项审计修复证据 — 2026-10-06

## 结论与范围
**STATIC_ONLY**：四项审计反例已在本地源码修复并有新鲜红绿证据；固定环境构建/完整测试/离线包装检查完成。未安装/启动Desktop或Host、真实请求下载/上传/生成、改Profile/日常/远端、提交推送。仅当前V2候选，不宣称生产故障已修复或整个项目完成。

用户授权“按此计划执行”；实施合同及裁决见D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\docs\plans\2026-10-06-website-record-import-audit-repair.md。

## 变更
1. 已知response/output/outputs及data、outputs、data.outputs层分别提取附件，不覆盖上层附件；不任意递归，不从正文找URL。未知包装显式unsupported，输入回显不误归为输出。
2. 别名跳过缺失/null/空白值，保留非空非法值拒绝及0大小；不通过低优先级安全值绕过不安全地址/文件名。
3. 命名文件输出的已知type支持remote_url/tool_file，输入仍只remote_url；共用既有地址、路径、大小和元数据冲突保护。不直接调用Dify、不新增接口或放宽附件来源。
4. 切换项目时设置本次请求页码；新项目第1页失败后显式重试仍请求第1页，同项目翻页失败保留此前成功页/选择；不自动重试。

## 新鲜执行证据
执行器：PowerShell（显式选择、无Profile）调用既有Python；离线包装器D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\.dsh-test\website-record-repair-work.py。复用原fast-mapping验证器，输出仅本批新目录；不安装验证工具。

环境：固定副本Connection0.1.5-rc.1/Cordis4.0.2，Node v24.19.0，独立HOME/DSH_HOME/APPDATA/TEMP、非回环fetch拦截及离线pack。主目录Connection0.1.2-rc.1旧依赖未升级，不拿它作固定版兼容结论。

证据根：D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\.dsh-test\website-record-repair-20261006。

| 阶段 | 原始证据 | 结果 |
| --- | --- | --- |
| 变更前 | baseline.json / before / worktree-baseline.json / git-status.txt / git-diff.txt | 199项输入与已审计V2及固定副本一致；3032项Git文件强哈希，含既有未提交变更 |
| 首次红灯 | test-1791257135921491200.log及JSON | 56项中39通过/17失败，退出1；失败为四项及其相邻别名/包装断言 |
| 首次绿灯 | test-1791257200618452700.log及JSON | 56/56，退出0 |
| 自审补充红灯 | test-1791257252775429500.log及JSON | 未知包装3项失败，29通过，退出1 |
| 最终定向 | test-1791257270188427400.log及JSON | 125/125，退出0；包含全部导入及Workspace并发用例 |
| 完整验证 | verify-1791257354201685200.log及JSON | build/test/pack各退出0；771项中769通过/2既有条件跳过/0失败；110包文件 |
| 最终输入 | verified-1791257354201685200.json | 199项src/test/lib输入清单，由完整验证后逐项与主源码及固定副本比较 |

命令：包装器`baseline`，`test test/website-record-files.test.mjs test/website-record-client.test.mjs test/website-record-ui.test.mjs`，`test test/website-record-files.test.mjs`，`test test/website-record-*.test.mjs test/website-import*.test.mjs test/workspace-operation-race.test.mjs`，`verify`。

完整验证实际执行固定Node的tsdown、带network-guard的`--test test/*.test.mjs`、npm的`pack --dry-run --json --ignore-scripts --offline`。最终输入7项变化：2源文件、3测试文件、2客户端构建文件；其余192项保全。

2条既有条件跳过：approved isolated Home admits only the explicit native offline flag；isolated Host declares native services before accessing Cordis context。保留既有zod打包提示，不修改依赖或构建策略。

## 作者自审与证明边界
- 对当前批次基线差异单独审查：字段回退/不安全优先字段、包装空位/重复/冲突、输入输出角色、未知包装/正文/回显、页码失败/晚到响应。补充未知包装缺口先红后绿。
- 采用单代理作者自审，非独立复审；未合并，不以测试数量当业务交付进度。
- 下载来源、无Bearer/重定向、版本/前后复核、流式限额、排他写入、共享锁、旧配置/文件/清单保护仍由既有合同及125项定向用例约束。
- 本轮只证明所列离线候选与反例。当前安装包界面、用户授权的真实输入材料/输出附件及服务端ACL仍未验；同址引用和下载哈希不认证历史原件。
- 后置复核见本证据根post-verification.json；项目文件变更仅批准集合，Git暂存/HEAD不变。无用户原文件删除、恢复、重置或无关格式化。
