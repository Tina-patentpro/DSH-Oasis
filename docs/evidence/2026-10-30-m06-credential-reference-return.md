# 原生模型凭据引用排查返回

2026-10-30，Asia/Shanghai，Codex单代理；沿既有任务1/2和用户本轮“模型已配置、无费用验证、不重试原请求、最小改动”执行。[EXEC-R2记录](2026-10-30-m06-credential-reference-preflight.json)绑定整体1.3.1、NS1-R1/P30、协同1.2.1及当前原入口；不生成新调用许可。

## 根因已定位：两个独立Profile

用户报告模型已配置，有本轮直接证据支持。日常 `/Users/tinadong7036/Applications/DSH Desktop.app` 为Desktop2.0.18／DSH0.2.1-rc.2，端口43120；原生模型页明确显示DeepSeek“API密钥已配置”。其home `/Users/tinadong7036/.dsh` 的凭据文档存在 `DEEPSEEK_API_KEY` 引用；仅检查文档结构、引用名和模型覆盖项，没有输出、提取或传递密钥值，也没有调用其resolve。

校准实际由另一个Desktop2.0.17／DSH0.2.0-rc.2执行，端口57607，home为 `/Users/tinadong7036/Documents/开发项目/DSH-Oasis/.dsh-test/m06-live-20261030-r2/home`。其公开SDK元数据只登记DeepSeek官方提供方，声明引用 `DEEPSEEK_API_KEY`；该引用及设置页惯例 `DEEPSEEK_OFFICIAL_API_KEY` 的describe均为configured=false。其凭据文档只含本机浏览器连接与绿洲账户两条记录，没有模型引用。启动进程也未继承这两项环境引用。

因此本轮没有发现“同一Profile已有模型密钥但适配器引用错名”的证据；实际差异是日常已配置的凭据尚未授权给独立候选。不能再把这个候选的局部状态解释为用户没有配置模型，也不需要重填日常模型。

固定0.2.0-rc.2源码中，官方模型发现直接返回配置模型，不检查凭据；日常0.2.1-rc.2的发现先解析凭据，缺少时返回空模型列表。这解释了旧候选可以显示Flash但该home没有凭据，不据模型名推定跨Profile共享。SDK源码仅作定向只读比较，未升级或替换固定组合。

## 已完成的无费用处理

临时观察仅调用listConfigurableProviders、redacted settings.describe、credentials.describe、listRecords和当前模型选择投影；stream、网络模型发现、上传、create与凭据set均未调用。第一版临时挂载只替换了YAML中未折行的覆盖项，名称不一致使观察入口未加载；随后按原生YAML节点统一临时插入项/覆盖项名称，取得一次元数据证据。两次均无生成；原失败请求未重试。

观察入口已从业务包卸下并归档；隔离Profile恢复至本轮开始的原始字节，SHA256 `005876e07eef78927fd0ae15cde9fcdf1c59847b8f89569baf7c65d665345efa`。全部既有启动pin核对一致，正常恢复同一R2。业务代码、客户端、固定依赖、模型资源均未修改；日常DSH只读查看后恢复原视图，未保存任何设置。

本轮没有新的代码变更需要重复运行业务测试；上轮292项测试属于原构建证据。本轮验收采用原生实际元数据、日常模型的正面状态、Profile及原运行/材料/已有改动保全核验，见[结构化验证](2026-10-30-m06-credential-reference-verification.json)。

## 剩余单项操作

已准备[仅复用DEEPSEEK_API_KEY的具体方案](2026-10-30-m06-credential-reference-reuse-proposal.md)：源端只读、目标仅新增同一模型引用，现有账户/连接与日常配置保持，不直接共享可写存储、不扩大SDK或实验范围；授权后仍只查元数据与重启，不发模型请求。

这一步会新增隔离候选对日常已保存密钥的访问，需要明确的跨Profile范围决定，不能把本轮只读核验自行扩大为凭据复制。已通过本会话提出该单项确认；当前尚未复制，不要求用户再次输入密钥，也不要求Dify/后台登录。原run `v340-1e49d8b0-1f88-4b09-9730-29dd97b50ded` 保留failed／EXECUTION_FAILED，不追认旧错误原因或费用；项目302已有保存/恢复结论保持。真实本地文字闭环、Fast39校准、双来源/G0及发布仍未关闭。

私有证据根：`/Users/tinadong7036/Documents/开发项目/DSH-Oasis/.local/m06-credential-reference-20261030/`。其中 `native-metadata.json`、`credential-key-names.json`、`daily-reference-metadata.json`、`daily-configured-ax.txt`、`daily-configured.png`、`restoration-receipt.json` 和 `restored-run/native-candidate.json` 分别绑定实际观察与恢复；不进入分发或提交。
