# 受控线上接入第2片：设置、Host与记录接线

日期2026-09-13；状态STATIC_ONLY。沿用用户已批准线上接入计划，默认单代理自检。未访问服务器、安全组或真实API，未上传、生成、安装、构建发行、提交或推送。

## 范围与实现

- DSH原生设置schema允许non-production/production，默认不变；原生设置页新增服务环境选择。控制器保存/读取API、凭据origin、下载来源时按该环境校验。
- 切换环境顺序：apiBaseUrl清空 → credentialOrigin清空 → downloadOrigins清空 → 写环境。逐步持久化而非假称原子事务；首步成功后远程API禁用，后续失败不会借用旧绑定；绑定Host代次改变时停止后续写，不转写新Host。密钥本身不读取、不复制、不删除，需重绑。
- Host创建客户端显式传入environmentKind；bootstrap保留线上标识，界面不再把线上结果标为非生产。
- 新production执行及provider快照显式记录environmentKind，加入输入哈希链；旧记录可省该字段，省略按非生产解释，不自动填字段或重算历史哈希。执行继续时校验模式与origin，产物校验二者一致。
- 运行/上传URL、结果URL、保存元数据按记录环境校验；未标记production的线上origin仍拒绝。writeback保留线上标识，原无覆盖和审核规则不改。
- 文档映射构造器接受显式环境参数，默认非生产；未将其接入统一四字段执行流程。

## 验证证据

执行器cmd.exe，目录 D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\packages\oasis-professional-service。

红灯：新增环境切换及production记录测试，原代码分别缺saveEnvironmentKind及拒绝production记录，2失败、24通过，退出1。

最终回归命令：
```text
node --test --test-reporter=dot test/oasis-connection-settings.test.mjs test/oasis-connection-settings-ui.test.mjs test/oasis-online-policy.test.mjs test/oasis-runtime-config.test.mjs test/oasis-api-contract.test.mjs test/oasis-api-detail-legacy.test.mjs test/claims-api-document.test.mjs test/oasis-remote-service.test.mjs test/workbench-v3-contract.test.mjs test/writeback-service.test.mjs test/workbench-remote.test.mjs test/host-tool.test.mjs test/panel-local-loop-ui.test.mjs
```
127项通过、退出0。新增完整production替身执行测试经过真实仓库解析与输入哈希校验，验证执行→产物环境保留以及中途模式变化零create；保存prepare/consume测试验证production元数据，未实际写出线上业务产物。其他既有用例覆盖旧记录、URL、请求重发、原生设置及UI合同。

git diff --check退出0，仅Git换行提示。保留此前未提交变更及lib构建文件，本批未重建lib，以免把当前未发布工作树混称新安装包。

## 剩余门禁

不是线上业务已可验收：尚需账户/Workspace/folder显式绑定、统一四字段文档上传映射接入已有执行状态机、快照与上传回执绑定、候选构建及Desktop验证。实际服务接受TXT/省略字段仍待证明。统一生成入口仍未开放；旧professional面板接线不代替统一页面交付。真实配置、上传和费用按具体目标/材料确认，不自动消费历史许可。
