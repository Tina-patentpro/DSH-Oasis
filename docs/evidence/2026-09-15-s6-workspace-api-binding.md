# S6 第二批：Workspace API 绑定 Host 基础

状态：**STATIC_ONLY**。本批仅实现并验证离线 Host 接线；不是完整 S6、安装包 UI 或真实 API 生成验收。

## 已实施

- 复用原 DSH 设置 namespace `oasis-professional-service`，新增有界、严格校验、每 Workspace 唯一的 `workspaceApiBindings`。不在业务 Domain 再存一份配置，不存 JWT、材料或原始 API 响应。
- 新增两个精确 POST 路由 `professional/binding/get`、`professional/binding/confirm`，保留原 25 个路由和清理语义。
- 读取只返回所选 Workspace 的注册路径、设置 revision 和绑定，不联网、不解析凭据。已有绑定及重载后的绑定均标为 `unverified`，不自动启用 API 生成。
- 确认要求显式账户、Workspace 路径、origin/环境、folder id、服务 id/endpoint/process、既有详情 schemaHash 和设置 revision。Host 在冻结运行上下文中核对认证用户、服务目录/详情及目录详情；不按同名项目或 JWT 内容猜测身份。
- 以 DSH 原生 `settings.update(namespace, patch, expectedRevision)` 提交，仅修改绑定列表。过期/并发 revision 不覆盖、不自动重试；A/B 绑定相互保留；账户、路径、目录、服务或 schema 不一致拒绝保存。
- 最后凭据检查之后再次核对 Workspace，防止检查期间更换注册路径。原生设置冲突转为安全 RPC 错误；其他基础设施故障不伪装成功。

## 当前接口依据

读取固定隔离构建安装包的 `@deepseek-ai/dsh-settings/lib/types/index.d.ts`：descriptor 包含 revision，Provider 的 update 支持 expectedRevision；owner scope 的 update 不提供该参数，因此使用注入的 Provider 而不是自行实现跨进程锁。

读取固定 `@deepseek-ai/dsh-workspace/lib/index.js`：registry.get 返回 entities 中的权威对象。绑定检查仍不替代后续材料读取的 realpath/归属验证。

## 验证与证据

执行器：`cmd.exe`。所有 Node/npm 验证均经现有 `D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\.dsh-test\run-promotion-check.py`，使用私有 Node、隔离 HOME/APPDATA/DSH_HOME 和既有隔离构建依赖；未安装新依赖。

原始记录目录：D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\.dsh-test\source-promotion-20260915

| 检查 | 记录 | 结果 |
|---|---|---|
| 绑定功能红灯（修正测试 fixture 后） | check-1789449390932276300.log/json | 退出1：缺少绑定方法及默认设置 |
| 新路由红灯 | check-1789449528341516500.log/json | 退出1：原25路由、不识别新端点 |
| 原生CAS安全错误红灯 | check-1789449590155731400.log/json | 退出1：原生异常未转换 |
| 晚到Workspace更换红灯 | check-1789449683263384300.log/json | 退出1：缺少应有拒绝 |
| 最终定向回归（11个测试文件） | check-1789449695207834700.log/json | **128/128，退出0** |
| 最终 npm run verify | check-1789449696111790700.log/json | **464通过、0失败、2旧路径条件跳过，退出0**；构建成功，pack dry-run 94项 |

完整 verify 曾因真实 Cordis 集成测试仍断言25个路由失败（check-1789449621392610600）；已按新增2个端点更新精确存在性与释放数量断言，未弱化断言或跳过测试。

2026-09-15T05:22:41Z 后置检查退出0：主项目162项源码/测试/构建配置输入与已测试副本一致；lib 与本轮构建一致（本批仅 Host 变更，lib 相对 S6 第一批无新增字节变化）。原安装 candidate-pin、profile-installation-pin 哈希保持，原启动器 `--check` 退出0，未启动 Host。

后置清单：D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\.dsh-test\s6-binding-20260915-r2\verification.json

## 保留的边界与下一项

- 单代理实现/自查，无独立审阅结论。
- 原生设置选择 UI、映射指纹、四字段文档/上传回执与统一执行状态机仍待接入；当前详情 schemaHash 沿用既有规范化详情合同，不等于服务完整业务语义、TXT 接受或字段省略规则已验证。
- 所有新绑定写入验证均使用内存设置替身；真实安装 Profile 未写入。新源码尚未装入已验收开发副本，日常 DSH 未改；没有真实账号请求、材料上传、模型/API生成或费用操作。
- 旧业务结果、审核、路径及旧运行哈希没有迁移或重算；旧无账户运行不自动归属。
- 未 stage、commit、push 或发布。下一项是已批准范围内的离线映射/执行接线；真实调用须另取得具体服务、材料和调用费用授权。
