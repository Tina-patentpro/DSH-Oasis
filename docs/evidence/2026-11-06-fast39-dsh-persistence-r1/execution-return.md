# P5 DSH合成消费与持久化回执

2026-11-06，Asia/Shanghai；Codex单代理。接续R2/P5、R1任务4及前轮消费端记录。本轮有实际实现和交付增量，整体目标仍未完成。

## 本轮交付

- 原strict远程执行记录新增可选`fast39Result`，旧数据不迁移、不重算旧hash。证据只存该owner，不复制到run或v340.result；正常六字符串原样一份，解析quality只作临时视图，旧API responseSha和后台provider字节收据继续分开。
- 完整消费C4正常/错误形状和执行/关联/内容矩阵；无响应或非法receipt不制造收到过的provider收据。内容错误保留provider succeeded；收到的输出仅保存实际白名单字符串，不补默认值。512KiB或单串/转义膨胀超限时整份子集不保存，小收据标为hash_only_not_persisted；不是原HTTP全文保全证明。
- 原remote service增加未注册RPC/tool的receive-only方法，只有构造时显式捕获的同次同步create上下文才能使用；当前应用没有供应该上下文。捕获副本固定Workspace/path、task/execution/request、origin/account、folder/service/catalog/schema、原inputSha、packet2及实际User_input/八输入/单文件上传快照，入库前核当前native Workspace和登录身份。该方法本身不创建、上传、查询、重试或扣费，不能代正常生成入口/实际交付绑定。
- 同版正常结果复用原legacy结果、review/save/reference合同，初态not-reviewed；本轮实际验证至结果创建和repository重读，没有新增自动保存、对话发送或专业接受。原Fast39旧投影为output，本消费端要求原answerText与本次六输出output一致，不伪造正文或改写其旧hash。
- 检查完整拟存record及revision增加后的JSON字节，计原正文/artifact重复、legacy1MiB和整个Workspace8MiB。空间不足则从原提交状态另建小错误收据候选，丢弃未提交的新artifact；连小收据也存不下时抛明确持久化错误，原业务文件字节保持。磁盘写失败原样返回失败，不自动再取或再派。
- 重读检查证据所属request/状态/安全错误码、原报告锚点hash及原结果投影。元数据只能作为历史记录及报告自洽证据；它不让客户端重算未收到的provider字节、重建未持久化的全部原材料或证明技术支持充分。

## 验证与准确载体

最终源码14个受影响测试文件**185/185通过，exit0**。完整命令见`affected-tests-final-command.json`。涵盖全部错误矩阵、原八收据、来源/非BMP定位/警示、无默认输出、旧接口、全record容量、账户与项目归属、并行revision、重读、重复/迟到、磁盘失败及共享Workspace互斥。

存储测试使用实际Oasis repository/服务/Schema/完整性检查，Domain I/O替身写真实临时JSON文件并关闭重开；这不是原生SDK JSON后端或已安装writer租约再验。没有用替身宣称真实Host/UI或非生产API已接受。8MiB另有明确的容量分类探针，其opaque容器不是通过业务Schema的产品记录。

固定Node24.21.0/tsdown0.22.14离线依赖构建客户端至新`.local`目录，exit0；原包lib文件未写入，当前字节与保留6f2f归档匹配。构建仅证明可编译，未渲染界面。

从保留6f2f实际包旁置装配，离线npm pack、禁生命周期脚本，不安装/下载依赖。最终内部归档为：

`/Users/tinadong7036/Documents/开发项目/DSH-Oasis/.local/fast39-dsh-persistence-package-20261106-r2/archive/oasis-professional-service-0.0.1.tgz`

SHA256 **`d80df043641a0e0785c91cb6e1fd589ae4f6005f8dc3625d62029c6c05c2adff`**，137个实际成员；较6f2f共9项新增/变更（7源码、2构建产物，其中3源码新增），其余原件/业务资源/pin/通知保持。原0.0.1/private=true元数据与许可未正式采用状态不变，不是正式发行包。

最终归档实际解包后，用仅改源码URL解析的测试loader执行同一批**185/185测试，exit0**，禁止回退至工作树源码；7项新增/变更业务源码均实际加载，固定peer仍沿原已物化依赖解析。没有替换业务函数。归档及测试记录不代替实际安装/加载/运行接受；当前1c5b/6f2f安装物未更新。

## 失败及自审修正

初始证据测试8项先因缺新增函数失败；实现后与24项原语义测试一起32项通过。第一轮存储夹具遗漏v4必需generation:null，错误日志保留后只修夹具；该失败不是owner功能的有效RED。随后在隔离副本中仅替换为与preflight字节完全相同的原owner Schema，正确负例因不识别fast39Result失败，未改当前源码或旧归档。

重读锚点/投影负例和Workspace互斥负例分别先exit1，再修正并通过。首包68d8d7b5…曾184项通过，后由互斥自审缺口接续为非最终；旧包及日志保留。最终r2只比首包改remote service这一个成员，再跑185项归档测试。一次before复原脚本多带空行而断言失败，改从保留6f2f原件取得与preflight hash相同的原字节；没有调整expected hash或修改业务源文件绕过检查。

## 本轮取舍及后续

1. 按项目要求复用当前checkout，单代理自审，不提交/推送；没有独立复审接受。JSON检查提取为C4专用、无Node依赖的共享函数以供客户端strict Schema复用，不新建通用验证/Provider工具链。
2. 默认不供应fast39Delivery、不注册新RPC/生成入口。实际运行前仍须绑定真实DSL/后台/客户端/能力清单及同版交付指纹，不能用这里的合成捕获值激活真实服务；缺件只阻实际接入，不阻当前合成存储验证。
3. 已存首份收据不可被不同的迟到响应覆盖。pending/UNKNOWN只保留原记录，continue/stop不借旧query通路消除C4缺件；不同新收据需人工核对，未声称具有结果恢复或收据历史替换能力，也不为此新增sidecar或重派。
4. 不独立证明原Outline旁路、生产者原两count/segments、provider原字节或技术支持充分；专业/用户接受分别开放。新137成员仍含原历史限定/第三方材料，公开/权利/正式许可范围不因新归档放行。

下一项按R1任务4核后台隔离mock的实际函数/应用依赖与原投影/字节收据/资金队列行为；源工作流CI/B/A继续按自身门，不进入未准入源设计生产。本地新包如进入安装验证，应消费准确d80d候选并另版装配，不改旧bundle或旧准入hash。三层同版贯通、实际部署/真实复测/G0、App/UI、专业/用户及发布仍未完成。

本轮未启动App/Host/UI，未使用真实认证或模型/API/Dify/上传/支付，未投递WorkBuddy，未提交/推送/发布。OasisIntWrite邮箱及Community License草案保持；权利归属、正式采用及接受缺件未替用户补认。
