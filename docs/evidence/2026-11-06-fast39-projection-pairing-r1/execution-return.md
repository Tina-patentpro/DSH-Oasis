# Fast39 旧投影与六输出配对修正 R1

本轮按原R1任务4／R2 P5完成后台候选函数体到DSH消费/存储的离线配对，默认真实接入仍关闭。源码与实际归档分别193项定向测试通过（exit0），包含8项新增后台→DSH测试。不是完整工作流三方贯通、安装、Host/UI、生产Python、专业或用户接受。

## 问题与修正

原后台以 `output_schema` 将正文投影为“中文字段名: 值”，并保持既有文件返回类型。C4明确要求保留旧 `answer_text/file_url`，另外附加六个原字符串。上轮DSH却要求旧 `answerText === outputs.output`，这条合成假设使真实候选handler正常响应不能保存。

本轮移除接收端这项错误等值要求：同次响应内的旧正文继续按原格式/原哈希规则保存；六输出独立通过原registry/质量/来源/警示校验后存入既有唯一owner。没有替换旧正文、重算旧数据hash、迁移旧记录、修改metadata合同或新增生成入口。

为保留重读的篡改拒绝，原确定性显示函数原字节提取到纯模块 `m06-fast39-render.js`，供初次校验与重读共用，避免引入Domain/result循环导入。重读检查所报anchor hash、六输出中整个pending/output确定性重建值；旧正文、文件、artifact及responseSha仍由原独立完整性检查保护。该检查不声称从收据恢复provider原字节，或独立取得原Outline。

实际源码增量为 `oasis-remote-service.js`、`workbench-domain.js`、`m06-fast39-result.js`及新增纯render模块。一个既有测试移除错误旧正文等值假设并保留外来key/非法收据拒绝，新测试覆盖真实旧前缀及两种完整性。准确文件身份见 `changed-files.json`。

## 两端实际代码与替身范围

后台沿用上轮 `.local/fast39-shared-api-task0-20261105/candidate-r1/source`，8源码及原21项测试字节保持。只新增同级 `tests/render_fast39_mock_response.py` 桥接测试脚本；它调用原测试夹具，编译候选 `run_dify_workflow/create_category` 的实际AST函数体，真实加载纯C4模块，HTTP/Redis/队列均为替身。输出记录实际三个源文件hash，并与本机候选核对。

每个场景由DSH公共合成材料构造packet2/registry及六输出，经一次fake provider post、解析前response.content收据、候选handler旧投影与原保存任务排队，再交给实际DSH API客户端的fake fetch，进入消费器、Domain仓库和重读。没有把手工拼接的成功fragment当作候选handler返回。候选函数体之外的路由装饰器、生产导入/全局响应封装/HTTP库解压、数据库及真实扣费不在测试范围；原生产模块不会启动。

8项新增测试覆盖：正常带前缀旧正文与六输出/冷重读；旧正文和C4显示独立完整性；provider失败、运行中、run冲突、第六输出非法、零权项及UTF16超限。失败/UNKNOWN保持原排队事实，无completed artifact、无再次创建/查询/上传。合成响应本身可计算provider字节hash，这不扩大真实客户端取得provider字节的能力。

`actual-pairing-source.json` 与 `actual-pairing-archive.json` 是两次独立运行留下的正常配对样本，内容逐值相同，包含同次provider原合成字节、候选handler响应、API规范化结果和重读记录。完整交付指纹、真实origin/账户/Workspace/folder/service/catalog/schema仍未登记；测试使用明确合成身份，不能作为正式绑定。工作流实际候选缺失，三方完整贯通仍未通过。

## 测试、构建与归档

- `red-actual-pairing-r2.log`：旧DSH消费器6项通过、2项正常配对失败，错误为原正文不等于output，确实检出本缺陷。更早 `red-actual-pairing.log` 是桥接脚本stdout清理问题导致的测试基础设施失败，保留，不当业务RED；脚本已改为显式释放自身替身和stdout。
- `affected-source-tests-final-r2.json/log`：15个受影响文件，193/193，exit0。
- `client-build-command.json/log`：固定Node24.21.0／tsdown0.22.14、现有离线依赖，新.local输出，exit0；未写原包lib、安装依赖或启动应用。
- `pack-command.json/log`：从上轮d80实际归档旁置复制，仅替换三源码、增加render模块和同次构建客户端；离线npm pack、忽略生命周期脚本，exit0。未发布。
- `affected-archive-tests-final-r2.json/log`：同样193/193，exit0。证据loader只映射源码URL到实际解包内容，禁止回退原src；四个新/改源码均实际加载，未替换业务实现。此证明依赖既有固定ancestor peers，不等独立安装或原生SDK/Host验收。

新内部归档：

`/Users/tinadong7036/Documents/开发项目/DSH-Oasis/.local/fast39-projection-pairing-package-20261106-r1/archive/oasis-professional-service-0.0.1.tgz`

SHA256：`d2b9a4b76ba69b5b799c13265de3735d981c575adbfdc0dae7b75dbdacc30457`，138成员；完整清单为 `package-member-inspection.json`。解包位于包下 `.dsh-test/fast39-pairing-archive-20261106-r1/package`。package仍private/0.0.1，新包仅内部候选；未修改已安装M06的1c5b/6f2f配对，不拿旧安装/租约证据替代新包验收。旧d80及全部原证据保持。

## 剩余工作与边界

本缺陷已在上述两端离线范围内修正。原R1任务4整体仍开放：实际工作流来源ID/原Outline旁路候选、真实三方交付绑定与离线贯通未完成；PREP2/源CI/F0/setup/F1/B/A依各自原门，本轮不恢复源事务。原Fast39 FAIL/partial、正式M06 API/G0、生产Python/依赖、Host/UI、专业/用户与权利/许可正式采用、发布条件保持。

下一步对原R1/R2剩余项作完成度核对，复用已交M06安装数据布局、writer租约、结构文稿和UNKNOWN更新证据；只继续有独立授权及输入的具体缺件。不得重复制造模型成功、重取历史回执、改旧expected hash、替代专业签收或以归档重做已完成业务。

应用、真实HTTP/API/模型/Dify/Redis/DB/资金、源事务、WorkBuddy投递、提交/推送及发布均0。署名OasisIntWrite、商业授权邮箱TinaD.qd@outlook.com沿已定信息，权利链/具名专业用户接受未由本轮代签。
