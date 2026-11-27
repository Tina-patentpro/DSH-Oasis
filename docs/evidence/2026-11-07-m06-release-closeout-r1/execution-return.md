# M06首发许可、公开范围与同版发行清单材料收口 R1

2026-11-07，Asia/Shanghai；Codex单代理。执行用户“按计划继续推进，完成首发许可、公开范围与同版发行清单收口，暂不进行真实调用或发布”。本轮完成可审具体材料，不更改运行资源、pin、包字段或安装物，不把许可准备代作正式采用/法律复核/发布。

## 已交付

| 交付 | 准确对象与范围 |
|---|---|
| [采用决定候选](../../release/m06-first-release-r1/ADOPTION-DECISION.md)及[完整许可](../../release/m06-first-release-r1/LICENSE-CANDIDATE.zh-CN.md) | 许可人来源OasisIntWrite、代表人Tina D、联系TinaD.qd@outlook.com；本批2026版权通知及拟采用日期2026-11-07。九节权利义务与原草案逐字一致，没有另改普通使用/成果商业交付与收费平台/API/商业托管边界 |
| [140成员处置](../../release/m06-first-release-r1/release-manifest.json) | 精确绑定已验5160c4e9业务归档/7aca55e9安装及各原成员hash；111件自有源码/合同/patch选择项、20内部兼容资源、2原混合容器排除直接公开、2构建内部保留、API基线与private元数据各1内部保留、1通知派生、2原MIT全文。合计140，不遗漏新增Fast39/只读预览增量 |
| [公开资源投影](../../release/m06-first-release-r1/public-review/PROJECTION-MAP.json) | 独立版本m06-0.1.3-public-review.1；8件载荷与2件operator审阅说明，只有6件发生定位符转换，4件原字节相同。20个本机源定位符变为便携标识，原路径映射只在本证据目录，不进公开审阅集 |
| [同版首发清单](../../release/m06-first-release-r1/RELEASE-CHECKLIST.md) | RL01—09分别绑定资源、规则试行、原固定稿受限接受、示例/公开范围、许可、包/版本、原生限定验收、费用及发布；已有接受和实际新组合UI不再写“尚未提供” |
| [21成员审阅文件清单](../../release/m06-first-release-r1/public-review-files.json) | 许可候选、10资源投影/映射、原MIT通知、四件原公开自编示例输入及准确说明；没有模型输出、评价答案、客户材料、Profile、运行回执或宿主/依赖。不是可安装/可导入/可运行包，也没有把111件源码复制成完整运行源码分发 |

本地审阅ZIP：`/Users/tinadong7036/Documents/开发项目/DSH-Oasis/.local/m06-first-release-review-20261107-r1/oiw-m06-public-review-r1.zip`；SHA256 `cadf07dca01d5ace8cb204cac9650d8ddcec5c8efaeef6d7c2afbd8c7d847ce1`。

许可候选SHA256：`5127ea772ba201b71404949456ebf43a193f79d1b0161f8e65172873d6ffc1f4`。140成员覆盖清单SHA256：`5e067f4344211995803e7154fbde312b31319311e5b1ca157c6abb6f8cd29ab8`。三者在[采用快照](adoption-snapshot.json)冻结；不通过后续改expected重签原包。

## 公开投影与许可边界

原0.1.3容器/资格仍为内部固定原件；投影不是新的有效运行资源，也没有将资格转成生成输入。每份投影留原嵌入路径、原sha、新sha、字节数、角色及变更类型；将20个便携标识按内部映射逆替换后，10份正文均精确恢复原文。HISTORY_LIMITED、PENDING_EXCLUDED、旧失败、来源hash和规则试行均保留；只改定位符，不删除不利事实或改接受结论。定位符不承诺自动下载，不读取其指向的源库或六载体正文。

MIT的两份原文分别适用于Zod4.4.3及七项cn-patent-drafting方法片段；版权、年度、许可原字节不变，自有增量与第三方原有部分分别表达。实际配对客户端source map中的17项Zod源码重新核对数量；完整依赖树/宿主未选，不把两项通知扩大为全Host许可闭包。包级公开审阅通知仅更新采用候选状态和指向已附投影，原运行包通知不变。

自定义许可称“源码可用社区许可”，不称OSI批准开源；本轮只读核对[OSI定义§6](https://opensource.org/osd)。npm未来自定义许可字段的`SEE LICENSE IN`与附全文规则按[官方说明](https://docs.npmjs.com/cli/v11/configuring-npm/package-json/#license)核对；当前package仍0.0.1/private、license未声明，不修改或以MIT/SPDX编号冒充该自定义许可。

代码、Skill、工作流统一条款的方向保持；本次实际工作流DSL选择为空，不从其他项目找同名文件补进来。WorkBuddy私有候选没有导入/行为接受，不在本轮审阅ZIP。原18250e4c固定稿仍仅保留15警示的受限接受且不宜直接申请；本批不选其正文，不将接受自动转成公开或移授投影。

## 新鲜核对

[material-verification.json](material-verification.json)及[实际命令记录](verification-command-record.json)绑定本轮成功的内联Python检查：

- 实际140件归档逐项hash/分类；原134对应和新140范围分别登记。
- 10件投影逆转换精确回原，6件只改定位符；operator角色及历史限定保留。
- 许可第1—9节逐字等于原草案；只是页首采用资料/状态补齐，原草案原字节不变。
- 两份MIT全文、四件公开示例输入原字节相同，未加新模型答稿；17项Zod来源存在于实际配对map。
- 公开审阅集无本机绝对路径，MD本地链接可达，JSON均可解析；21成员ZIP CRC/成员集合/逐件hash与清单一致。

首次本地链接核对发现通知仍指向已排除的原混合容器；已将审阅通知改为指向实际附带资源投影，并说明原容器内部保留。相应生成器调整记录在[assembly-command-record.json](assembly-command-record.json)，没有改原运行通知。未重复构建客户端、重包产品、运行旧139/193业务测试、安装/启动App或真实调用。

## 读取、裁定与最终待决对象

[preflight.json](preflight.json)记本轮26项输入、根AGENTS/协同全文、登记与两层followup解析及实际适用章节；当前协同1.2.2、整体1.3.1/NS1-R1＋BM1-R1/S1/S2-R1/G1及S2-R1 followup不变，历史正文仅身份核对的不冒称全文已读。现分支/HEAD及未提交内容保全；旧运行包、安装、UNKNOWN、审核稿、R3和许可草案在收口检查中保持。

Ruling：按项目默认单代理及不覆盖旧字节约束，沿现有checkout/记录做材料装配和一次作者自审，不建新worktree、产品TDD任务或审计平台；不称独立代码/法律复核。Ruling：把公开投影另版作为审阅文档，不修改消费容器或继承原生验收；否则会错误地把公开材料清理当新运行包接受。

本轮状态为 **MATERIALS_READY_FOR_EXACT_OWNER_ADOPTION_DECISION**。R3-02明确“Codex整理，实际权利方/用户作决定”，原草案也将正式采用/法律复核与起草分开；因此尚须对上述准确文本及覆盖清单取得正式采用决定，不能由本次编辑自检补认。独立法律专业复核仍未取得，不能填写“法律审核通过”。这不阻本轮具体材料和技术清单交付，也不要求六载体或所有工作流先完成。

最终[verification.json](verification.json)确认26项输入、11件保护对象和4处状态补充；四份旧正文完整字节仍在，37处新增本地链接可达，分支/HEAD未变。中心[结构检查](coordination-check.json)exit0且仅为coordination_structure_only。最终链接检查先因校验器把带连字符的`oiw-source:`误认作本地路径而exit1；只修正校验器的URI识别表达式，审阅文件/清单/ZIP未变，复查exit0，见[实际命令记录](final-check-command-record.json)。

后续如需可运行公开发行，需另定实际产品版号、公开资源整合与同版构建/安装/消费证据，不能直接公开原140包或给本审阅ZIP贴旧UI通过。实际发布/推送/部署/WorkBuddy运营投递仍NOT_AUTHORIZED；没有真实模型/API/上传/费用或消息发送。应用保持退出；不恢复已清除的自动目标。
