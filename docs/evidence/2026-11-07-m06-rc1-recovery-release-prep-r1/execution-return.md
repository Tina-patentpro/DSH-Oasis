# R4-01业务恢复方案与R4-02首发技术事实准备回执 R1

2026-11-07，Asia/Shanghai；Codex单代理。用户明确要求先完成同版业务稿恢复最小离线方案和123成员首发技术事实清单，暂不启动应用、真实调用或发布。本轮仅完成这两个准备出口，不执行恢复方案或R4-03—05。

## 交付及准确范围

1. [最小离线方案](../../business-baseline/m06-rc1-business-recovery-scope-r1.md)固定a7cf/061d、拟用但未创建的新根、公共业务接口、DomainFacility/installed JSON与writer链、审核/修订/无覆盖保存/独立进程冷重读、直接负例及明确停止条件。
2. [公开自编合成样例](../../business-baseline/m06-rc1-business-recovery-case-r1.json)固定八输入角色、七字段返回模板和一次合成执行上限；SHA256 `d32b388980d940c98eead66c76ad0e33b51a5b5186f9fc0ca8dc91a6981c496d`。它是方案输入，不是生成稿/业务JSON/专业用户接受或已选公开素材；实际run/revision/hash待服务产生，不预填或手写状态。
3. [首发技术事实](../../release/m06-public-0.1.0-rc.1/TECHNICAL-FACTS-R1.md)、[RL01—09当前清单](../../release/m06-public-0.1.0-rc.1/FIRST-RELEASE-CHECKLIST-R1.md)与[状态JSON](../../release/m06-public-0.1.0-rc.1/first-release-checklist-r1.json)列准确构成、入口/环境、许可/第三方、已证/未验、安装维护保全与未发送交接边界。
4. [123逐件清单](../../release/m06-public-0.1.0-rc.1/member-inventory-r1.json)保留原成员path/bytes/hash/role/sourceHash及本轮归档、安装、原解包比较。全部新件是归档外sidecar，tgz仍123成员，未重包或改原manifest。

## 只读核对结果

[member-identity-check.json](member-identity-check.json)证明归档a7cf9a5d与原冻结清单7155d348一致，123归档成员逐字等于061d安装c3及原解包副本。原109件自有源码/合同/patch及另2件派生前工作区输入均保持，两个公开import派生仅在原发行副本；没有新源码改动。

source map的51份自有正文等于归档源，17份Zod来源标识保持；许可正文5127ea77与正式采用原件逐字一致，原MIT两通知配对。成员分类109＋2派生＋3资源＋5元数据/通知/许可＋2构建＋2 MIT＝123。这里只复核准确身份/内容相符，不重跑原142归档检查或193/34等业务/机制测试，不重做构建/安装/启停。

恢复方案直接核现公共服务和测试中的接口及错误边界。当前零模式四项RPC不含业务稿创建/修订/审核/保存，因此最小方案使用未来独立SDK合成场景；不开放现预览白名单、不手写snapshot，不以提示词或旧fixture冒充实际DomainFacility。未来新根SDK试验也不等App/Host/UI业务恢复；当前061d零模式若要正常业务UI仍需准确另版受控配置/组合及授权，不在此把该门假定已满足。

## EXEC-R2、保全与复审

[preflight.json](preflight.json)记录66项基线，[补充输入](supplemental-inputs.json)绑定实际DomainFacility历史构造及新安装c5公开provider接口，仅静态读取。整体1.3.1/NS1-R1、协同1.2.2及BM1-R1/S1/S2-R1/G1/GH1适用关系保持；两层current_followup仍S2-R1。相对R4读取前身份，仅三项导航已由R4明确接续，核其R4实际after hash，无未解释核心输入漂移。根中心路径/合同角色和BM1 roles_id接续按实际schema核对，未改中心文件。

原R3/R4、采用/固定稿接受、UNKNOWN、旧归档/安装及其他22保护件不改；四项导航修改前完整字节保存在before。准确命令/退出结果、链接与保护核对见[verification.json](verification.json)。当前HEAD和相关未提交身份见[git-identity.json](git-identity.json)，本轮不提交或推送。

作者自查重点：预览清空与业务恢复分开；新样例不继承旧稿接受；当前123与原140采用处置不混同；同版新根/SDK不继承旧App接受；旧freeze中的false字段不重签；无真实新版本不造升级/回退。单代理作者复审，不称独立审计。

一次身份核对辅助脚本因系统Python3.9不支持`zip(strict=...)`停止；改为明确等长断言后普通zip，随后只读核对退出0，见member-identity-check的helperCorrection。无产品模块执行、业务记录写入或请求重试；该辅助兼容错误不记成产品FAIL或运行恢复证据。

## 完成与下一步

R4-01的方案/新样例/授权差异准备，以及R4-02的技术事实/当前RL清单/123逐件身份已完成。R4-01实际SDK恢复、原生业务恢复、完整R3-03/F、真实新资源生成/专业用户接受、独立法律复核、远程Fast39源准入/三方绑定和发布仍分别未完成。

下一具体对象为方案中新根061d/a7cf、一次合成执行及公共接口业务写入/工程审核/无覆盖保存/SDK冷重读的离线实施范围；它不需要App启动或真实模型，也不沿本次准备自动执行。原生/UI、真实费用及发布另按准确对象办理，不重复询问已定许可/固定稿接受，不为缺件重刷无变化测试或新造诊断平台。

本轮未创建拟用根、安装、业务稿/运行/审核/保存记录或恢复运行器；未启动应用、调用模型/API/上传/费用、登录/迁认证、源CI/B/A、WorkBuddy导入/投递、自动任务、提交/推送/部署/发布。事实材料仍未发送，接收方未读/未采用，不虚构交接回执。
