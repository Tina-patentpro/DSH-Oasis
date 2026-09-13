# 5A：创建请求认证失败后禁止重发

## 结论

**PASS**，仅针对获批5A离线修复。真实API和Desktop未运行，专业API按钮仍未开放；不代表5B–5E或双来源业务已完成。单代理源码自审，不是独立审计。

## 根因与先红后绿

旧oasis-remote-service.js在调用createWorkflow之前已持久化submittedAt，但AUTH_REQUIRED分支随后清空为null。continue以该字段决定是否允许创建；重复continue及重建service后可再次create。

新增用例用现有替身客户端抛AUTH_REQUIRED，经首次continue、重复continue、stop、JSON存储往返和新repository/service继续，修复前create计数为3、预期1。测试命令退出1，另两项对照通过；不是网络或测试装配错误。

修复只删除该分支的submittedAt:null赋值并补原因注释，保留auth-required状态和安全错误。原key/发送时间不变，后续只能观察原key；不把认证错误当成无副作用证明。未引入新状态、数据迁移、重试或永久诊断组件。

## 修改范围

- D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\packages\oasis-professional-service\src\oasis-remote-service.js：一处状态更新。
- D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\packages\oasis-professional-service\test\oasis-remote-service.test.mjs：现有harness支持从序列化记录重新建立，增加三个离线用例。

用例覆盖：
1. 创建认证失败后重复继续/stop/存储重载，create仅1次，原key与submittedAt保留；两次后续查询均原key，上传替身仅1次。
2. 进度查询认证失效、凭据暂不可用与恢复、存储重载，不新增create。
3. 发送前凭据缺失，create为0、记录不变；配置后允许首次create，完成后再次继续不重复。

新增用例对global fetch设置拒绝替身；所有远程操作由内存客户端提供。正常路径、网络未知、并发调用、跨origin拒绝等沿用已有定向回归。未修改schema、真实Profile、旧运行或本地生成参数，也未重算历史哈希。

## 本轮验证

执行器cmd.exe，Node v22.19.0；工作目录D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\packages\oasis-professional-service。

```bat
node --test --test-name-pattern=5A test/oasis-remote-service.test.mjs
```
修复前：3项，2通过、1失败；失败为3 !== 1，退出1。

```bat
node --test test/oasis-remote-service.test.mjs test/oasis-api-contract.test.mjs test/workbench-remote.test.mjs
```
修复后：45/45，退出0，包含上述新增3项。

```bat
node --test --test-reporter=dot test/workbench-service.test.mjs test/unified-generation-service.test.mjs test/workbench-contract.test.mjs
```
既有服务/统一生成/合同回归：32项，退出0。未新增或宣称跨账户身份绑定能力；该问题仍在5B/5C范围。

git diff定向核对及git diff --check退出0；仅既有换行转换警告。不运行整包verify、不构建Client或安装依赖，不启动Desktop、不真实上传/调用API、不读取JWT，未提交、推送或发布。

## 保留边界

此修复不补造旧记录丢失的发送时间；旧状态与历史证据不迁移。也不能据此证明此前发生过真实重复扣费，或解释阶段4模型调用失败。账户身份冻结、四字段映射、统一API结果接线尚未实施。

下一步5B需用户确认非生产origin及只读账户/服务/项目查询范围，JWT只在隔离原生设置填写；不使用阶段4模型费用授权，不调用create/upload或流水接口。
