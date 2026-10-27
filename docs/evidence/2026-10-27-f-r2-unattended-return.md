# R2同配对无干预重启复验与无夹具F开发装配返回

日期2026-10-27，基底HEAD `efd70b5b0575ae33a0b50ade077ed63d4f53c653`。用户要求零新增真实模型/专业API/费用、不推送，Max独立审计后分批本地提交。本返回送审时为作者观察，独立结论另由新增审计报告接续；不改旧报告。

## 当前取得

- **R2同配对新隔离复验**：`.dsh-test/f-r2-unattended-20261027`，固定v4/App/Node/Host/Sidebar、198pin。与历史R2相同公开输入、原Workspace `71120098-c4d4-4075-bddd-49e1371eb8f7` / Session `session-afaffbc1-9b24-4447-a7fa-98f0daef6428`；不是历史R2 Profile迁移或原请求取证。只复制原公开业务存储与会话，另在新空IDB显式seed；不复制认证/userdata。
- 首次A恢复18字符、两件待重试附件，发送禁用；Node公开HTTP诊断订阅在首次Renderer请求前启用，47次HTTP请求、二进制上传开始0。正常退出0。
- **同Profile重启后未点击任何界面控件**，只取AX/png、一次无凭据本地GET（403，未补认证或重试）、最后正常退出。13:36:42.328Z订阅至13:37:26.405Z结束约44秒，36次HTTP请求，原生二进制上传开始0；初始及结束AX均为原Session、18字符SHA `f91afd470598379d1072eaac60c3eb7f886929b995f93160f38c72a2888cb7c0`、两待重试文件与禁用发送。seed此时因目标活跃而未执行，proof显示waiting，不是重启重新seed伪造恢复。
- 关闭后的IDB两个File在重启前后分别96与449990字节，SHA `53f292233c61aa19aaa98a7e2a2b6e5d0392ae43e779546d753ff7fbf85b0357` / `159d0f0fa12bf8c4434c6007e661fb191734e408681899d7288b9a73e2747393`均一致。新Host自始至终没有attachments目录；不是只凭没有文件推断没有请求。
- **无夹具开发组合**：`.dsh-test/f-development-clean-20261027`，新空Profile、195pin，未复制业务存储/Session/认证/userdata。沿既有正式开发入口启动、原生创建Flow-2-6任务及公开用户指令 `F-CLEAN-20261027-NO-CALL：仅验证任务草稿保存与重启恢复。`，原生composer `F-CLEAN-20261027-UNSENT`。两次实际启动退出0，重开两草稿/业务任务页保留；没有seed/proof/计数包。不是签名发行包或升级/降级/回退验收。

## 方法、验证与限制

仅新增一个测试用HTTP观察器及两项测试，不改产品默认组合/业务代码/依赖/既有装配器。fixture三文件由准入固定；观察器订阅公开Node `http.server.request.start`，过滤57583，只计POST `/api/session/uploadFileBinary`及总请求，不读body/header/query，不注册/劫持路由、修改请求响应、触发上传或重试。固定原生FileUpload对恢复Blob走该路径；计数是**Host收到的二进制请求开始数**，不证明尚未到Host的Worker意图、其它RPC、外网全流量或模型消费。技术接口见[Node官方说明](https://nodejs.org/download/release/latest-jod/docs/api/diagnostics_channel.html)；内置通道仍experimental，本次按具体两解释器实证限定。

本地独立HTTP阳性测试证明该通道可捕获真实POST、正文/响应不变、查询/头/正文不进入日志、dispose后不再记录。阳性测试未在Desktop复验Profile发送文件。两解释器均2/2，完整scripts受影响集均97/97、退出0。RED为新增模块尚不存在的导入失败，非产品缺陷反例；保留原日志。业务1480/解析材料54所属源码未改，本批不重复运行或宣称刷新。

操作误差均保留：首次IDB快照路径错误只读报FileNotFound，改为固定Renderer partition后复制；本地无凭据GET403已计入36事件，未绕过认证；无夹具双草稿输入的CUA调用超时后，重新观察确认两输入已生效，未重复粘贴或发送。应用实际没有报产品错误，相关边界记录不改为成功请求。

历史v4的152成员、17公开原件及本轮基底3587个已跟踪文件，在入口更新前原字节一致；历史有人工重试的R2、原FH-A01/冷恢复失败/旧审计保留。四次自有启动均退出0，57583关闭。未新增模型/专业API/费用；原生retry/Send为0，本次无本地Host文件接收。未读取/迁移认证，未改日常Profile/签名App/依赖或推送发布。

准确成员及准入SHA见[执行单](2026-10-27-f-r2-unattended-execution.json)。当前直接推进的是无干预正常重启与无夹具开发装配/双草稿恢复子集；任意孤儿自动归属、实际Host重传/模型收到附件、多实际DSH Renderer、双存储失败、强杀/跨平台、全writer发行强制接续、干净安装器/升级回退、真实UNKNOWN与完整F仍OPEN。新复验不能补签历史R2当时未记录的零请求。
