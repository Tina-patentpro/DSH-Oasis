# D2 人工界面验收 — 环境已交接，待用户操作

状态：BLOCKED_WAITING_FOR_USER

## 已完成
- 仅给现有合成后端增加 textOnly 模式（默认 false），文字模式不要求材料、不返回文件 URL，并拒绝上传；新增三个直接业务用例。插件业务源码和候选包未改。
- 先红后绿：node --test --test-name-pattern="^(D2 |fixture |actual adapter |adapter rejects |adapter observes )" packages/oasis-professional-service/test/oasis-text-fixture.test.mjs tests/scripts/oasis-api-phase4-contract.test.mjs，exit=0，17 项通过；没有运行旧浏览器/原生诊断集合。原始输出 text-red.txt、text-fixture-tests.txt。
- 初次复用旧复制函数在 240 秒期限结束，未生成 runtime 目录、未初始化 Profile 或启动 Host；保留 prepare-output.txt，不重试整套复制。随后仅只读复用既有官方运行时，Profile 和浏览器数据仍全新。
- 官方 CLI version、实际 pack、空 Profile 初始化、offline/ignore-scripts 安装均 exit=0；包 45 个文件逐一与当前候选一致。Profile 仅 base、web-app、Oasis 三个 Bundle，无探针/Better Sidebar。保留 install 的 peer dependency 警告，Client 实际渲染尚未证明。
- 安装前后真实 Profile 与只读 SDK 的强快照相同。433 个链接只指向本次根或声明的只读 SDK，不指向旧 Profile 或真实 Profile。见 prepared.json。
- Host PID 4084，启动器 PID 15932，netstat 确认仅监听 http://127.0.0.1:13537。公开 workspace/session 接口建立两个全新项目/会话，严格检查 result.ok 与 rpcId。
- 合成后端 http://127.0.0.1:13536；交接前上传/创建次数均为 0，无接口契约违规。候选 Client SHA256：390C21FAEF36350E25C5F5DB6E36456023D33E38D084F4E3E7062EFEDB66FB47。

## 本次目录与控制
- 独立运行根：C:\Users\TinaD\AppData\Local\Temp\oasis-dsh-business-d2-20260903-01
- 只读 SDK：C:\Users\TinaD\AppData\Local\Temp\oasis-dsh-p4-tkV7sm\standalone\runtime
- 人工双击启动：C:\Users\TinaD\AppData\Local\Temp\oasis-dsh-business-d2-20260903-01\open-browser.cmd
- 启动文件只负责新浏览器数据目录、常规关闭同步/扩展和代理限制、记录自有 PID/退出；不做浏览器自动化或诊断，不连接已有浏览器。它由用户在交互会话执行，本轮助手未启动浏览器。
- 浏览器代理拒绝普通外网请求但不是 OS 级零外联保证；不得登录账号或输入真实凭据。
- Host 最迟 2026/9/3 16:33:58（北京时间）自动关闭；启动器退出时关闭本次合成后端。为手动保存配置后的 Host 重启，可由当前任务保留合成后端并在同端口重新启动。

## 用户第一步（此时不要提交业务）
1. 双击启动文件，选择“D2 文字验收 A”，打开绿洲工作台的“非生产服务连接配置”。
2. 保存 API 地址 http://127.0.0.1:13536，下载来源留空。
3. 仅在界面更新公开合成占位凭据，禁止真实 JWT。
4. 回复“配置已保存”，由助手关闭本次 Host、确认端口释放后以相同 Profile/端口重新启动，用户刷新页面后再提交一次文字任务。看不到配置区或报错即停，反馈截图。

## 未完成及收尾
- Client 界面显示、配置实际保存/生效、文字提交、审核写回、恢复和安全场景均待人工操作，不能由上述测试或 Host 启动替代。
- 本轮前基线之外仅改合成后端、新增一个业务测试及 D2 会话记录；HEAD、暂存区、无关文件和候选包不变。见 preservation-before-handoff.json。
- 最终关闭浏览器/Host、复核真实 Profile/只读 SDK、核对结果文件与计数需在用户完成或终止后执行，目前未宣称收尾完成。
- 未调用真实服务、未提交 Git、未修改诊断器或全局配置，未恢复 N3/阶段 B。
