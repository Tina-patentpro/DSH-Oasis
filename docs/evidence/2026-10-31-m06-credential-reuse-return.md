# R2单项模型凭据复用与无费用验证

日期：2026-10-31（Asia/Shanghai）；执行者：Codex，单代理。按用户本轮明确授权执行[单项复用方案](2026-10-30-m06-credential-reference-reuse-proposal.md)：仅复用日常DSH已保存的`DEEPSEEK_API_KEY`至隔离R2，不修改日常配置、不复制其他凭据，不发模型请求或重试原请求。[EXEC-R2与授权记录](2026-10-31-m06-credential-reuse-preflight.json)绑定整体1.3.1／NS1-R1／P30、协同1.2.1、既有任务1/2及111项已有文件快照。

## 本轮实际完成

- 源：`/Users/tinadong7036/.dsh/.credentials.yaml`，只通过固定DSH公开凭据服务describe/resolve指定引用；源端resolve恰好1次，不调用set/unset。先排除SDK的旧平铺格式迁移路径，源文件完整字节SHA256在操作前后及最终核验保持。
- 目标：`/Users/tinadong7036/Documents/开发项目/DSH-Oasis/.dsh-test/m06-live-20261030-r2/home`，由当前原生Host的`ctx.credentials.set`保存指定引用恰好1次。元数据由configured=false变为true、source=file。值仅在本机内存中跨这两个SDK操作传递，没有放入命令参数、聊天、日志、截图或临时文稿。
- 操作前后在内存中比较目标凭据文档：其他引用不变、既有两条账户/连接记录不变；没有复制整个源文档、其他凭据、Profile或会话。目标凭据文件权限为0600。
- 单项复用有持久化`wx`意图标记与独立完成回执；中断/不确定结果不自动重放。旧R2启动器进程已退出而启动锁残留，经PID不存在及端口空闲核对，原锁归档保全后恢复同一R2，未触碰日常进程。

## 重启与原生验证

复用完成后正常停止R2，卸下临时一次性入口，将其移出业务包并归档；恢复原始Profile字节及全部既有启动pin，再启动原始业务入口。固定Desktop2.0.17／DSH0.2.0-rc.2、Sidebar0.24.1及已审补丁、Cordis4.0.4均未改变。

重启后的R2原生模型页明确显示DeepSeek“API密钥已配置”，该状态来自SDK凭据元数据。既有业务页点击“核对模型与材料”后，通过原生凭据检查并显示`deepseek-official / deepseek-flash`确认信息；随即点击“取消”，没有点击“确认生成一次”。这证明本轮凭据引用阻塞及重启持久化已解除，不等于向提供方完成认证或真实生成。

项目302仍绑定原Workspace、固定origin及账户33。原run `v340-1e49d8b0-1f88-4b09-9730-29dd97b50ded`、requestKey `24b815ee-922c-4d91-b83f-44bc04301340`的对象保持不变，仍为failed／EXECUTION_FAILED；Workspace revision仍12，runOrder仍仅1项。3份公开材料哈希保持。原失败没有底层usage/错误，未改写原因或追认费用。

## 证据与边界

[结构化核验](2026-10-31-m06-credential-reuse-verification.json)记录本轮命令结果、文件身份及保全。私有证据根为`/Users/tinadong7036/Documents/开发项目/DSH-Oasis/.local/m06-credential-reuse-20261031/`：

| 证据 | 结果 |
| --- | --- |
| `reuse-intent.json`、`reuse-result.json` | 单项引用已完成；resolve1、set1、源字节和目标其他记录均保持 |
| `restart-run/native-candidate.json`、`native-start.json` | 原始入口恢复，无临时入口，原始源码/依赖/Profile pin一致 |
| `restart-model-configured-ax.txt`、`restart-model-configured.png` | 原生重启后API密钥已配置 |
| `preconfirmation-passed-ax.txt` | 调用前检查通过，仅到确认；已取消 |
| `before-closeout-verification.json` | 111项已有文件、原运行、材料及302关联保持 |

一次性脚本语法检查退出码0，实际SDK操作与上述原生验证通过；产品业务源码、客户端和固定依赖本轮均无变更，不重复运行原292项业务测试或重建。本轮模型请求、上传、专业API创建均0；没有登录Dify/后台，没有提交、推送或发布，没有将凭据或运行数据加入Git。

用户授权的凭据复用和无费用元数据/重启验证已完成。真实本地文字闭环、Fast39受限校准、审核保存/对话及新版双来源、专业/用户接受和G0仍未完成；本轮授权不产生新的模型调用额度，原单次请求不重试。
