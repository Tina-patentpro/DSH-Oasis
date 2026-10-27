# DOCX缺省样式类型回归夹具

28份公开合成DOCX，固定ZIP_STORED/2000-01-01条目时间和manifest原字节SHA256/长度；生成只用固定Python标准库。前18份承接本轮全面复审的同字节边界，另有10份显式使用/普通覆盖/基样式链、非法及非段落类型对照。测试不依赖已有.local、Codex库或产品Host。

省略w:type按paragraph处理：1/true/on默认非零编号拒绝；0/false/off未使用声明保留，显式pStyle使用非零编号仍拒绝；段落/叶样式numId=0取消及普通显式样式覆盖保留。基样式也可合法省略type。character/table/numbering声明不能因此被当作段落默认，空值/未知type不静默成为未使用声明。

原19+20正式测试及旧夹具不改。本组运行独立离线检查器，不grep合同/代码，不声称产品已支持DOCX、D1部署或完整资源机制。
