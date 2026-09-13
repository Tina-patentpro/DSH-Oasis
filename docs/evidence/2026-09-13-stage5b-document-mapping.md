# 技术交底上传映射：本地切片证据

日期：2026-09-13。状态 STATIC_ONLY。用户批准上传文档方向及本批本地实现；未上传真实或合成文件至远端，未收费生成、启动Desktop、修改服务器、部署、提交或推送。

新增 src/claims-api-document.js：严格接收claims-disclosure-2四字段快照，拒绝额外/上游字段，防止静默忽略材料；技术交底不能为空白，所有字符串须为有效Unicode。原文UTF-8编码，不增加标题/BOM、不改换行或空格，返回内存txt文件及SHA-256，不落盘用户正文。

映射仅含Technical_Disclosure_file（document/remote_url）、drawings_explain_TD、User_input；后两项原文保留，撰写要求与用户指令用独立标题合并。没有自动拆章节或填写“无”等默认值。必须先有合法且在显式允许origin列表中的URL；复用已有文件URL策略，不扩大网络权限。

模块目前为未接线的纯Host函数，未添加上传器/重试器/存储或生成入口。未来接线必须冻结同一输入快照并绑定文档哈希与上传回执，不能把另一文档URL当作本次正文上传证明。

## 验证

cmd.exe，目录 D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\packages\oasis-professional-service。

- 初次测试因模块未实现无法导入；补导出占位后红灯明确2失败/2通过，退出1，原因Document mapping not implemented。
- 实现后原44项通过，退出0；增加已有uploadFile的FormData契约集成测试与非法Unicode断言。
- 最终命令：node --test --test-reporter=dot test/claims-api-document.test.mjs test/oasis-api-contract.test.mjs test/oasis-api-detail-legacy.test.mjs test/oasis-remote-service.test.mjs；45项通过、退出0。
- 新测试证明原文字节/CRLF/Unicode保留、输入不变、哈希变化、映射标题、空值无编造、缺URL/不可信来源/凭据URL拒绝及真实multipart客户端与内存fetch替身配合。既有remote-service测试覆盖上传未知失败不重传；不是新映射已接入该执行状态机的证明。

## 仍需完成

1. 实际服务是否接受TXT及省略其他章节字段尚未证明；上传成功也不等于正文参与生成。
2. 现有origin安全策略仍禁止lzhxpy.oasisintwrite.com；之前匿名详情取样没有改变这一事实。本批不修改该策略。真实接线前需明确批准线上现有服务的受控用途及最小域名策略方案，不能称其为非生产。
3. 账户/Workspace/后台项目显式绑定、冻结快照、上传回执与原执行状态机接线仍未实现。本地Skill与四选项卡不变；本批不开放API生成按钮。
