# 网站同名输出字段漏项修复证据 — 2026-10-06

## Status / Proof boundary

STATIC_ONLY：用户明确批准本批计划后的本地/离线修复候选。没有安装、宿主启动、生产读取/下载、上传、真实生成/费用、Profile/日常/远端修改或提交推送。作者单代理自审，不是独立审查；当前候选Desktop界面及真实材料权限/下载仍未验证，不用旧安装包或合成下载替代。

## Target and change

- P2复审反例：outputs.data / outputs.outputs 是明确tool_file对象时，被当成包装层跳过，files=[]/unsupported=[]，列表误报complete空材料。
- 本批区分已知包装位置与终端输出字段；data/outputs命名文件或一层数组使用既有outputFile。终端未知嵌套对象和非法type/transfer/URL显式不支持/partial，不递归扫描正文。
- 保持包装兄弟file_output、重复/冲突处理、输入remote_url限制、URL/文件名/大小、无Bearer/无重定向、归属/revision和无覆盖合同。API、records协议2、UI和包版本不变。
- 自审发现不能仅凭标量type/transfer_method字段把已知容器当作文件；补失败回归，按已知容器位置/附件集合保持读取。不增加包装深度。

## Baseline / toolchain

- 主目录：D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\packages\oasis-professional-service。
- 固定验证副本：D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\.dsh-test\source-promotion-20260915\source\packages\oasis-professional-service。
- 实际固定Connection 0.1.5-rc.1、Cordis 4.0.2；固定Node 24.19.0。主目录旧依赖未升级、不运行全局DSH、不安装依赖。
- 起点199项主目录/固定副本输入相同，并等于复审的verified-1791257354201685200.json；3034项Git列举文件强哈希、旧源/测试/lib字节和Git状态保存。已有dirty V2及上一批修复均保留，不与本批混淆。
- 本批输入仅src/website-record-files.js、test/website-record-files.test.mjs、test/website-record-client.test.mjs变动；lib/client.js及map字节未变。

## Execution / fresh results

shell均显式为powershell.exe、login=false（无Profile）。复用受控离线构建/测试入口；HOME/USERPROFILE/DSH_HOME/APPDATA/LOCALAPPDATA/TEMP/TMP指向本批新目录，HTTP(S)代理阻断外连，Node测试加载既有非loopback fetch guard。所有下载为注入fetchImpl返回的合成字节，不向网站发请求。

入口：D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\.dsh-test\website-output-field-repair-work.py（调用实际既有fast-mapping-work.py，单独新证据目录，不重写上一批证据）。Python执行器：C:\Users\TinaD\AppData\Local\Python\pythoncore-3.14-64\python.exe。

- RED：test-1791258769581535900.log/json，解析+客户端98项中48通过/50失败，退出1；原因是漏项/错误complete/缺少冲突提示，不是环境导入失败。
- GREEN：test-1791258794433651600.log/json，98/98退出0。
- 作者自审追加标量标记/容器碰撞回归：test-1791258859075519500（77通过/4失败）、test-1791258950108737500（81通过/2失败）、test-1791259038560288500（83通过/1失败），均退出1；范围内修正后全部绿灯。另3条不完整显式标记保护用例已有校验通过，不伪称先红。
- 最终定向：test-1791259039753584900.log/json；node --import guard --test test/website-record-*.test.mjs test/website-import*.test.mjs test/workspace-operation-race.test.mjs，185/185，退出0。
- 最终完整：verify-1791259041274933800.log/json；固定node执行tsdown --config tsdown.config.mjs（退出0）、node --import guard --test test/*.test.mjs（831项，829通过/2跳过/0失败，退出0）、npm pack --dry-run --json --ignore-scripts --offline（110项，退出0）。
- 两个既有条件跳过：approved isolated Home admits only the explicit native offline flag；isolated Host declares native services before accessing Cordis context。既有tsdown deps.onlyBundle/zod bundling提示不属于本批失败。
- 最后验证清单verified-1791259041274933800.json：199项主目录/固定副本/验证输入SHA-256一致。中间verify之后有新增边界测试及修正，以上最后一轮才是验收候选；不引用中间绿灯充当最终证据。

原始证据目录：D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\.dsh-test\website-output-field-repair-20261006。
最终文档后保全/diff/HEAD/暂存/文件哈希检查记录：该目录post-verification.json；没有用Git恢复、清理、暂存或提交来制造一致。
