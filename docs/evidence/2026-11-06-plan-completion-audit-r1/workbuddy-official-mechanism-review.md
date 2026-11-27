# WorkBuddy用户入口：官方机制核查（仅材料）

2026-11-06，Asia/Shanghai。对应原R1任务6／R2 P6；Codex单代理，只读官方公开文档。没有安装、注册、调用、投递、创建新项目或发布。网页未声明本次所见文本的固定修订号，以下只记录访问时观察，不作为本机已安装版本的能力验收。

## 本次核实的事实

WorkBuddy官方用户文档描述了上传本地技能包的入口。该事实支持后续评估原生Skill承载M06，尚不证明现有M06容器可直接导入。[官方技能说明](https://www.workbuddy.cn/docs/workbuddy/From-Beginner-to-Expert-Guide/Function-Description/Skills-Market)

开放平台列明Skill的主文件及参考资料/脚本/模板结构，并列出名称、中文与英文展示/描述、版本和作者等元数据要求。references可由正文引用；脚本是可选项，不是本地业务必须另建执行器的依据。[官方开发规范](https://open.workbuddy.cn/docs/skill)

Connector是另一类扩展，可采用MCP或CLI方案，并有独立的连接配置及市场流程。它不是本仓库既有的内部会话投递队列，也不能由名称相同推定已具备专业API服务接入。[官方连接器规范](https://open.workbuddy.cn/docs/connector)

开放平台的公开上线还涉及开发者入驻、资质及平台审核。本轮不登录、入驻、提交审核或发布。[官方平台概述](https://open.workbuddy.cn/docs)

## 与当前项目的准确差异

1. 当前已验M06由绿洲Host加载嵌入资源，未作为WorkBuddy原生Skill安装。固定资源、旧pin及2项operator资格保持；不把整个历史/评价/运行容器复制为WorkBuddy包。
2. 官方扩展结构存在，不证明共同八输入、结果Schema、来源支持、人工审核、保存、项目归属和费用确认已经适配。模型轮次、工具权限、引用行为及版本恢复也需要本机准确版本的单独证据。
3. 纯本地Skill入口和后发收费服务入口分别核对；原DSH两来源合同不因WorkBuddy文档而修改。若未来使用Connector消费后台，原origin/账户/项目/UNKNOWN/费用与真实授权合同仍有效。
4. 中心登记的planned component仍为 `workbuddy-user-plugin`，执行者Codex、合同协调项目dsh-oasis，implementation_project/path/git_root为null。官方文档没有指定本项目的源码归属。现有 `workbuddy-bridge` 不自动改作该用户入口，不能为闭合字段补认实现目录。
5. 本机仅只读 `/Applications/WorkBuddy.app/Contents/Info.plist`，标识 `com.tencent.workbuddy.mac`、版本/构建5.9.3。准确原始hash见 `workbuddy-target-metadata.json`；未读配置、会话或凭据，未启动应用。版本字段存在不等于已测试导入、权限或模型行为。

## 可供下一步决定的具体落点

机制准备候选为官方本地Skill导入；后续收费服务是否采用官方MCP Connector另核。用户入口消费固定业务资源，资源制作仍归patent-distillery；不复制账户财务、Agent循环或通用宿主。

实现落点候选为既有DSH-Oasis中的独立消费包，例如 `packages/oasis-workbuddy-user-entry`，以原共同业务合同对接固定M06资源；当前未创建该目录或package。该路径是待绑定方案，不是已登记项目/已采用结构，也不是新UI已确认。绑定时需明确此包只承载WorkBuddy适配，与DSH包和内部桥接队列分别验证。

下一准确出口是所选机制/实现目录及本机目标版本的绑定记录，然后才形成对应最小适配合同。原P6此项目前为“官方机制已核，机制/目录尚待采用”，不记为用户插件已制作或上线。DSH首发不等待该决定。
