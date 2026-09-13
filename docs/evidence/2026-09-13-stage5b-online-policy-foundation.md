# 线上接入第1片：策略与客户端基础

日期2026-09-13；状态STATIC_ONLY。用户已批准整套受控线上接入调整，本轮完成第1片，不声称整体已接线。单代理自检，无独立审计。

## 已实现

- normalizeOasisOrigin与createOasisApiClient新增显式environmentKind参数，默认non-production保持原拒绝规则。
- production API只接受规范化后的https://lzhxpy.oasisintwrite.com默认443；拒绝HTTP、其他端口、其他域名与IP替代；保留origin路径/查询/凭据检查。
- 文件origin使用独立校验；production必须HTTPS，上传/结果URL仍由已有客户端的明确来源集合限制，禁止凭据、query、fragment；不使用API单域名规则误伤经批准的文件来源。
- 运行配置归一化函数认识production，凭据origin必须匹配且不自动借用非生产凭据。

## 故意未开放的边界

原生设置schema和设置控制器仍只开放非生产；Host尚未透传新模式；执行/产物/写回与文档映射仍采用旧非生产规则。这些须在第2片一致接线，不能现在配置真实Profile或称线上可用。未改变现有配置、迁移数据、覆盖旧产物哈希、构建发行、提交、上传、生成或访问服务器。

## 证据

cmd.exe；工作目录 D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\packages\oasis-professional-service。

红灯：node --test --test-reporter=dot test/oasis-online-policy.test.mjs，3失败退出1，明确旧实现禁止production。

绿灯及相关回归：
```text
node --test --test-reporter=dot test/oasis-online-policy.test.mjs test/oasis-api-contract.test.mjs test/oasis-runtime-config.test.mjs test/oasis-api-detail-legacy.test.mjs test/claims-api-document.test.mjs test/oasis-remote-service.test.mjs test/workbench-v3-contract.test.mjs test/writeback-service.test.mjs
```
80项通过，退出0；网络为内存fetch替身，未发送synthetic token到网络。git diff --check定向3个源码退出0，仅换行提示。

原先“不是安全组导致”的结论指请求前插件策略拒绝；没有检查或修改安全组，不声称审计了全部网络策略。

下一片继续同一已批准计划：原生设置显式模式选择、Host传递、记录/产物/保存合同及界面环境标识协调调整，保留旧默认和凭据绑定，不再重复申请同范围授权。实际账户项目和具体上传/费用动作仍有独立门禁。
