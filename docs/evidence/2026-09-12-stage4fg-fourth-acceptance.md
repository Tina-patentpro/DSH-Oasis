# 4F 第四次单次真实验收

## 状态：FAIL

用户已确认一次新增调用及隔离失败正文留存。助手经统一页面代点一次，未自动重试。4F未形成有效正文，4G无法继续；未发第五次，不修改/解锁旧failed或unknown。

## 实际结果

- task `3d313b06-b81a-41a4-9961-1d8170af53cd`，workspace-c-4f。
- run `run-a05e9312-09d1-4c06-8f5e-a18dd8b8ab7e`。
- 上海时间2026-09-12 14:12:18.976–14:13:35.573，76597ms。
- `failed/INVALID_OUTPUT`，`failureStage=stream`，`finishKind=max-tokens`，result=null。
- 提供方报告：非缓存输入15435、缓存0、输出16385，其中推理16385，总31820。保留提供方原报告数值；配置maxTokens=16384与报告16385的一token差异未自行修正。
- 本次明确为输出上限终态；全部报告输出为推理tokens，未取得可用正文。没有进入createUnifiedResult的结果合同校验，不是本次result-contract失败或Host120s超时，不由此证明0.2.2格式修订成功或无效；也不回溯第三次原因。

## 构建、输入与费用

DSH/Desktop/Sidebar固定组合未升级。Skill flow-2-6/0.2.2，manifest `f81d427db60ab671dcd552a24794f68c1a323d2dd1b440510bb26f9bfe23d706`，assembly `3347b634d6c3228e9c373bf8c64593cb392145576c65721daceefa878b91390a`。客户端SHA `694c8f400ad7926dd8a96a5eec008161b65a2fbc8d1a538b640f63e37dbdc03b`。

模型仍deepseek-official/deepseek-v4-flash/high；公开官方别名映射为已接受的V4.1-Flash。四字段1111字符、无上游附件；maxTokens16384、normal/maxRetries0、Host120s未变，凭据未读取或修改。

官方人民币价格页重新curl实读退出0。按最高适用费率，本次用量估算0.161950元，加第三次高峰估算0.123898元和用户反馈前两次0元，共约0.285848元，低于10元；仅估算而非账单实扣。来源 https://api-docs.deepseek.com/zh-cn/quick_start/pricing/ ，原始公开HTML位于.dsh-test/stage4f-fourth-pricing.html。

## 留存与恢复

- 唯一临时捕获位于现有累计组装catch，限定精确隔离DSH_HOME和native-model；仅会在结果合同错误时以runId无覆盖保存原始输出及错误栈/结构issues，不保留密钥、headers或推理内容。
- 离线canary确认非法JSON可捕获且不能覆盖已有文件，formal定向3/3退出0。真实运行在stream层失败，因此没有生成该run的正文捕获文件；目录里的run-canary.failure.json仅是离线试验，不能当作真实模型响应。
- 实际Desktop结果页显示“模型达到输出上限”，展开调用记录的ARIA与持久化一致。截图等待15秒超时，未取得本次截图，不追加浏览器排障。
- 候选已通过Browser.close关闭，进程及9231/43120端口检查为空，命令退出0。
- claims-v2-result.js临时改动已按原字节恢复，SHA为`211072334798c7ffbd5686cf5f18a157a47cc49b4108d959d3714b20c08d375e`；恢复后formal测试3/3、退出0，不残留诊断钩子。
- 两真实Profile共20540条目内容变化0，12个旧任务业务字段保持不变，旧编写资源和旧保存正文哈希不变，保全检查退出0。
- 全部当次本地运行证据在.dsh-test/stage4f-fourth-20260912/。未提交推送发布，未变更真实Profile。

## 后续最小方向

停止相同high/16384配置的盲目重复。下一步应先只读核对固定DSH对推理设置与输出预算的实际映射，再制定单一配置调整方案；不靠放宽业务校验解决模型尚未产出正文的问题。是否降低推理强度、扩大预算或采用其他受支持设置，均须给出明确配置与费用边界后决定，不自动实施或第五次调用。0.2.2格式合同效果仍待有效正文验证，4G不能以旧合成产物替代。
