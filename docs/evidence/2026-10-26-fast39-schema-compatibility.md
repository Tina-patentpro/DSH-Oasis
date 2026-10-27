# 实际Fast39与旧首模板合同的兼容核对

从已经捕获的原详情响应`48954.189`补取schema字段描述及全部键名，没有新增后台请求。输入8项及输出1项的键名均只有`type/cn_name/content/en_name`，未提供required或其它约束键；[完整允许字段快照](2026-10-26-fast39-actual-schema.json)SHA256 `d9c59544a4229cd3ca21f0e0814f224f5023e4f2b9cd86fdcdc011ab04f3a3c8`。该快照只保存服务描述，不含凭据/header。

固定Node调用现有`normalizeApiDetail`、`matchesReleasedFastContract`及`canonicalJson`退出0，[机器结果](2026-10-26-fast39-schema-compatibility.json)：去价格合同hash `4adaf95b2e1579bf495eb9ff79966a5ae6404cd0ee89f79dde352fd97a929303`，与`oasis-fast-contract.js`已固定旧合同一致；含观察价格3元的schemaHash为`4a3fde3d22dccba44771920f15ae56bc9512f1dcd875a472d211be4962870575`。没有为了通过而改hash或兼容代码。

这消除了“目前Fast39是否已偏离旧首模板已审schema”的不确定性；没有消除**新版M06共同八输入及结构化结果**的缺口。API的8项字段是技术方案/技术领域/背景/效果/实施方式/附图/交底文件/用户指令，不能因数量同为8就当作M06的前序累计文稿/交底文件与正文/附图文件与正文/撰写要求文件与正文/用户指令的无损合同；`output`单正文也不等新版结构记录及风险/问题已评价。

实际User_input描述要求额外输出偏好，不应塞入正文/核心原材料。本次公开校准把交底送technical_solutions、额外要求送User_input符合该字段分工；其它新版字段及上游结构尚无确认映射。旧映射兼容、网站单次成功和新版来源启用分别记录，来源仍禁用，无新真实请求。
