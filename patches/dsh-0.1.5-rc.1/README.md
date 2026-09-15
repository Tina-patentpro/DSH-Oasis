# 固定开发组合：Markdown 资源策略 capability 1

`markdown-resources.mjs` 原样保留候选的两项转换：原生 UI primitives 和 Desktop 嵌入 Web bundle。输入 SHA 在函数入口硬校验；输出提供 `allowRemoteImages=false` 与 `MarkdownText.resourcePolicyVersion=1`，普通调用默认不变。仅补一个模块不能代表嵌入 Desktop 已生效。

输入/已安装输出 SHA 与实际 ASAR 成员比对：D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\.dsh-test\source-promotion-20260915\patch-replay.json。

EXE/ASAR 配对过程及证据：
- D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\docs\plans\2026-09-15-s3c-asar-integrity-packaging.md
- D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\docs\evidence\2026-09-15-s3c-rich-pair-installed.md
- D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\.dsh-test\isolated-dev-20260913\delivery-s3c-integrity-pair-20260915-r2\manifest.json

固定 EXE SHA：216df683a70ea0de5e96bf3127b2b43c1646bd3858de42419a3a0327f653ff93；ASAR SHA：4bdb3227e26416fa4ba68969ce80461893441a57904ab3cce651a3f97d02f5c7。

完整性修改只更新原 EXE 资源中的固定长度 ASAR header hash；不得关闭 fuse、移除校验或独立替换 ASAR。历史验证保留 64 项资源、14 个非资源 section 和全部 fuse；不是签名/发布认证。本次只同步源码与重放，不重新制作或安装二进制。
