# S3C 原生安全文件打开：离线候选

当前安装验收状态：BLOCKED_WAITING_FOR_USER。离线构建和定向测试已完成；等待用户正常退出开发副本，未安装，不能声明 Desktop 文件打开已恢复。

## 合同与变更范围

仅修改隔离候选 source 内的补丁、测试及新建交付目录，日常 DSH、正在运行的开发 Profile 和主业务源码不改。

Better Sidebar 0.19.1 原生文件打开会丢弃旧 seed.meta；普通文件地址也会合并同文件视图。因此采用独立 `dsh-resource://better-sidebar-safe-file/` 地址，保持 session 归属，以不可变 contentId 恢复路径和 safePreview，不信任后续 navigation/record 对策略的降级。复用既有 editor 和带 key 的原生 Sidebar Slot，不替换结构单槽，不添加产品入口。

安全路径仅选择启用的内置 Markdown/code 的 fsRead 查看器，绕过自定义检测、媒体、HTML iframe、Mermaid 与图片重写。缺少原生 Markdown resourcePolicyVersion=1 时显示纯文本，不冒充富预览。安全编辑器内部文件导航继续走安全地址；侧向打开可能复用/聚焦同地址，而非创建底部分栏。普通文件路径不变。本合同不是恶意插件或操作系统级沙箱。

## 新鲜证据

执行器 cmd.exe；run-source-check.py 使用隔离私有 Node。

- 构建命令：`python .dsh-test\isolated-dev-20260913\run-source-check.py test/prepare-s3c-sidebar.mjs`，退出 0。生成 2 个源代码合同构建和 7 个 TS/TSX 语法产物，编译后 JS 检查通过。不是完整 TypeScript 类型检查。
- 定向测试：`--test test/s3c-sidebar-safe-file.test.mjs test/s3c-native-markdown-policy.test.mjs test/s3c-web-markdown-policy.test.mjs test/sidebar-target-contract.test.mjs`，24/24，退出 0；证据 s3-check-1789393136401212700.json/.log。
- 新鲜保全校验：s3b-before-s3c-sidebar-verification.json，34476 项文件检查，failures=[]，退出 0。主业务源、日常/旧副本程序及候选既有固定包的边界以该检查器覆盖范围为准，不宣称所有实时用户数据已静止。
- 编译函数的执行使用 VM、模拟 hooks/JSX/transport；新构建 service 与 Oasis coordinator 有实际接线测试。不是完整 DOM、网络或 Desktop 验收。旧普通页面回归构建仅证明原合同，未冒充新补丁安装证据。完整 Markdown SSR 仍待验证。

安装前检查额外发现发布包还包含 client-registry.js 兼容入口，同步应用相同补丁；两个入口除模块名、source-map 名称及 CSS 对象键顺序外全部比较一致。最终补丁是 **11 文件**，不是先前准备的 10 文件。最初红测及 CSS 键顺序造成的比较失败日志均保留。

最终产物（manifest installed=false，revision=safe-native-files-2）：
D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\.dsh-test\isolated-dev-20260913\delivery-s3c-sidebar-20260914-r2

manifest.json 逐项记录输入/输出 SHA-256。旧 delivery-s3c-sidebar-20260914 保留历史，不作安装目标。每个输入必须精确匹配，重复补丁/未知字节拒绝；构建再次核对安装源未变。

## 下一批执行与停止条件

1. 用户正常退出开发副本，随后只读核对候选 app/private Node 均不存在；日常无需退出。不强杀进程。
2. 创建新的退出态完整备份，包含 home/userdata/workspace-a、b 和启动/pin 文件；旧备份不覆盖。
3. 检查目标路径、无重解析点、输入哈希、r2 输出哈希及启动锁；仅安装 11 个 Sidebar 文件，并在备份后更新候选 dependency pin 对应条目。包元数据、锁文件、Profile 安装 pin、Desktop/DSH 二进制均不变。不执行包解析或自动升级。
4. 验证其余固定文件与受保护边界；通过原启动器检查后重开开发副本。检查 A 既有结果/审核/文件哈希不变，由用户点击“打开当前文件”验收；不发送草稿、不生成新结果。
5. 本批富 Markdown 保持纯文本降级；Desktop/DSH Markdown 二进制补丁与完整资源安全 UI 证据另批处理。任何未知文件漂移、进程在运行、备份不一致或 pin 不匹配均停止安装，不覆盖未知变更。

本轮单代理自检，无独立审查。S3 整体、真实模型/API 和完整 Desktop 跨版本回滚均未据此完成。
