# 全新隔离运行与浏览器审计

## 隔离与安装

- 新建DSH_HOME：`C:\Users\TinaD\AppData\Local\Temp\oasis-dsh-week1-audit-20260823`。
- 初始化输出明确指向该目录，见`isolated-init.txt`。
- 本地link安装退出0，见`isolated-plugin-add.txt`。
- 隔离Profile manifest包含`@deepseek-ai/dsh-base`、`@deepseek-ai/dsh-web-app`和`oasis-professional-service`，见`isolated-profile-package.json`。
- `--dump-config`退出0，504-506行出现目标bundle层。

## Host与HTTP

- Host在`127.0.0.1:18984`持续监听，PID 62708；审计探测期间无新增stderr，见`host-runtime-log.txt`。
- `/plugins/oasis-professional-service/client.js`返回HTTP 200、`text/javascript`，正文首行调用`window.__ModuleLoader__.load`。
- Browser静态请求清单三次记录同一Client URL返回200，见`output/playwright/week1-audit/requests-static.txt`。
- 证据边界：证明Bundle Host行成功组装且Client被实际提供；没有无凭据的公开API可以直接列出/调用`oasis_workbench_status`，因此真实工具调用仍未验证。mock单测只能作为组合证据。

## Skill Runtime

- 正确的DSH RPC envelope创建workspace和session均返回`result.ok=true`。
- `skill.list`返回`dsh-plugin-development`和`oasis-rd-intake`，两者`modelInvocable=true`。
- 原始请求/响应和HTTP 200证据保存在本证据目录。

## Browser

- Playwright临时会话打开`http://127.0.0.1:18984`，标题为`DeepSeek Harness`。
- 快照显示工作区、会话及按钮“打开技术研发与中国发明专利工作台”，见`output/playwright/week1-audit/snapshot.txt`。
- 浏览器真实请求了插件Client并收到200。
- 临时事件监听器观察到一次`oasis-professional-service:open`，detail为`{"source":"conversation.input.right"}`，见`event-result.json`。
- 点击后快照仍只有原按钮，没有面板、对话框或其他用户反馈，见`after-click.yml`。
- 控制台：Errors 0，Warnings 0；有一条Chrome password-field verbose信息，见`console.txt`。
- 全页截图：`output/playwright/week1-audit/page.png`。

## 保护与清理

- 真实Profile前后均为113个文件，SHA-256清单`fc /b`退出0、无差异。
- 真实Profile manifest前后均未匹配目标插件。
- Playwright会话关闭后`list`返回`(no browsers)`。
- Host的Ctrl+C未能结束PTY；经端口确认后只对PID 62708执行taskkill，最终端口18984无监听。
- `.playwright-cli`、临时DSH_HOME和临时npm cache均通过真实路径、允许根和basename校验后删除；后置检查均为File Not Found。

## Runtime裁决

| 声明 | 结果 |
|---|---|
| Bundle可在全新Profile安装 | 通过 |
| Host组合可持续启动 | 通过 |
| Host状态工具在真实Agent中可见/可调用 | 未验证；只具备真实Host启动+mock注册/执行组合证据 |
| 两个项目Skill可由真实运行时列出 | 通过 |
| Client lazy-CJS由浏览器实际请求和接受 | 通过 |
| 入口按钮真实渲染 | 通过 |
| 点击事件合同 | 通过 |
| 点击后打开工作台 | 不通过；没有消费者或UI后置状态 |
| 浏览器无新增error/warning | 通过 |
| 本次审计未改变真实Profile | 通过 |
