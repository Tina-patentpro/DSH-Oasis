# Fast39 Task0：只读源码身份固定

时间：2026-11-05，Asia/Shanghai。执行者：Codex，单代理。

本轮已完成用户指定的 **Dify DSL、代码节点、当前线上后台源码身份只读核对和原件固定**。完整计划 Task0 仍为部分闭合：获准开发工作副本、规则／Skill采用映射和拟议合同技术确认尚未具备，不能据此开始 F1/F2/B1/S1。

本轮新增生成 **0**、上传 **0**、付费调用 **0**；业务代码修改、部署、提交、推送均为 **0**。只新增本地取证副本及本报告，不改应用草稿、发布版本、后台配置、历史证据或计划勾选状态。

## 1. 当前 Dify 对象已对应

| 对象 | 固定身份 |
| --- | --- |
| JTTI 应用 | `b1af2fc9-817e-5247-aeed-dd16abad8337`，`Flow-2-6-权利要求书生成-Fast-1.2.1` |
| 当前已发布工作流 | `57bfe3ab-ff48-410b-b140-c20c1da828a9`，version_number `3`，版本 `2026-11-04 13:48:13.209846` |
| 既有复测运行 | `5e374a6f-5a89-4472-aa82-dfc768b9b6c4`，引用上述工作流及版本 |
| 当前草稿 | `bf01ec43-8701-4f60-bb96-204495ccdbc4`；草稿标识与发布标识分别保留 |
| 正常界面导出包 SHA256 | `da029add82ac188ea918f71b42bc99f62f112051be10238494b4132a5175c030` |
| 解包 `app.yaml` SHA256 | `3a249d33f9d3bb8e359c191134732d8f836e3ae506df8cc395151d1fbd91bd66` |
| 工作流图语义指纹 | `2be2019b05560cc3a7d0be3b296c0175b83fb4f49a0699326e57c53495631b75` |

通过应用正常“导出”入口取得 `include_secret=false` 的 `.ifpkg`；包内 manifest 的 YAML 字节数及 SHA256 与实际解包相符，浏览器观察到的导出响应与原生下载文件字节哈希相同。本次没有使用此前被拒绝的内存数据下载路线。旧运行完整节点执行档案未保存的限制仍保留；本次补齐的是完整静态 DSL／提示／代码原件，不能冒充完整原始执行输出档案。

导出、当前已发布版本、当前草稿和既有复测运行的图语义指纹一致；全部 **14 个代码节点**正文哈希与原复测时观察的代码哈希一致。图定义共 **38 个节点、10 个 LLM 定义**；原复测实际执行 **36 个节点、9 个 LLM 节点**，不是节点数冲突。图语义指纹剔除节点位置及选择／运行态等界面字段，保留完整节点 data 和边连接；原始 DSL 哈希另列，二者不混用。

已分别保存14份原样 Python代码及10份完整 LLM 节点定义（提示模板、模型设置、结构化schema等），未执行它们。关键修改对象现在可以明确定位：语义抽取 `1770000100005`、合并 `1770000100003`、Outline `1764588108416`、终版 `1728183992412`、终版净化 `1769301001008`、规范化 `1769301001100`、最终显示 `1769301001101`、结束 `1727495950805`。

原件固定于[本轮私有取证目录](/Users/tinadong7036/Documents/开发项目/DSH-Oasis/.local/fast39-task0-20261105)。目录权限0700，源码／DSL原件0400，位于Git忽略的 `.local`；没有向仓库证据目录复制凭据或整包提示。导出环境变量声明为空；六个HTTP节点的授权值为模板引用，没有解析或取回秘密。有限模式检查未发现字面凭据，不据此证明完整运行环境或所有凭据配置。

## 2. 当前青岛后台已绑定到真实部署文件

只读SSH核对链路为：`lzhxpy.oasisintwrite.com` → 实际Nginx配置及代理include → `127.0.0.1:8000` → Python进程PID2206 → cwd `/www/wwwroot/lzpy` → `main.py` 的 `/api` router → `app.api.api_v1` → `v1.__init__` 中 `apiconfig.router as api_router` → `/apicategories`。

实际站点配置文件名仍含 `lzpytest`，但 `server_name` 为 `lzhxpy.oasisintwrite.com`；没有仅凭目录名称推断路由。进程解释器为 Python3.10.20，启动时间 `2026-10-23T16:06:48.210000+00:00`。所核源码文件mtime早于该启动时间；这是部署磁盘／进程／路由的有界观察，不是内存模块或整站环境证明。部署目录无 `.git`，故部署commit记为 `null`。

| 相对部署根路径 | SHA256 |
| --- | --- |
| `app/api/v1/apiconfig.py` | `34bb91b8f6b821f36d177ddd9f33fb6c533347949b27371a7ca39c983ec831b2` |
| `app/services/workflow_service.py` | `3afbe8df5543c5b1d112bd3309e80351e284fc1d294b6a8fbc00f33f8ae428a3` |
| `app/schemas/api.py` | `22408b9b73681cd3c57881d72659d87a4702ca37eb305657cfda46879452a34f` |
| `app/services/apiconfig_services.py` | `2a3ce49be3c67e5eed94280abb352b193b1f93dbd298a52298d184cad9931d5b` |
| `main.py` | `2d85b9fd7aae0043f4312bb4be695e1a64b3f903e806024d3a351c4289628c79` |
| `app/api/api_v1.py` | `643218f31d01b11e4841c7c145e295a07932e78cd949b9ce4bd13d178c6ba6e5` |
| `app/api/v1/__init__.py` | `a6d0d75c351c39cdd4422d043b44fcf6600f69ad685b17c5629a2ed454388fe7` |

七个文件均保存了只读原件，且与10月17日历史快照的对应文件逐字节一致；历史快照本身未修改。投影位置已确认是当前 `app/api/v1/apiconfig.py:85–169` 的 `create_category`，其中按 `output_schema` 遍历、拼接 `answer_text`；工作流请求位置是 `app/services/workflow_service.py:7–62` 的 `run_dify_workflow`。因此原方案引用的两个函数仍对应线上源码，不必为核对重新调用Dify。

当前服务39安全字段子集指纹仍为 `472f7981e4218d6a04b8dcb1f058b51fb678fef3a552dfef3719598436a75872`：八输入、同步Workflow、`output_schema`仅 `output`，更新时间 `2026-11-05T10:22:48`，目的地为JTTI。仅只读核对配置，没有保存编辑或请求业务生成。

## 3. Task0尚未闭合的实施前置

1. **后台可写开发副本及测试位置未绑定。** 本轮七文件快照用于证据，不是获准修改的完整工程；准确后台离线测试绝对路径继续记 `null`。不得编辑历史快照或线上目录，也不能把未来建议的测试文件名写成已存在。
2. **IC-DESIGN／SKILL／RULES采用链未证实。** 已只读核对本地设计项目规则及登记册revision481。Flow-2-6当前候选仍为 `undesignated`，状态为 `legacy_assets_present / gap_confirmed / backlog / STATIC_ONLY`，登记册没有本应用ID／Fast-1.2.1的精确采用绑定。应用描述中的Tokyo来源ID及hash只作实例迁移线索，不等于规则／Skill采用回执。本轮没有扫描 `5、存档`、选择同名旧YML、变更设计项目资产或办理设计修改事务。
3. **新结果合同只固定提案，不视为已接受。** 已原样固定R1计划中 `source_map`、`feature_dispositions`、`quality_report`、`structured_result`及 `flow26-source-trace-1 / flow26-quality-1 / flow26-fast-result-1` 的提案文本和父计划hash。当前服务指纹、DSL指纹与拟议新合同分别记录；尚无新服务交付指纹，不生成假的未来hash，也不把提案当成线上能力或技术验收。

最终保全检查发现设计登记册并行变为revision482，新增BM1-R1职责文档任务的started登记。本轮保留首次读取的revision481/hash，并有界重读确认Flow-2-6两行仍相同、仍无本应用的采用绑定。没有另存整册旧字节，故不声称已证明整册差异全部无关；此漂移不影响独立取得的线上源码身份，后续实施仍须按当时最新入口复核。

以上缺件不影响本轮已固定的源码身份结论，但完整Task0不能全勾选。后续仍按原方案先补上述受影响前置，再另依明确实施范围推进离线候选；本轮不启动修复、生成、部署或正式M06派发门。

## 4. 核对证据与边界

- [EXEC-R2前置身份及既存工作区基线](/Users/tinadong7036/Documents/开发项目/DSH-Oasis/docs/evidence/2026-11-05-fast39-task0-preflight.json)
- [源码、节点、服务及合同提案绑定清单](/Users/tinadong7036/Documents/开发项目/DSH-Oasis/docs/evidence/2026-11-05-fast39-task0-source-binding.json)
- [本轮最终校验记录](/Users/tinadong7036/Documents/开发项目/DSH-Oasis/docs/evidence/2026-11-05-fast39-task0-verification.json)

校验采用正常界面只读观察、既有SSH的只读文件／进程检查、本地原件字节hash、包内manifest、Python AST解析、图语义及节点代码比对。未导入应用模块，未执行节点代码，未运行未来业务测试或设计项目全库治理测试；不把静态取证称为修复通过、完整专业验收或部署成功。原三次运行的FAIL／partial及G0、共同界面、专业／用户接受状态均保持。
