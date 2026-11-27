# R2/P5／R1任务4：DSH消费端实现记录 R1

2026-11-06，Asia/Shanghai；Codex单代理。整体目标仍为按计划推进直至完成；本轮有实际源码及测试增量，未完成P5整体。

## 已交实现

1. `m06-fast39-contract.js`：明确C4客户端registry、anchor、来源、处置、coverage、六输出与quality报告的strict Zod形状。没有把原生M06七字段接入本通道，也不转换、忽略JSON Schema的if/then/contains条件。
2. `m06-fast39-result.js`：从实际公共prepare结果重新校验、冻结packet2/包装指令及八原收据，按角色/状态重建registry；Unicode标量键排序、原字节文本hash、重复JSON键/非整数/无效Unicode/NUL/深度及容器预算拒绝；核客户端可取得的报告hash/集合/角色、原文和最终UTF16定位、编号及图、coverage/质量只降级，以及原警示/限制的完整显示重建。
3. 原API适配器将新增互斥fragment从原同步响应一路保留至返回对象，原answerText/fileUrls投影保持。错误fragment即使没有旧正文也保留为“已收到响应”，不误称业务成功或清空为待查询回执。既有已完成progress若携带fragment也保留；未增加任何恢复端点或证明其恢复能力。
4. 原remote服务在缺准确C4输入/交付绑定时，拒绝把该响应经legacy路径变成completed产物；保存原提交及create记录ID，状态为submission-unknown，提示人工核对。继续/重读保持该检查点，不新建、自动查询或让迟到旧投影消除缺件；原账户/origin核验仍先执行。没有写入伪造的fast39Result或provider收据。

## RED→GREEN与修正

- 最初12个新语义测试先因新增导出不存在而失败；原日志保留。首条shell命令的退出码被tail覆盖，不能声称已捕获该Node退出码；日志本身记录断言失败，后续RED/GREEN均由Python明确采集Node退出码。
- 首轮实现11/12通过；唯一失败为负例试图修改公共prepare返回的冻结对象。改为修改副本，未放开原冻结。
- 空claims误归为FIELDS_INVALID：专门负例exit1后改为NO_SUPPORTED_CLAIM。
- target/source集合被额外约束数组顺序：负例exit1后改为逐tuple集合相等并拒绝重复，保留编号/计划的实际顺序规则。
- 原传输丢fragment、无旧正文的错误被清空、互斥性缺失及服务假完成：5项行为负例exit1后修正。
- 暂停检查点提前返回绕过账户核验：重新序列化载入负例exit1后，移至原环境/账户核验之后，未新增授权通路。
- Markdown无效backtick info掩盖标题及树图代码块被改写：2项负例exit1后修正，保留原树字符串及围栏内部换行字节。
- 最终受影响11个测试文件149/149通过，exit0；其中新语义24项。准确命令与完整输出存于本目录，不以测试数表示产品接受。

## Rulings I made

- 沿当前非main checkout执行，单代理自审，运行受影响测试；按项目更高优先级规则不派子代理、不提交或清理工作树。代价：没有独立复审结论。
- C4正文优先于编写期Python参考：空缺项组也明确“未列出”，源表转义控制符、HTML和链接语法，树图仅降低围栏外可见二级标题。冻结示例保持逐值相容；未来三端需绑定同版renderer，编写期脚本不冒充生产者实现。
- 客户端只检查六字符串中可取得的原材料一致性、报告和最终文稿；原Outline旁路、normalizer/tree两个原始count及原segments不在六输出上独立提供，必须由固定生产者另验。没有用报告自洽证明这些不可独立取得的事实。

## 未完成的准确出口

`workbench-contract.js`尚未加入fast39Result owner；本轮未实现provider错误矩阵完整消费、512KiB evidence及实际全record 1MiB/8MiB预算回退、小hash收据/连收据也存不下时的原状态保全。新增本地校验器尚未接真实生成/保存/引用通路，原dispatcher没有packet2及完整交付绑定。因此不能宣布“DSH结果持久化闭环”或三层修复完成。

下一实质步骤仍是R1任务4的DSH可选owner及完整证据/容量/持久化适配，用合成同版响应验证，保持当前默认不激活。既有安装目标1c5b/6f2f未换包，新源码不被称为当前安装包已验证。源CI/B/A、源工作流、后台实际字节采集、三端同版交付、真实复测、G0及专业/用户/发行接受分别开放；未重做PREP2。

本轮未启动App/Host/UI，未使用实际认证、真实模型/API/Dify/上传/付费，未进入源项目或投递WorkBuddy，未提交/推送/发布。测试使用合成响应及既有本机受限夹具。OasisIntWrite邮箱及许可草案、权利链缺件保持，不重复询问已补联系方式。
