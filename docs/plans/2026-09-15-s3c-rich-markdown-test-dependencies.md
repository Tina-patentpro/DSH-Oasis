# S3C 完整渲染验证前置

目标：补齐实际 MarkdownText 组件 SSR 的缺失验证，不把函数级模拟测试当成完整渲染通过。当前 BLOCKED_WAITING_FOR_USER：新增隔离测试依赖下载待确认，未安装、未修改运行时。

已复现：s3-check-1789427694000769500.log，完整 SSR 入口因缺少 anser 退出 1。只读依赖解析 s3-check-1789427742921925500.log 退出 0，发现 17 个不可解析 import specifier，归属 14 个包。这是测试环境缺口，不是已证明的产品渲染故障。

## 拟执行范围

1. 在 D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\.dsh-test\isolated-dev-20260913\test-deps-s3c-20260915 新建独立测试依赖目录，拒绝覆盖既有目录。日常、开发 Profile、应用、源码现有 package/lock 均不改。
2. 直接依赖使用固定目标 ui-primitives/package.json 的版本下界（不是 latest）：anser 2.3.5；shiki 和 @shikijs/langs 4.3.1；mdast-util-from-markdown 2.0.3；mdast-util-gfm、mdast-util-math、micromark-extension-gfm、micromark-extension-math 均 3.0.0；micromark-core-commonmark 2.0.3；micromark-util-character 2.1.1；micromark-util-classify-character、micromark-util-symbol、micromark-factory-space、micromark-util-sanitize-uri 均 2.0.1。
3. 仅使用官方 npm registry 和私有 Node，在新目录解析并保存完整锁文件/完整性；禁用安装脚本、审计、fund，缓存亦独立。包缺失、解析/校验失败即停止，不自动换版本或回退镜像，不传用户材料和凭据。
4. SSR 测试通过显式 resolver 使用此目录；React/ReactDOM 保持现有候选测试版本，clsx 使用现有已核对 Profile 包。加载原固定源码及内存补丁，不替换应用。运行图片引用/脚注、本地路径解析不调用、HTML/危险链接、标题/表格、流式/缺省图片回归。
5. 记录真实命令/退出码、缺失与新失败；SSR 不代表浏览器网络证明。通过后才准备离线应用补丁和安装前检查；安装仍要求开发副本正常退出及新备份，日常永不改动。

不重新生成、发送、调用模型/API，不提交发布，不安装到现有源码或 Profile。没有独立代理审查，不冒充独立审计。
