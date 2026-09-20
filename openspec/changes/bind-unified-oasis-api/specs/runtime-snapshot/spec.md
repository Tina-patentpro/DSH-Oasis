# Runtime snapshot contract

- 每次 Host getRuntime 以 normalizeOasisRuntimeConfig 取得独立冻结配置。只有 credentialOrigin 与 API origin 一致时允许读取该引用。
- 凭据只在闭包内保存，不进入运行数据、JSON、日志、指纹或前端状态。请求前比较当前标准化配置与捕获配置，再解析同一引用并比较凭据值；变化拒绝该请求，错误仅含固定安全代码/信息。
- 捕获凭据期间配置发生变化同样拒绝；地址切换后不向新地址使用旧 JWT，也不向旧操作注入新 JWT。比较白名单按集合规范化；业务来源偏好与此网络快照无关。
- disabled/凭据未绑定/凭据不存在保持原 bootstrap 状态。原有非认证异常仍安全地向上层传播处理。
- 不取消已经发出的请求，不自动重新提交，不把配置停止解释为后端取消或退款。已发送请求依然由原 remote state machine 保存未知结果锚点。
- 离线测试必须覆盖切换凭据、API origin、环境、下载来源、读取凭据时的竞争与零真实网络；至少一项通过实际 Host Connection bootstrap 路径验证。
- 新运行以认证 `/api/user/detail` 的数值 id 形成 accountId，纳入 execution、providerSnapshot 及输入哈希。继续和流水查询必须同账户；旧记录缺少 accountId 仍原样解析，但不得自动改属当前账户或发起后续请求。该运行账户证据不代替尚待实现的 Workspace/目录显式设置绑定。
