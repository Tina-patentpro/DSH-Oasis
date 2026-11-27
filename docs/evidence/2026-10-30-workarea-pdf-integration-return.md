# workarea现有API与PDF最小接续

2026-10-30，Asia/Shanghai；单代理作者自查。沿[EXEC-R2复核](2026-10-30-workarea-pdf-execution-preflight.json)与用户本轮明确指令继续，不进入后台或Dify控制台，不新建服务、不升级固定组合、不扩大隔离实验。

## 已实际推进

workarea已登录，最小重置自动化连接后可读取原工作台。通过网站切换已有Fast/Basic服务，实际观察现有后台API的目录GET及详情POST均HTTP200；没有复制网站认证到DSH。完整脱敏字段、目录与详情身份、八输入映射及未评估维度见[实际消费映射R1](2026-10-30-flow26-workarea-consumer-mapping-r1.json)。目录项211/212与详情服务39/46分开记录，创建的id应使用详情id；分类上的workflow字符串不作为绑定依据。

新增内部`src/pdf-extraction-process.js`，沿现有提取合同落实父进程管道：先复制同份有界原字节，单文件5秒、同会话总准备15秒，stdout 2MiB/stderr 16KiB在累计前限额；取消、管道/进程错误、超限均停止本job并等待close和回收。回收失败或未取得close后锁住该准备会话，不再启动下一个worker。成功结果严格校验UTF-8/Unicode、双hash、正文/页范围、覆盖和固定策略声明；禁止部分正文成功返回，日志不回显worker错误或stderr。

该组件只接受可信Host注入的单个`launch/terminate/reclaim`边界，没有默认非隔离启动器，未注册RPC、未接生产材料入口或开启PDF扩展名。worker自报的隔离字段只验证一致性，不能当作内核隔离或分发资格证明。现有Python worker及原两项容器证据按准确hash复用；本轮不启动VM、不新增容器、样本或实验矩阵。完整启动器/运行时分发闭包、声明profile资格及U1→D1/新v4和累计MD接线仍未完成。

## 定向验证

新增9项进程管道单元测试；使用合成EventEmitter/stdio与虚拟时钟，明确不是实际容器/Host资格试验。先缺组件RED，再GREEN；自查发现回收失败后可重开、晚到close可绕过挂起定时器两项，新增失败回归后修复。最终命令：

```zsh
tools/bin/node --test packages/oasis-professional-service/test/pdf-extraction-process.test.mjs packages/oasis-professional-service/test/oasis-api-contract.test.mjs packages/oasis-professional-service/test/oasis-workspace-binding.test.mjs packages/oasis-professional-service/test/v340-preparation.test.mjs
```

46/46，exit0，无跳过。只运行受影响测试；没有重跑旧完整suite、Python解析器或容器两项。日志与最终身份见[验证记录](2026-10-30-workarea-pdf-verification.json)。作者自查不称独立审计；原工作区54项修改保全，仅在三原状态入口前置本次接续，原后缀字节保留。本轮未改总计划、锁、固定资源、日常DSH或既有Profile，未提交/推送/发布。全局diff-check另有预存总计划末尾空行警告，未顺手修改。

## 双来源尚不能记为通过的具体原因

Fast39为同步Workflow、3元、单正文output；Basic46为异步Workflow、5元，返回claims_text和两DOCX候选。普通正文可进入既有预览/审核规则，未返回的来源更新、表格、术语及风险/补全维度须标未评估；不要求现有服务先变成旧候选1的七字段JSON或提供Dify appId/DSL。

但现行metadata没有前序累计稿、附图文件、权利要求要求文件/文本的独立字段；完整交底文字与仅核心方案字段也未证实语义等价。User_input明确不收原始材料/核心正文，不能拼进去或借用别的字段掩盖丢项。完整新版M06远程来源因此继续禁用；旧Fast服务的历史兼容保持独立，不冒充新版验收。提供方应在现有API合同层明确这些实际映射/可支持范围，消费方再核无损与权限，无需用户登录任何管理控制台。

网页登录也不生成DSH Workspace/账户/folder绑定。文件字段存在及网站列出PDF不证明PDF实际传输或正文参与生成；本轮没有上传、创建、费用或文件取得，亦不重派旧5271/UNKNOWN。待实际字段语义、权威归属及PDF相应资格具备后，才能准备可审的准确输入/费用请求并做两来源真实业务、专业/用户验收。G0及正式发行仍OPEN。
