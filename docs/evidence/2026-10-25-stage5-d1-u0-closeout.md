# 阶段5 D1-U0收口与复审

2026-10-25，Asia/Shanghai。执行[U0计划](../plans/2026-10-24-stage5-d1-unblocking-plan.md)，用户范围为运行时/原包/许可闭包/DOCX ABI/资源机制只读核对、逐格式解阻清单及复审；明确不安装物化或接入Host，不启动Desktop或新增真实模型/API调用。

## 结论与交付

**U0=COMPLETE_WITH_BLOCKERS；PDF、DOCX均BLOCKED，尚未达到READY_FOR_OFFLINE_PROOF。** 这是计划允许的缺件收口，不是产品能力或部署验收。U1及D1接线均未执行。

| 计划任务 | 本轮可审交付 | 仍缺/不能推出 |
|---|---|---|
| U0-1 | [部署材料核对](../business-baseline/v340-material-extraction-deployment.md)：逻辑/实际根、开发运行时、四候选370文件、元数据/WHEEL、许可、7个lxml扩展链接及原包缺件 | 产品平台/解释器决定、解释器/解析器原包、许可/静态原生BOM尚缺 |
| U0-2 | [逐格式清单](2026-10-25-stage5-d1-unblocking-checklist.md)：G1—G6、C01—C20容量/机制、P/D/X子集与I01—I09身份/兼容/闭环责任 | 目标上限不是实现；硬内存、聚合解码、完整预检及失败回收均待U1/D1 |
| U0-3 | 本报告、逐格式状态及D1计划/当前清单/后续顺序同步 | 未填猜测白名单或安装命令，未开放来源/暗换运行时 |

清单按实际执行日命名为10-25，原计划10-24预定文件名已在最新前缀说明。旧任务复选框、历史报告、FAIL和未提交成果原字节保留。

## 本轮实际核对

逻辑根`/Users/tinadong7036/Documents/开发项目/dsh-lab`是指向`DSH-Oasis`的链接；实际根/git顶层`/Users/tinadong7036/Documents/开发项目/DSH-Oasis`，分支mac/continuity-v2，HEAD035fe82。没有新建或移动仓库，未把链接事实当未来权限。

固定开发Python3.14.8/SOABI cpython-314-darwin和Node24.21.0的字节/版本已核对；本轮标准库脚本只读固定D0候选元数据/许可/已登记文件，未导入解析器。四候选370个文件与原D0 SHA一致，原包SHA未取得，不能用树SHA代填。受控/非忽略仓库文件名和tools直属项未见匹配原包，无用户明确提供的原件路径；未扫描归档/下载/用户材料，结论不扩成全机不存在。

DOCX WHEEL仍cp312-cp312-macosx_10_13_universal2，7个扩展仍cpython-312；arm64切片不解决cpython-314差异。原ImportError保留，本轮不重复导入。动态链接只见libSystem不能排除静态代码，lxml的许可例外及原生组成仍待逐文件闭合。SDK的RLIMIT_AS/RSS声明仅资料，不是硬内存证据。

私有记录位于`.local/stage5-d1-u0-20261025/`，包括baseline、binding、runtime、packages、artifact-scope、development-parser-presence、native-links、resource-reference、inputs和verification-summary；均不加入产品分发。

## 复审范围与检验口径

对计划五项Review Focus逐项检查：缓存与产品部署分层；PDF/DOCX独立关口；目标与实际保护分层；旧编码/权限/历史证据不变；完整准备前零调用及实际保存后相邻链留D1。G1/G2/G4齐全也不能跳过U1/G5/G6直接接线，已在计划最新前缀明确。

本轮是文档/固定文件核对，不新增正式业务测试，不重跑前轮67项/1425项/92组，不用原编号eligible宣称完整DOCX支持。新鲜文档/证据校验通过571项断言：3439个基线文件中3434个原字节不变，只有五份既有文档增加前缀，三份本批新文档；五份旧全文作为精确后缀保留，26个新增局部链接有效，370候选文件及固定运行时指纹不变，前轮六份正式/撤回日志和四份私有结果摘要/指标一致。源码/测试/合同/锁/台账漂移0；git diff --check通过。这571项是材料/文档断言，不计正式业务回归。

执行计划技能要求的一次独立只读整体复审已完成，复审者未发现本轮范围P1/P2或Minor，结论为可按U0=COMPLETE_WITH_BLOCKERS交付。原包/许可/ABI/硬资源缺件是准确保留的关口；D1完整预检/零调用与保存后相邻链是准确保留的未实施职责，不能从“无文档问题”推出运行能力通过。历史实现、专业/法律许可结论不在本轮裁决范围，继续未确认。

验证期间另出现`docs/plans/2026-10-25-dsh-oasis-master-plan.md`，非本轮创建/编辑；仅记录出现时摘要及持续不变，不读其内容、不纳入本批交付或清理。此次保护边界也在私有concurrent-file/verification-summary中单列，避免把并行成果误算成本轮变更。

执行裁定：沿用现工作区完成文档核对（以全量基线防止混入旧修改）；不新增运行测试或提交（代价是没有新增运行证明，故U1/D1继续阻塞）；清单用实际10-25日期而非计划10-24（入口已同步并核对链接）。没有延期Minor或待修复审发现。具体执行日志和裁定见私有progress.md。

## 下一步与边界

先明确G1产品平台/解释器决定和对应原包/许可BOM；PDF补pypdf原件，DOCX另补匹配lxml及python-docx/typing_extensions原件、静态/动态组成与通知；补可验证硬资源方案。材料核对齐全后填准确U1白名单/命令，后续明确执行U1才安装物化及作Host外证明；对应格式U1通过后再申请D1接线。PDF可先行，DOCX保持独立禁用。

本轮不变更源码/正式测试/夹具/合同/锁/pin/台账/Profile/活跃lib；1MiB文稿、2MiB快照、8MiB Workspace和其余合同目标不变；旧v1/values-v1及审核/unknown/保存hash保留。14节点/28格/114历史gap不改，来源禁用。无网络、Desktop/实际DSH、真实模型/API/上传/费用、依赖安装物化、接Host、提交/推送/发布。
