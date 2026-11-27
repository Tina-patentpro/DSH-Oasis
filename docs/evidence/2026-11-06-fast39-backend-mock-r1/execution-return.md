# Fast39 C4 后台同步字节边界候选 R1

本轮接续原 R1 任务4／R2 P5，沿用当前执行目标，只完成后台隔离函数体 mock。21项定向测试 exit 0；生产模块启动、部署 Python/依赖、两端及三方贯通均未验收。应用启动、真实 HTTP/Redis/DB/Dify/模型/费用、源 CI/B/A、提交/推送及发布为0。

## 候选与原件

复用后台 `.local/fast39-shared-api-task0-20261105`，原 `source` 七文件 SHA256 全部不变。另版位于 `candidate-r1/source`；只改 `run_dify_workflow`、`create_category` 两函数及必要导入/类型，新增纯模块 `app/services/fast39_result.py`。同级测试为 `tests/test_fast39_result_contract.py`。未重建2675成员后台工程，未改 snapshots、配置或认证。

准确身份见 `candidate-manifest.json`；原件身份见 `task0-originals.json`。候选只作内部评审，不是已安装或可公开分发包。`get_fast39_delivery_context` 固定返回 None，无客户端/环境/设置开关；合成绑定只由测试注入，不默认采用目录214、服务39、账户33或项目302。

## 本轮实际实现

- 仅选中的同步调用采集同一个响应的 `response.content`，先于原 `.json()`；随后只解析一次，构成冻结 wrapper，收据不可改，`legacy_result` 保留原对象身份。收据不宣称已保存原始正文，也不替代客户端 API 响应 hash。
- handler 先取回原对象，原正文/文件投影、同步保存扣费及异步队列调用保持；两个 `add_task` 调用的 AST 与原件一致。不执行真实财务函数，不声称 durable exactly-once。
- 原排队之后才附加互斥正常/错误增强片段；六输出只选本次同对象的原字符串，不拼入旧 `output_schema`。关联优先，失败/停止/运行/未知分列；内容失败保留 provider succeeded，不补造正常产物。
- 限制单串UTF-16/UTF-8、有效Unicode/无NUL、report重复键/浮点/容器和512KiB片段总量；零权项或全blocked只给内容错误收据。未截断原文、未更改旧保存对象，不新增请求、任务或恢复接口。
- 此后台边界只验传输、关联、类型、容量与最低非零产物条件。来源/完整报告语义、原Outline确定性旁路属于工作流与DSH原职责；本轮不声称其已通过。

## 验证与失败保全

`candidate-tests-final-r2.json/log`：Python3.9.6，21 tests，exit 0。覆盖同次字节且解析前采集、原对象身份、六输出、旧正文和文件类型、无绑定旧接口、异步分支、关联/状态矩阵、输入绑定拒绝、内容/容量拒绝、HTTP/JSON/网络失败、文件失败、队列结果不确定及提前余额/key拒绝。

测试直接编译原源码中选定函数的AST函数体，去除路由装饰器并注入替身；纯C4模块实际加载。没有加载生产 FastAPI/SQLAlchemy/HTTPx 依赖或启动模块。8个候选Python文件另经本机compile和Python3.8 AST语法检查；部署Python版本和实际依赖清单缺失，兼容仍 UNKNOWN，语法检查不是目标运行验收。

保留全部早期失败日志：最初缺新模块；一次旧模块完整导入在模块级创建 `/www` 图片目录时失败（本机只读，未创建），随后改用函数体隔离；夹具Decimal类型/局部导入问题已纠正。`red-original-function-bodies-r4.log` 才是能检出旧行为缺口的原函数体负例；前面导入/夹具失败不冒称业务RED。未在生产路径补建目录或重试启动。

## 发现的真实接续差异

原后台的 `answer_text` 是按 `output_schema` 生成的“中文字段名: 值”拼接，`file_url` 返回列表，保存任务使用逗号拼接字符串。本候选依法保留这些原值/类型。

上轮DSH的正常C4接收/重读检查却要求旧 `answerText === outputs.output`。这只是上轮合成投影假设，不能用于真实旧后台。两端各自单元测试通过不证明贯通；当前两端贯通 NOT_PASSED。下一步先按C4“保留旧投影”的原合同纠正DSH配对假设，并以本候选实际handler响应做离线验证，不改旧后台正文、不猜新绑定、不动旧d80归档证据。实际工作流候选仍缺，三方贯通及正式G0继续开放。

版权署名/联系信息沿已定 OasisIntWrite／TinaD.qd@outlook.com；权利链、许可证正式采用、专业/用户及公开范围接受未由本轮代签。旧FAIL/UNKNOWN与专业服务/发布门保持。
