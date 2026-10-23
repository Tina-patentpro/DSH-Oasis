# 阶段5共同页面及编辑、审核、保存闭环全面审计

日期：2026-10-22，Asia/Shanghai。根目录：`/Users/tinadong7036/Documents/开发项目/dsh-lab`。分支`mac/continuity-v2`，HEAD `84c0cc5bd103a1860e2490494f3f50a1be8404d1`。

**结论：确认5项P2，均未修复；本切片不能按“无遗留问题”收口。** 常规编辑、明确审核、文件不覆盖保存及重开路径仍通过，未发现本次已审范围的P0/P1。阶段5整体仍未完成。此结论更新上轮闭环完成的适用边界，保留上轮报告及全部失败材料。

本轮为单代理作者全面复审，非第三方独立审计。执行范围是源码、实际RPC/store/仓库、React DOM及临时磁盘合成验证；未启动Desktop/实际DSH，未新增真实模型/API、认证、上传、费用或对话发送，未安装、修改依赖/Profile/应用/准入、提交、推送或发布。所有来源标签均为合成。

## 已确认问题

### P2-E：专业API保存名与累计文稿身份合同不一致，破坏相邻交接

位置：业务包`src/v340-result-service.js:62`、`src/v340-document.js:93`及`:183`。

保存只将实际文件名加`_OIW.md`，正文快照的`filename`和原`fileName`仍无该标记。下一节点按实际文件名读取时，完整hash虽一致，`inspectV340Document`仍返回`warning/identity`。这是插件正常保存制造的误报，不能当作用户手改或未知外部文稿。

已通过真实临时项目执行“审核→双文件保存→Flow-1-2明确路径准备”：小稿稳定复现`issues=[identity]`。长稿对照中，两来源上游均为817286字节、未改内容；本地标签正常生成283764字节下游累计稿，API标签因误报又把整份上游加入累计正文，随后组装抛`V340_INVALID_DOCUMENT`。不是两来源模型质量差异，也不是实际API调用。

证据：`confirmed-five-findings.log`的P2-E；`source-handoff.log`为2项中1通过/1失败，失败为同一P2-E的长稿后果，不另算问题。

修复方向：统一实际保存名、累计身份与下游读取的命名合同，精确处理规定的来源标记；保留原固定审核hash和已保存证据，不在审核后静默改写正文，也不放宽任意文件改名的身份校验。补两来源“保存后再作为下一节点输入”的正式回归。

### P2-C：旧整稿草稿被静默解释为新版核心正文

位置：`src/v340-runtime-contract.js:44`、`src/client/V340GenerationPage.js:24`、`src/v340-result-service.js:27`与`:33`。

旧`resultDraft.body`没有格式标识，原正式回归`test/v340-runtime.test.mjs:403`及`:423`明确支持保存完整累计Markdown及整稿追加。新页面和编辑服务直接将同一字段当作`core_result_markdown`，没有格式分流、明确转换或兼容恢复提示。

实际复现：原稿7340字节，旧整稿草稿7395字节，提交新版本后变成33271字节；新核心正文包含完整旧文档信息和`oasis-v340`读取区。原result逐字保持，因此不是原件丢失；但旧草稿的整稿含义被改变，累计结构重复嵌套，长稿更易触及容量上限。新版本处于待审核，并不会自动得到批准。

证据：`confirmed-five-findings.log`的P2-C。现有正式测试只验证旧草稿能保存和重开，未验证它进入新版编辑器后的含义。

修复方向：区分旧整稿与新核心正文草稿，保留原始内容；遇到无法无损转换的旧草稿提供明确恢复/转换流程，不猜测、不自动抽取或覆盖。

### P2-B：草稿/编辑器允许的长度与新版本组装不一致

位置：`src/v340-document.js:6`、`:39`、`:149`与`:163`；`src/client/V340GenerationPage.js:71`。

`result/draft`、草稿schema及编辑器允许1MiB字节范围，但`reviseV340Document`最终沿用模型核心正文的300000字符上限。310000个ASCII字符能实际持久化为编辑草稿，却不能保存为新版本，错误定位`current_result.core_result_markdown`。失败时原版本和草稿均保留。

为排除完整文稿超限这一替代解释，仅在`.local`副本中替换snapshot核心正文上限，其他组装逻辑不变；所得完整候选939528字节，通过当前1MiB完整文稿schema，原记录未改。该私有反事实只定位根因，不是产品修复、真实结果或可装配候选。

证据：`confirmed-five-findings.log`的P2-B；`core-cap-counterfactual.json`与`core-cap-only-counterfactual.mjs`。正式回归的116294字符草稿未跨过300000字符边界，不能覆盖此缺口。

修复方向：统一人工核心编辑、snapshot、草稿和页面的容量合同；分别保留模型输出/普通材料的既有限制。完整累计稿、Workspace聚合限制继续在发布前拒绝，不能截断或删除旧版本。

### P2-A：空项目不能从功能中心直接创建第一份新版任务

位置：`src/client/workbench-store.js:878`、`:811`与`:447`；`src/client/OasisWorkbenchSurface.js:258`。

空Workspace的功能中心显示可点击新版卡片，但`createV340Task`取不到已有pageId，仍调用要求页面已存在的`runPageOperation`，在本地抛`unknown page`。实际task/create RPC为0次、Host任务仍0份。Surface回调吞掉异常，普通用户看不到失败原因。先建一份旧式空白任务可绕过，但不应成为新版入口隐藏前提。

实际RPC/store探针和真实React DOM点击均复现；已有任务时14节点创建、两来源草稿切换正常，问题限定于空项目入口。

证据：`confirmed-five-findings.log`的P2-A、`browser-results.json`及本轮截图。

修复方向：使用不依赖已有页面的Workspace级创建操作，或先完成明确的入口页面创建；保留创建失败的可见反馈，避免吞掉异常。新增空项目第一份任务正式回归。

### P2-D：新版目录瞬时失败被静默当作成功，无法重试

位置：`src/client/workbench-store.js:679`、`:689`与`:694`。

V340目录读取异常被`.catch(()=>null)`吃掉，旧目录成功后全局状态仍为`ready`且无错误；此后`loadWorkflowCatalog`命中ready早退，不再读取新版目录。功能中心14节点消失，已有新版页的动态输入字段也消失，无法从该客户端正常恢复目录。

探针只令第一次新版目录读取失败，第二次本可成功；连续调用加载后实际读取次数仍1，`catalogStatus=ready`、`catalogError=null`、`v340Catalog=null`，研究请求字段未呈现。保留旧目录兼容是合理需求，但不能隐藏已存在新版任务所需目录的故障。

证据：`confirmed-five-findings.log`的P2-D。

修复方向：旧/新版目录独立记录可用性和失败状态，提供明确重试；旧功能可继续使用，新版受影响部分显示原因，不能把输入字段空缺显示成已就绪。

## 验证矩阵与通过部分

原始证据均在`.local/stage5-pages-audit-20261022/`，文件路径相对仓库根；执行shell为zsh，使用仓库固定Node24.21.0、tsdown0.22.14及既有依赖，未安装新依赖。

| 检查 | 新鲜结果 | 证据 |
|---|---|---|
| 主包完整正式回归 | 960/960，0失败/0跳过，退出0，显式串行 | full.log |
| Mac Markdown/Sidebar/预览/启动合同 | 26/26，0失败/0跳过，退出0 | mac.log |
| client/包/装配合同 | 9/9，0失败/0跳过，退出0 | contracts.log |
| 额外兼容与边界探针 | 9/9，退出0 | controls.log、controls.test.mjs |
| 确认缺陷探针 | 5项全部失败，退出1；保持失败状态，无产品修复 | confirmed-five-findings.log |
| 保存后相邻节点长稿对照 | 本地通过、API失败，同一P2-E | source-handoff.log |
| React DOM/StrictMode→真实RPC/store→临时磁盘 | 两来源常规编辑审核保存及重开均通过；空项目入口缺陷复现 | browser-results.json |
| 当前源码旁置构建 | 退出0，client与上轮候选SHA256一致 | build.log、build/client.js |
| 完整旁置候选包 | 119成员，无测试、依赖及本地运行数据；src与当前源码逐字匹配 | pack-repeat.json、package/ |
| 起点保全与diff | 产品、正式测试、原报告/lib等起点文件保持；仅状态增加审计摘要 | preservation.json、final-summary.json |

完整回归命令：`OASIS_UNIFIED_FIXTURE=1 tools/bin/node --test --test-concurrency=1 packages/oasis-professional-service/test/*.test.mjs`。

额外9项探针覆盖：已有任务时全部14节点及双来源草稿通道无派发；分支版本、每版本草稿、原审核/双文件回执在通用改名、关标签及重开后保持；requestKey幂等及变内容拒绝；8版本上限不丢草稿；全局未决保护；准备后同名文件出现不覆盖；陈旧客户端审核冲突不生成文件；历史空前序prepared/unknown/failed三态及旧approved/保存证据逐字读取、0写入、0重放。主包正式测试另覆盖发布后索引失败的文件保全和相对恢复清单。

## 探索项、限制及记录修正

保存准备过程中切版本，迟到响应会重新缓存旧计划。初始探针要求该缓存必须为空而失败，已保留`findings-initial.log`。当前页面的planMatches会隐藏不匹配计划，确认保持false；重新选版本也会清计划。尚无错误发布证据，因此本次不将这项更强内部不变量计入5项P2，也不称其已修复。

首个npm dry-run因user/global配置同指`/dev/null`而拒绝；改为本地两个独立空配置文件后退出0，保留`pack-stderr.log`。这是审计命令配置问题，不是产品缺陷；未下载依赖或改变用户npm配置。

浏览器仅使用Chrome访问本轮127.0.0.1临时测试服务；结果页和测试服务已关闭，服务正常退出并清理自身临时夹具。没有留下可运行产品部署。没有重新执行Desktop check，旧应用漂移结论不当作本轮新鲜检查；实际Desktop视觉/键盘/正常进程重启、真实DSH存储/跨进程排他、真实来源、非文本解析及安装升级继续未验。

## 后续顺序

优先修复P2-E保存后交接和P2-C旧草稿格式兼容，再统一P2-B人工编辑容量；随后补齐P2-A空项目入口、P2-D目录恢复。为每项加入能先复现失败的正式回归，保留旧原件、旧hash、未知运行和历史失败。修复后再复审此切片，不能只复跑当前960项来关闭这5项。

本轮只审计、定点复现及更新报告/状态，五项产品问题保持未修复；不把后续修复、Desktop、真实调用或发行视为本轮已执行。
