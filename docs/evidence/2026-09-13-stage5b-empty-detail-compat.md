# 5B 详情空占位兼容执行证据

日期：2026-09-13。目标状态：PASS，仅限批准的客户端详情空占位兼容。单代理自检，非独立审计；不代表 Desktop、真实 Profile 或完整 API 生成验收。

用户批准计划后，仅修改 packages/oasis-professional-service/src/oasis-api-contract.js：POST /api/apicategories/apidetail 成功响应进入通用检查之前，浅复制详情并删除直接属性 api_key、credentials 中严格为 null 或空字符串的值；保留 envelope，原对象不变。不修改通用检查器或 normalizeApiDetail；raw 接收的是清理后数据。其他端点及请求仍严格检查。无发行构建、服务器修改、上传、收费生成、提交或推送。

## 测试证据

cmd.exe；工作目录 D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\packages\oasis-professional-service。

- 红灯：node --test test/oasis-api-detail-legacy.test.mjs，3通过/1失败，退出1；失败原因为 $.data.api_key 的 FORBIDDEN_CREDENTIAL_FIELD。
- 绿灯：node --test test/oasis-api-detail-legacy.test.mjs test/oasis-api-contract.test.mjs test/oasis-remote-service.test.mjs，40/40通过，退出0。
- 新测试覆盖有无data包装、空值组合、无占位、冻结原对象不变、raw无占位、非空/空白/异型值、嵌套、名称变体、外层凭据、其他接口、严格直接解析器与请求侧不发出违规请求。
- git diff --check 定向源码退出0，仅Git换行提示。既有其他工作区修改未覆盖。

## 只读现网样本复验

匿名 POST https://lzhxpy.oasisintwrite.com/api/apicategories/apidetail，仅请求名“权利要求书生成-Fast”；HTTP200/code200，无Authorization头。先确认两占位为空，不输出值。响应只在内存及子进程stdin传递，没有保存原始响应。

native Node 在本地使用 createOasisApiClient 的真实 request→normalizeApiDetail 链处理该样本；fetch为内存响应，测试token只在本地，不发到远端。退出0：id39、输入8项、输出1项，raw无api_key/credentials，完整结果通过原 assertNoForbiddenCredentialFields。

此证据区分真实HTTP详情和本地客户端链，不声称已验证真实JWT配置、宿主装配、浏览器或生成。现网后台保持恢复后的原状。

## 下一批

仍需四字段共同输入到实际服务字段的语义映射、账户/项目显式绑定，以及获授权后的真实生成；本轮不开放创建入口，不编造必需字段、默认值或自动拆分材料。
