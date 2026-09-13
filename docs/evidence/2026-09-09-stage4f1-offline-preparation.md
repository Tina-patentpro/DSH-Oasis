# 4F-1：0.2.1 资源修订与离线验收准备

日期：2026-09-09。基线提交：680a500505feea9f338d406a48c4484bc49ac3e8；开始时工作区干净。授权：用户对 4F/4G 分步计划回复“同意执行”，先执行无需真实调用的 4F-1。

## 结论

**STATIC_ONLY**（4F/4G 整体）。4F-1 离线准备已完成；未启动 Desktop、未调用真实模型/API、未形成真实起草质量或新版实际窗口证据。替身运行的 native-model 仅是代码路径身份，不是实际模型证明。单代理自检，不是独立审计。

## 业务交付

- 新增正式 flow-2-6/0.2.1：修正版本标记、上游实际输入约定、合同尚未接入及 G-SKILL 等过时工程状态；起草步骤、参考规则、案例和三个执行合同保持不变。去除输出模板中“当前合同尚未实现”的历史工程判断，不新增大文件支持承诺。
- Host 当前 pin 与新运行准入更新到 0.2.1；存储同时接受 public-4e2-1、0.2.0、0.2.1。旧真实路径记录可读，但不将旧资源用于新真实调用。
- 核对摘要携带实际资源 ID/版本，统一 UI 不再写死 0.2.0；累计文稿按运行来源版本标注。旧资源/旧记录不迁移、不覆盖。
- docs/fixtures/stage4f1-claims-synthetic-input.json：四字段纯合成防护罩交底，共 1111 字符；上游缺失，无客户信息或附件。不要求先生成具体实施方式，不提供期望权利要求答案。
- docs/fixtures/stage4f1-claims-quality-checklist.md：人工核对正文、联锁技术关系、从属引用、事实来源与缺项、风险及用户可用性；该清单不发送给模型。

## 验证账本

执行器 cmd.exe；Node v22.19.0。包命令工作目录为 D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\packages\oasis-professional-service。

| 检查 | 结果与边界 |
| --- | --- |
| 新增升级测试与 native-model 定向测试首次执行 | 8 项中 5 项预期失败，退出 1：旧资源版本、写死产物/确认文案及资源升级指纹；实现后通过 |
| 定向 node --test test/claims-skill-upgrade.test.mjs test/formal-claims-skill.test.mjs test/native-model-service.test.mjs test/builtin-skill-loader.test.mjs test/oasis-runtime-config.test.mjs test/host-tool.test.mjs test/host-runtime.integration.test.mjs test/oasis-connection-settings.test.mjs | 43/43，退出 0；默认关闭、显式确认、输入/配置/资源变化失效、未知不重发及历史兼容 |
| 最终 npm run verify | 构建成功、378/378、pack dry-run 84 项，退出 0；包含最终 0.2.1 资源 |
| 根目录 node --test tests/integration/stage4e6-native-model.test.mjs（最终资源后再验） | 2/2，退出 0；固定 DSH 0.1.2-rc.1 原生 llm + 禁网测试提供方，单次替身生成、编辑再审、实际临时目录无覆盖写回、对话资料准备；非真实模型/窗口证据 |
| 合成材料合同检查 | claimsV2DraftValuesSchema 实际解析通过，四字段字符数 749 / 151 / 88 / 123；未发送 |
| 旧资源保全 | 0.2.0 manifest 固定指纹及四资源 SHA 全部一致，旧资源目录 Git diff 为空；升级测试读取历史记录不改变序列化内容 |
| git diff --check | 退出 0，仅已有 LF/CRLF 提示，无空白错误 |

最终 verify 原始日志：D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\.dsh-test\stage4f1-verify.txt。沿用 tsdown 对 deps.onlyBundle / zod 的既有提示，没有调整依赖或打包策略。新增五个版本资源使 pack 从 79 到 84 项，不是业务进度指标。

## 最终指纹

- 0.2.0 manifest：63254666e5e1af582b2251423a003686cc2f112f655b35ed088900fbb5cdaaa1（未变）。
- 0.2.0 assembly：163422ff13f4cf4b92b47ba6b696ca49fa22f2bbfa0edb3299ad7924faf7660d（未变）。
- 0.2.1 manifest：d472b4b7a7b74d5223e95513dd1175927e8b9766e392d47a4910c8ce4f0c8dbf。
- 0.2.1 assembly：2bb420ecee36acfa199d47b00d87671265f6602efc48eb1b2c425da604ff7846。
- 合成输入 JSON 文件 SHA-256：4926d03d74c9f7dbfce3f61543b14b1c7c1384bb77ce1415044051b62f8a0ea6。运行时确认摘要由实际四字段/模型/资源/上下文计算，不拿文件哈希代替运行摘要。

## 保全与后续门禁

没有启动 Host/Desktop、改真实 Profile、配置凭据或真实调用。本轮未重复旧 20533 项 Profile 哈希核验，不把旧证据当作本轮验证。测试只新建隔离临时目录，未打开或迁移既有验收任务数据。原 authoring 文稿未改；未提交、推送、发布。

4F-2 须用户确认实际提供方/模型/材料接收方、上述四字段及内置 Skill 外传、最多一次调用与费用上限。凭据只在原生设置填写。预算不可确认时不调用，本地超时不承诺取消计费。4G 使用该次真实结果完成实际窗口审核/保存/打开/重启/对话草稿验收，不自动发送或重复生成。两阶段没有完成；专业 API 与发行验收不属于本批。
