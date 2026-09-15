# 固定开发组合：safe-native-files-2

`safe-file-preview.mjs` 是原候选补丁的逐字节副本。`upstreamHashes` 固定 11 项输入；`patchSidebarSafePreview(file, text)` 只接受对应原始内容，拒绝未知或已经打补丁的输入。两个分发入口、编辑器 chunk、源码和声明必须作为同一组合处理，不能仅替换一个入口。

本补丁提供安全文件独立资源身份、定向 Session 打开和不可降级的预览策略；普通文件查看器保持原功能。缺少安全能力时不退回普通预览。

本机原始输入：D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\.dsh-test\isolated-dev-20260913\backups\s3c-before-sidebar-20260915\home\profiles\desktop\node_modules\dsh-better-sidebar。

本轮主项目补丁重放与已安装输出的逐项 SHA-256：D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\.dsh-test\source-promotion-20260915\patch-replay.json。该本地备份仅用于验收，不是发布依赖；分发必须另行取得相同哈希的上游输入并满足安装批准及配对验证。

固定候选的五个独立集成测试与命令见 D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\docs\evidence\2026-09-15-source-promotion.md。旧版补丁目录保留，不混用。
