# D1 最小业务配置入口 — 执行记录

状态：BLOCKED_WAITING_FOR_USER

## 用户能力增量（当前仅代码/本地测试）

- 现有绿洲面板新增可折叠的非生产连接配置区，不新增 Slot。
- API 地址、下载来源分别保存；JWT 单独更新，空值不覆盖，失败不显示成功，密码输入在提交、关闭或断连时清空。
- 设置变更提示手工重启隔离 Host 并刷新页面；普通重连不冒充重启生效。旧目录/价格和外传确认失效，阻止旧确认继续提交；保留本地草稿和停止等待入口。
- 配置服务不可用时保留本地工作流，禁止远程提交。项目选择明确为当前返回页。

## 当前阻塞与最小后续修改

现有测试 D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\packages\oasis-professional-service\test\client-panel-contract.test.mjs 第 104 行将可选注入精确写死为仅 betterSidebar。此次批准的 settingsScope/remote 接线导致该旧断言失败。它不在 D1 文件白名单中，本轮未修改，也未绕过/跳过测试。

建议仅将期望改为 [['settingsScope', 'remote'], ['betterSidebar']]，保留 Better Sidebar 注册/卸载断言及精确列表检查。批准后做这一处调整并复验，不增加诊断工具。

## 验证

- 首轮新用例红灯 exit=1；实现后首轮 10 项 exit=0。配置变更的两个新增回归先失败，修复后通过。
- 计划内六文件定向测试：exit=1，66 通过、1 失败；唯一失败为上述旧注入断言。完整输出 focused-tests.txt。
- pnpm --config.verify-deps-before-run=false run verify（命令行另设置本轮 cache）：构建完成；包测试 exit=1，283 通过、1 失败，同一断言。npm pack --dry-run 未执行，不能宣称完整 verify 或打包通过。实际输出在当前任务 exec_command 6f158a；工具截断了中段日志，result.json 仅记录可见结果，不伪造完整日志。
- package-verify.txt 是第一次命令启动语法错误输出；该次未执行构建/测试。随后标准 verify 只实际执行一次。
- git diff --check：exit=2，仅构建文件原有的 4 处尾随空白（2082/2090/2125/2133），未做无关清理。

## 保全与证据边界

- 仅改变计划允许的 6 个既有文件，新增计划允许的 4 个业务/测试文件及本目录记录。所有其他已纳入本轮基线的文件均未变化或丢失；HEAD 和暂存区不变。见 preservation.json、baseline.json、target-before.json。
- 权威 API 文档 SHA256 保持 429357F3E60E39AEAAE1C879C475D629633E88F5A1F71975C618C6899768FEB1。
- 新 lib/client.js SHA256：390C21FAEF36350E25C5F5DB6E36456023D33E38D084F4E3E7062EFEDB66FB47。
- 未启动 DSH 应用或浏览器，未调用真实业务 API，未提交 Git，未恢复旧诊断实验。当前包尚未经过 D2 人工界面验收，不能声称用户已完成真实非生产业务。
- D2 隔离人工界面验收和 D3 真实文字任务继续分别确认。
