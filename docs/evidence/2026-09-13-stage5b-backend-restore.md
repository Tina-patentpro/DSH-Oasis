# 5B：恢复原后台并沿用既有 API

日期：2026-09-13。恢复目标状态：PASS_WITH_CONCERNS。仅覆盖本次单文件恢复、重启及定向验证，不代表插件 API 生成已完成。

## 授权与实际范围

用户明确要求恢复远端修改、读取两份 API 文档、使用后台原有接口；对单文件恢复及仅重启 lzpy 的计划回复“同意按计划进行”。未进行整盘回滚、恢复演练、真实生成、上传、扣费、提交或推送。

- 主机：118.190.217.223；cn-qingdao；i-m5eaknjckahl5587xh3l。
- 唯一恢复文件：/www/wwwroot/lzpy/app/services/apiconfig_services.py。
- 原始备份：/root/oasis-change-backups/20260913-stage5b-fhy7l/apiconfig_services.py.before。
- 恢复前版本另存：/root/oasis-change-backups/20260913-stage5b-fhy7l/apiconfig_services.py.patched-before-restore；独占创建，不覆盖原备份。
- 原文件恢复 SHA-256：2a3ce49be3c67e5eed94280abb352b193b1f93dbd298a52298d184cad9931d5b。
- 恢复前版本 SHA-256：f049fd81660315cc743b3f8bdb5d68e6b26eb91ea38d05a98a8dcbb519bc1115。
- 保留权限 0755、UID1000、GID1000；临时文件独占创建、校验后原子替换。未改变磁盘快照及三天保留设置。

## 新鲜证据

1. 恢复前核验 t-qd06wy5aaacnw1s：Success / ExitCode=0，目标及备份哈希与批准版本一致；路径无符号链接歧义。
2. 单文件恢复 t-qd06wy5coujzpq8：Success / ExitCode=0；123 个清单内 Python 源码全部与最初修改前哈希一致。
3. 仅通过 ServiceManager.new_mgr('lzpy') 停止并启动该项目，t-qd06wy5ehvitxc0：Success / ExitCode=0；PID21933 → PID22064，8000端口可达。未重启宝塔、Nginx 或整台服务器；不宣称独立证明业务任务全部清空或测得全站中断时间。
4. 原 POST https://lzhxpy.oasisintwrite.com/api/apicategories/apidetail，仅提交已核实服务名“权利要求书生成-Fast”：HTTP200/code200；id39，10个业务字段存在，8个输入、1个输出。未打印或持久化凭据值。
5. api_key 与 credentials 属性恢复为存在且为空。此为原行为恢复证据，不是满足零凭据属性规范或插件安全检查通过。
6. https://app.oasisintwrite.com/workspace 与 https://lzhxa.oasisintwrite.com/：HTTP200/text/html。仅入口可访问，不代替登录后浏览器业务验收。
7. 重启后保全 t-qd06wy5h3inasxs：Success / ExitCode=0，123 个基线 Python 文件变化数0。此证明不覆盖全盘、缓存或运行日志。

## 原网站参考与本地测试

权威文档位于 D:\OneDrive\4、董娣相关\3、绿洲慧写3.0\绿洲前端：
- API接口文档-用户端.md：SHA-256 429357f3e60e39aeaae1c879c475d629633e88f5a1f71975c618c6899768feb1。
- API接口需求落地映射-独立文件.md：SHA-256 1aa86c3fafb34169ba46ebaca74e685ff750bb63a23be420f3dccd27edf63714。

源码 ai.service.ts 与 generation-actions.ts 确认：按详情 input_schema 的 en_name 装配 inputs；向原 /apicategories/create 提交 id、inputs、folder_id、api_process、key；无文件省略，不直接对接 Dify。

在原前端目录使用 cmd.exe 执行：

```text
node node_modules/jest/bin/jest.js --runInBand --no-cache --watch=false --runTestsByPath src/api/services/ai.service.createWithApi.test.ts src/api/services/ai.service.createWithApi.text-fallback.test.ts src/modules/workspace/hooks/content-sections/generation-request.test.ts src/utils/dify-file-object.test.ts
```

结果：4套、31项通过，退出0。API client 为 mock，不进行实际生成或上传。覆盖原请求字段、无自动重试、文件处理及文本结果处理；不是插件与远端的完整业务证明。原前端工作区测试前干净，未改源码。

## 后续边界

- 不再为插件修改后端；使用既有后台接口，Dify 内部配置不是接入前提。
- 原响应空凭据占位与文档存在差异；本轮未改插件检查器。下一步仅设计精确空占位兼容，非空及其他嵌套凭据仍拒绝，不能全面关闭检查。
- 四字段共同输入与实际八字段服务仍需可追溯、无损的映射，不默改界面或编造默认值。未完成实际项目/账户绑定，不开放创建入口。
- 后续真实生成、资料外传与费用须另行确认，不复用已消费许可。
