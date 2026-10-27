# 阶段5 LC-R1 packaging许可正文映射修复、材料回归与复审

2026-10-25，Asia/Shanghai。修复[全面复审确认的LC-R1/P2](2026-10-25-stage5-d1-license-closure-reaudit.md)，限定为packaging说明文件与LICENSE.APACHE/LICENSE.BSD的有界只读读取、hash/副本对应及vendor映射；保留原件、原容量和逐格式阻塞。逻辑dsh-lab链接实际DSH-Oasis，mac/continuity-v2，HEAD `035fe82b3f97b983bb561fbefff9ae1ea9d42862`；原未提交成果保全。

**LC-R1已修复，26项材料回归和干净副本通过，作者复审未确认本修复遗留P1/P2。** 这只关闭通知读取/映射遗漏，不关闭完整native/vendor来源、最终通知接受、DOCX资源/实体、macOS机制或U1/D1。PDF/DOCX仍BLOCKED，未达READY_FOR_OFFLINE_PROOF，U1未执行、D1未接线。

## 1. 实际修复

新增窄材料模块[scripts/v340-material-notices.py](../../scripts/v340-material-notices.py)，策略`v340-packaging-notice-1`。它是离线开发材料读取器，未接入Host或业务包。只从固定runtime/pip角色的两处packaging目录读取三种确切文件名：LICENSE、LICENSE.APACHE、LICENSE.BSD；每原件必须有完整6份记录。读取前以原始摘要验证有界不可变字节快照，所有解析使用同一快照；不落地解包、不导入原件内代码，也不由模块写文件。

| 文本 | 字节 | SHA256 | 对应位置 |
|---|---:|---|---|
| LICENSE说明 | 197 | cad1ef5bd340d73e074ba614d26f7deaca5c7940c3d8c34852e65c4909686c48 | runtime主目录/dist-info、pip wheel主目录/dist-info各1份 |
| LICENSE.APACHE正文 | 10174 | 0d542e0c8804e39aa7f37eb00da5a762149dc682d7829451287e11b938e94594 | 同上，4份字节/hash一致 |
| LICENSE.BSD正文 | 1344 | b70e7e9b742f1cc6f948b34c16aa39ffece94196364bc88ff0d2180f0028fac5 | 同上，4份字节/hash一致 |

复用既有stripped运行时及pip26.2.1原始wheel，没有获取新原件。实际读取12份位置记录，按内容保留3份只读文本，但不合并掉原件位置/摘要。正文副本仅写本轮忽略证据目录，文件名为hash加许可名加.txt；测试夹具另保存这3份固定文本及来源/摘要清单，不含第三方可执行代码。

[当前候选JSON](../business-baseline/v340-extraction-distribution-candidate.json)中的packaging条目现有6个runtime noticeRefs、3个noticeCopyGroups（每组4位置），并给27个packaging相关成员更新相同通知引用和副本组关联。策略版本/模块hash与修复前候选SHA分列；原2061成员、18vendor、1518/543来源状态和源原件身份均不变。EVIDENCED不提升为分发接受，候选仍MATERIAL_CANDIDATE_NOT_APPROVED；upstream原始来源/补丁、最终通知范围仍OPEN。

## 2. 防误复制与容量保护

选择依据是固定角色+完整目录+确切文件名，不是“在licenses目录就复制”或全面放开未知后缀。__init__.py、_spdx.py、LICENSE.APACHE.py、JS/C/动态库等与其它文本均不返回；ZIP原始文件名中的NUL别名及选中symlink拒绝，tar目标链接不跟随。任意路径穿越、重复目标/条目、缺副本、不同字节副本、hash/CRC错误、非UTF-8/NUL正文均失败，不发布部分结果。

材料上限原值保持：原始归档96MiB；单通知8MiB/通知总32MiB；tar20000条目、单entry512MiB、实际/声明展开2GiB；wheel512条目、单entry64MiB/总128MiB；65536字节读取块。未选中源码条目仍计条目/展开预算，gzip尾部/padding也计实际展开并校验完整流。可收紧测试预算，不能提高或禁用默认上限；不把这些材料读取预算当成业务1/2/8MiB或worker256MiB已实现保证。

业务C01—C20/P/D/X/I01—I09、旧v1/values-v1及历史hash、原件16许可引用/14可读/2缺失事实保持；zlib-ng引用解释/zstd补件并未被本修复重签。DOCX两unlicensed XSL/readme、native来源/实体控制、硬内存NO_GO_CURRENT_EVIDENCE和XPC隔离DESIGN_ONLY_NOT_IMPLEMENTED仍为原待办，来源全部禁用。

## 3. 26项版本控制内材料回归

测试入口：[scripts/tests/test_v340_material_notices.py](../../scripts/tests/test_v340_material_notices.py)；固定夹具：[manifest.json](../../scripts/tests/fixtures/v340-material-notices/manifest.json)。只依赖现有Python标准库、本模块、三份许可夹具及当前候选JSON，不依赖已有.local、安装解析器或联网。

覆盖真实正文golden hash、当前vendor双正文/副本组、tar/wheel两处读取和四位置绑定、精确名称/任意源码拒绝、原件hash、原始/单正文/总正文/条目/实际展开/ZIP预算等值与超限、预算不可提高、缺失/重复/跨原件或单原件副本不符、路径穿越、tar/zip链接、NUL正文/ZIP文件名别名和ZIP CRC。全部通过调用实际读取器或读取当前候选，不用预写proof JSON代替当前修复结果。

命令：`tools/bin/python3 -I -B scripts/tests/test_v340_material_notices.py`。

| 验证 | 实际结果 | 证明范围 |
|---|---|---|
| 修复前材料回归 | 24项，1通过/23失败，无error | 包含当前候选noticeRefs和副本组的直接失败；未实现读取器的断言失败单独明确 |
| 读取器完成、候选未改 | 24项，22通过/2失败 | 2项仅为原候选缺通知引用/副本组，不能仅写读取器就声称已修 |
| ZIP NUL别名补充 | 原先1项失败，补强后通过 | 在新模块边界发现并补上，不扩展原件/产品接线范围 |
| 最终正式材料组 | 26/26，退出0 | 不是主包业务回归新增26项，原主包/编号计数不变 |
| 无.local干净副本 | 26/26，退出0 | 显式只复制模块/测试/夹具/候选，生成的tar/zip均为临时合成材料 |
| 干净副本换回旧候选 | 退出1，2项失败 | 现行测试能抓住原vendor引用和副本组遗漏 |
| 干净副本撤回伴随名称规则 | 退出1，18项失败，无error | 现行测试能抓住只读LICENSE而漏正文的规则退化 |

原冻结repro-packaging.py读旧proof，所以仍为历史红色证据；本轮不修改它或旧报告来制造通过。当前回归直接核现行候选与读取器，另从实际两原件读取12份正文绑定，结果保存在本轮repair-results.json。干净副本只含材料脚本/夹具/数据，不是依赖安装或解析器运行树物化。

## 4. 复审与保全

按既定单代理方式进行作者复审：复核实际原件摘要、3×4字节与hash、6通知引用/27成员、原候选其余字段、读取选择/预算/失败边界及逐格式阻塞；未将缺陷修复升级为许可/发行接受，也不声称独立代理背书。现行材料读取入口为新窄模块；旧私有通知筛选、旧proof、失败及初稿按历史原字节保留，不作为可重新生成现行通知映射的入口。

本轮私有证据目录`.local/stage5-d1-packaging-notices-repair-20261025/`保存起始基线、修复前候选、红绿/撤回/干净副本日志、真实原件读取及正文元数据、最终核验与作者复审。原11份原件和既有500份私有证据保全；源码材料、原件、既有合同/台账/锁/pin/旧数据不重写，原候选变化只限packaging通知修复字段和策略记录。

最终命令`tools/bin/python3 -I -B .local/stage5-d1-packaging-notices-repair-20261025/verify.py`退出0，650条材料/保全断言、12个本地交付链接及新鲜26/26回归通过，`git diff --check`退出0。3455个基线文件中3448个不变，本批仅候选通知字段与6份文档前缀更新；6份旧后缀逐字节保留。新增窄模块、材料测试/4份夹具文件和本报告，不修改产品运行链或既有业务回归；本轮未发现额外外部文件漂移。完整字段差异、代码/候选hash及结果见verification-summary.json。

没有安装物化或执行原件代码、获取新原件、网络/模型/业务API/账户操作、接Host或启动Desktop；没有修改产品src/lib、正式业务测试、合同、Profile或活跃lib，也不提交推送。U0/U1/D1门保持，后续仍须材料可审→明确U1 Host外实证→实际通过并获D1指令，才能正式业务提取/兼容/共同保存相邻链。
