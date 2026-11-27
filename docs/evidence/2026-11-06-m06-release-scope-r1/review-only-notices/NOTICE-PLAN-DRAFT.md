# 第三方通知随附方案（审阅草案）

2026-11-06；本目录是本地发行准备附件，没有替换项目现行通知，也未取得公开发布接受。对应[本轮范围](../review-return.md)及[原始身份证据](../third-party-evidence.json)。

| 组件 | 已观察的使用范围 | 原版权与许可 | 本次原字节全文附件 |
|---|---|---|---|
| cn-patent-drafting，记录提交9be95a93c096d682f1a72613725cda990c2ef594 | 当前M06 0.1.3原NOTICE的CAND-CNWRITE-01—07，编辑方法改写使用；原逐用途边界保留 | Copyright (c) 2026 Huang Xinzhe；MIT | [cn-patent-drafting-MIT.txt](cn-patent-drafting-MIT.txt)，1090字节，SHA256 `010444fa8759a89fc9b6c9d90ecbd331075f75a487fa09dc6802627f9e12c83d` |
| Zod 4.4.3 | 当前lib/client.js的source map内17个Zod源成员；同时有服务端对zod的导入 | Copyright (c) 2025 Colin McDonnell；MIT，以实际包全文为准 | [zod-4.4.3-MIT.txt](zod-4.4.3-MIT.txt)，1072字节，SHA256 `3f1189b28e3866e0d979968d466b78f813f76827cfdca1fbb124cc0a5c8841f8` |

cn-patent-drafting全文从当前已固定M06通知的verbatim块提取，保留CRLF及末尾换行；Zod全文从本机固定4.4.3包读取。两份均按原bytes复制，未改版权年度、署名或正文。原始THIRD-PARTY-NOTICE还包含七条源文件/行区间/片段hash与逐用途条件，必须连同其适用边界保留；两份单独MIT全文不替代这些用途说明。

拟正式随件时，清楚区分 OasisIntWrite Community License 1.0 覆盖的自有部分与第三方原许可部分。社区许可目前仍是[草案](../../../business-baseline/oasisintwrite-community-license-1.0-draft-r1/LICENSE-DRAFT.zh-CN.md)，本方案没有把MIT部分重新标为社区许可。

本目录未盘点所有第三方：DSH、Desktop、Sidebar、Cordis、其他peer/build依赖、现有旧Skill/目录、官方资料及图标/示例等按实际发行构成分别核对。构建外置的依赖与实际打入客户端的代码分别表达；仅记录peerDependencies或lock不证明未被捆入，也不证明已取得全部分发权。

原六载体PENDING_EXCLUDED继续排除；许可文本随附不改变规则试行效力、来源采用、专业审阅或发布状态。实际发行时应核附件确实被包包含；本轮未运行pack、改files字段或制作安装包。
