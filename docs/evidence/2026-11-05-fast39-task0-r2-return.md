# Fast39 Task0 R2：隔离副本、采用核对与结果合同冻结

2026-11-05，Asia/Shanghai；Codex单代理。本轮按用户要求补齐静态前置，不修改业务代码、不部署、不新增生成或付费调用。沿协同1.2.2、整体1.3.1／NS1-R1适用部分及BM1-R1复核；最新执行分工为Codex制作Skills／工作流，原来源、试行、Batch、专业／用户及发布门保持。

本轮已明确后台隔离源切片和准确测试路径，完成规则版本／Skill／当前节点差异核对，并冻结新结果合同候选1。**静态准备包已形成；完整Task0仍不能标为业务制作准入通过**：未取得该Fast39应用的具名IC-SKILL／RULES／DESIGN采用与适用范围，当前本地设计候选仍未指定。新合同“冻结供评审”不等已获实施或发布接受。

## 1. 后台隔离副本与测试路径已明确

| 项目 | 本轮固定位置／状态 |
| --- | --- |
| 隔离目录 | `/Users/tinadong7036/Documents/开发项目/绿洲慧写-后台4.0/.local/fast39-shared-api-task0-20261105` |
| 原样源切片 | 上述目录的 `source/`；7份源文件复制自Task0原件，与本轮只读SSH核对的线上7份文件哈希一致 |
| 测试目录 | 上述目录的 `tests/`，已建立 |
| 预留准确测试路径 | `/Users/tinadong7036/Documents/开发项目/绿洲慧写-后台4.0/.local/fast39-shared-api-task0-20261105/tests/test_fast39_result_contract.py`；文件未编写／执行 |
| 未来增强helper位置 | `source/app/services/fast39_result_contract.py`；尚未创建 |
| 原函数位置 | `source/app/api/v1/apiconfig.py` 的 `create_category`；`source/app/services/apiconfig_services.py` 的 `get_api_name_detail` |

七份业务代码内容修改为0。该副本是为本次handler／投影mock测试准备的有界源码切片，不能当完整可启动服务或后台4.0 candidate-r2。历史snapshots和前轮0400原件不动；新副本在后台仓库已忽略的 `.local` 下，未携带.env、凭据、数据库、依赖、用户文件或生产配置。本轮没有创建新Git分支／worktree、安装依赖或启动应用。

未来离线测试提取真实handler函数体AST，仅在测试侧去装饰器／默认依赖／注解并注入fake；不导入真实app／main、HTTP或DB。必须验证旧answer_text/file_url逐值兼容、六输出不重复拼正文、Dify请求与原保存扣费排队次数不增加、其他服务保持旧行为。不能另抄投影实现后只测复制品。实际业务测试仍待实施授权后编写。

当前系统Python3.9.6、DSH固定工具Python3.14.8均已核；线上Python3.10.20，本地同版运行时未具备。预留命令使用系统Python作纯mock单元验证，不能代替目标运行时／部署验证；本轮未安装3.10或依赖。准确路径、hash及隔离约束见[后台副本记录](/Users/tinadong7036/Documents/开发项目/DSH-Oasis/docs/evidence/2026-11-05-fast39-task0-r2-backend-copy.json)。

## 2. 规则／Skill采用核对已固定，未补认历史采用

| 层 | 实际证据 | 结论 |
| --- | --- | --- |
| PD生产者 | `m06-v340-range1-candidate-0.1.3`，manifest SHA256 `7ec58d41d870b122f763657ab983ad0a45d9f266a466983775b8d066dc8c63b9` | 30项清单成员全部核实；候选资源与工程／旧UNKNOWN分开 |
| DSH实际资源 | `m06-business-candidate-0.1.3.json`，SHA256 `26ec83ae26f26783fb4b56abf7b1ac75081214770d0cefaaf2ca0fd0ec56deca` | 8份业务载荷与PD原件逐字节一致；另2份operator-only限定材料不进入生成；不是旧flow-2-6/0.2.2替代绑定 |
| 该Skill的规则来源 | F26 V0.1.9，SHA256 `391b39a1c4e69a0108deb365a9ff96ea31dfae336663aab56faa279121ffd5a0` | 有原rule-adoption-map及精确试行收据，限定文稿试行，未正式生效／未因此授权Dify |
| 测试集库当前规则 | F26 V0.1.12，SHA256 `c8c4691db030af30c3ee7c275502cb679c7a3aea8ea0ec601994efc4e6b5b7ac` | 精确收据只允许阶段6文稿试行，明确不工程／Dify；不能把Skill的V019旧pin改成V012就声称采用完成 |
| 本地设计 | 根登记册revision483；Flow-2-6 `current_candidate_yml=undesignated` | 不按最高版本／同名文件选候选，不扫描5、存档；本轮不修改该项目，无制作事务 |
| 当前Fast39实例 | 前轮已固定完整DSL、14代码及10LLM定义 | 可做节点差异核对；未取得该应用与上述Skill／规则的具名采用回执，提示相似或来源描述不代证明 |

本轮7条映射逐项给出规则路径／hash／条款、Skill落点、当前节点、差异、拟适配机制及验证项，见[采用核对矩阵](/Users/tinadong7036/Documents/开发项目/DSH-Oasis/docs/evidence/2026-11-05-fast39-task0-r2-adoption-map.json)。核心包括：

- R03／R06与ref05 §3.7：来源ID和稳定特征身份保全；来源旁路与UTF-16短引定位；缺T2登记，不伪造完整链。
- R04a及禁止无说明改变实质限定：终版移出核心关系须明确处置；资料不足可受限草稿，不能“补造／删到骨架”后报完整。
- 警示及旧状态保真：保留原Outline警示、partial／insufficient与创建事实；不由新合同填空评估或重试。
- 八输入七字段M06合同与Fast39六字符串输出明确不同；旧七字段adapter不启用。R2“不得新增技术事实”是本次更窄约束，不等于F26全部模型补齐规则已实现。

这份矩阵是本轮静态比较及未来适配候选，不是追认线上历史采用，也不替测试集库批准超出原试行范围。未复制评价题、答案或具体案例权文到新合同或工作流。

## 3. 新结果合同候选1已细化并固定

见[合同正文](/Users/tinadong7036/Documents/开发项目/DSH-Oasis/docs/business-baseline/fast39-result-contract-candidate-1/CONTRACT.md)及[冻结清单](/Users/tinadong7036/Documents/开发项目/DSH-Oasis/docs/business-baseline/fast39-result-contract-candidate-1/FREEZE.json)。本包包含9个schema定义、纯合成定位示例、16项未来验证规格及disabled交付绑定候选；不是部署包或实际API响应。

相对原R1提案，已明确：

1. 原文UTF-8 hash与UTF-16偏移分别计算，不归一化CRLF、不切代理对；正文hash与原文件／收据hash不能混用。
2. 计划权项ID到终稿编号显式映射；未成稿的来源记录保留，claim_id为null。保留原planned_claim_id，避免将计划编号冒充终稿。
3. 核心目标按计划权项＋feature_id核，不因移到其他从权就称原核心覆盖完整。未覆盖／未核不得ok；机械覆盖不代语义支持。
4. 三种特征处置的正文定位、空值和缺口行为固定；保留原9项quality_report，增加版本化来源与覆盖信息，支持审阅继续记not_assessed。
5. 外部仍6字符串输出；后台从同一次响应交structured_result，旧answer_text/file_url及旧output_schema不变。收到响应后的增强格式错误有具名可选错误对象，保留原任务／资金事实，不重发。
6. 固定字段数、类型、容量交集和总快照预算，拒绝未知版本、非法／重复JSON键及身份矛盾；不截断材料，不把原M06七字段缺项伪装已评估。
7. 详情返回实际使用ApiResponsedetail，未来改点不能只落在未使用的ApiDetailPublic。新发布DSL、后台改后清单、客户端及服务交付指纹均null，activation=disabled；旧服务指纹不冒充未来交付hash。

字段细化由Codex在当前Task0文稿范围内提出；只冻结供下一步评审，不写成用户已经批准这些新细节。JSON文档解析／本地引用／合成位置等静态检查与未来业务测试分别报告；未安装JSON Schema验证器或声称已完成完整引擎校验。

## 4. Task0出口与下一接点

| 前置 | 本轮状态 | 后续动作 |
| --- | --- | --- |
| 对应DSL／节点／线上源码身份 | 前轮完成；本轮复核线上7文件无漂移 | 修改前再次绑定实际候选，旧原件不变 |
| 隔离代码副本／测试绝对路径 | 已建立原样源切片、测试目录及明确预留路径 | 获实施范围后才写helper／测试及业务修改 |
| 规则／Skill采用核对 | 版本、效力、资源一致性与7项节点差异已固定 | 取得／制作具名且许可范围相符的IC-SKILL／RULES／DESIGN；当前不能把V012试行扩到Dify |
| 新结果合同 | 候选1文稿冻结，非接受／非实现 | 评审具体字段及范围；实际候选产生后再固定新交付指纹 |
| Python目标运行时 | 本地现有版本已明列；生产3.10.20未作本地同版验证 | 目标运行时／部署前另核，不阻本轮文档交付 |

后续可继续审阅这份具体静态包；不因它存在启动F1/F2/B1/S1。本轮保留原三次运行的FAIL／partial、正式M06派发门、共同界面及G0／专业／用户接受状态；不修改中心计划、项目状态入口、旧计划勾选或任何源项目接受记录。

[本轮EXEC-R2](/Users/tinadong7036/Documents/开发项目/DSH-Oasis/docs/evidence/2026-11-05-fast39-task0-r2-preflight.json)记录16项初始输入、BM1→BM1-R1差异及两仓既存文件身份；[最终校验记录](/Users/tinadong7036/Documents/开发项目/DSH-Oasis/docs/evidence/2026-11-05-fast39-task0-r2-verification.json)记录合同冻结、源码字节保全、静态检查和未执行项目。

本轮业务代码内容修改0、部署0、上传0、新增生成0、付费调用0、Git提交／推送0；有一次只读SSH七文件复核和本地静态准备，不称网络0。
