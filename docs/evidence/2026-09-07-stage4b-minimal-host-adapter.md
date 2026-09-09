# 阶段 4B：最小 Host 适配器执行证据

日期：2026-09-07。质量状态：**STATIC_ONLY**（单测及原生服务离线集成，不是 Desktop 或真实生成验收）。

## 授权与交付

用户“同意实施下一步”批准 4B 计划。新增 dsh-generation-adapter.js 及对应单测，扩展既有 stage4a-native-llm.test.mjs；没有新建诊断框架。

适配器接收 Host 指令、原生模型路由与权利要求书七字段；冻结快照，通过原生 prepareCall/stream 单次取得明确 stop 的非空文字。提供方异常只返回固定安全码/提示，不返回原始错误、reasoning 或 replay 元数据。取消/超时终止本地等待，已开始调用返回 unknown，不重试、不宣称后端已取消。

本批未修改 index.js、RPC/UI、统一业务状态机、依赖/锁文件或上游包；未装配私有 Skill、未调用真实模型/API、未修改真实 Profile、未提交或推送。现有未提交变更保留。

## 测试先行与范围内修复

- 最小导出骨架面对含公开 canary 的 AUTH 错误，首次失败因实际返回 undefined（退出 1），而不是 import/环境故障；实现固定错误映射后 1/1（退出 0）。
- 扩展行为矩阵后，旧最小实现出现 6 失败、1 取消、1 通过（退出 1）；补齐终态、快照与等待边界后 8/8（退出 0）。
- 自查增加异常对象的恶意 prototype 访问对照，复现安全错误处理内 instanceof 再次抛出公开 canary：7 通过、1 失败（退出 1）。保护该分类操作后定向回归全部通过。普通错误 code getter 同样不会穿透返回边界。
- 测试中的 canary 均为明确非秘密样本；不使用正文字符串过滤来掩盖模型可能复述指令的风险。

## 新鲜验证

Shell：cmd.exe。工作目录：D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研。

| 命令 | 实际结果 |
|---|---|
| `node --test packages/oasis-professional-service/test/dsh-generation-adapter.test.mjs packages/oasis-professional-service/test/unified-generation-service.test.mjs` | 15/15，失败/取消 0，退出 0 |
| `node --test tests/integration/stage4a-native-llm.test.mjs` | 1/1，退出 0 |
| `git diff --check` | 已跟踪变更无空白错误，退出 0；存在 LF/CRLF 提醒 |

适配器 8 组测试包含表驱动异常排列；另外 7 项是既有统一生成回归，不将矩阵行数膨胀为测试总数。没有 UI/依赖/装配修改，本批未跑全量 verify 或重建 Desktop。

最终 Git 状态为 2 个已跟踪文档修改、10 个未跟踪文件，包含此前 4A/4B 规划产物；不全部归因于本批。产品 src 中没有该适配器的导入引用；index.js、unified-generation-service.js 及 package.json 的 Git diff 为空。Git 提示全局 ignore 文件不可读，本次未尝试改全局配置。

覆盖：七字段及输入限制、快照不受原对象后续编辑影响、一次调用、空/超长/工具等非法输出、缺失/重复/非 stop 终态、禁止终态后数据、reasoning/replay 丢弃、固定错误、预取消、准备阶段取消、准备/流超时及不合作清理、迟到响应不再发布。

资源界限：正文最多 100000 JS 字符、指令最多 64000 JS 字符、最多 1024 个分块索引；reasoning 内容不交给装配器缓存。默认总等待 120 秒。期限约束异步等待，不是隔离同步阻塞或恶意 Provider 代码的沙箱。

## 原生服务集成证据

复用固定隔离包内真正的 LlmRuntime、BlockAssembler、SessionStore、JSONL 持久化及日志导出函数；提供方是内存离线样本，测试禁止 fetch，不启动真实 Profile 或 Desktop。

本次输出目录：
D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\.dsh-test\stage4a-native-llm\run-dsUIjo

- 原生成功流、产品适配器成功流与原 prepared 代次对照共 3 次；结果文字一致。
- 原生错误对照保留 AUTH 原文及 canary；产品适配器错误只返回 MODEL_UNAVAILABLE，合计 2 次离线错误调用。
- 产品适配器成功/失败后，目标 Session 事件及 JSONL 内容保持不变，导出不包含 canary。
- 对照 Session 显式写入 request/header.system 时，日志与导出确实含 canary；未关闭或篡改普通日志来制造结论。
- prepared handle 单次分发及适配器注册代次固定的原有断言仍通过。

源码 SHA-256：

| 文件 | SHA-256 |
|---|---|
| packages/oasis-professional-service/src/dsh-generation-adapter.js | 43da7e6bae23e42818041e8579a23dccb22bb901c211e7970472f229ffb4b2df |
| dsh-llm/lib/index.js（0.1.2-rc.1） | bde337804d68e095b174abc6c7fad604296a13474d6ee84f6ecf943adcbe60db |
| dsh-session/lib/index.js（0.1.2-rc.1） | be25b05ffd1403908796935ef11a61d4c002f7ff3d12f83ef82a8c9976984342 |
| dsh-session-persistence-jsonl/lib/index.js（0.1.2-rc.1） | dfd6cde28928996f2f44220d013359563c8d9bf6c9c904972e77256767eec385 |
| dsh-session-log-export/lib/index.js（0.1.2-rc.1） | e81f28feee53cfba4c47423de6e03ead849e1aa340edd91af16090e265492756 |

## 未验证及下一业务边界

本批只解决未接线模块的返回边界。最小原生组合中没有追加指令，不等于完整 Desktop 所有插件、实际提供方日志、模型响应和普通导出路径均已通过 G-SKILL。适配器也不防止模型把指令当作成功正文返回。

工作台仍只能合成运行。后续产品接线须明确真实运行模式、权威 Workspace/Session 和原生配置读取、授权/输入快照、持久运行准入、未决任务互斥及 unknown 恢复，并复用同页审核/保存/对话路径；不将真实执行混入 unified-fixture。真实私有 Skill、模型外传/费用、Desktop 整体验收及发行仍未获本批授权。
