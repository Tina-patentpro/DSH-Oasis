# S3C 安全 Markdown 补丁离线准备

当前目标状态：STATIC_ONLY。

## 范围与合同

仅在 D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\.dsh-test\isolated-dev-20260913\source 准备固定 DSH 0.1.5-rc.1 补丁。未改正在运行的开发 app/Profile、日常 DSH 或主业务源。

- opt-in `allowRemoteImages=false` 时，行内/引用图片不得进入远程或本地图片解析器；流式状态须清空旧缓存并走带策略的完整解析。
- 缺省调用仍保持原生图片行为，不全局禁止日常图片。
- 同步覆盖 UI primitives 与实际 ASAR 内嵌前端的 Markdown 实现；输入 SHA-256 和每个替换锚点须精确匹配，未知版本及重复补丁直接拒绝。
- `resourcePolicyVersion=1` 供既有绿洲组件探测；未安装或能力缺失仍只显示纯文本。

## 本次验证

cmd.exe 执行私有 Node 定向测试：test/s3c-native-markdown-policy.test.mjs、test/s3c-web-markdown-policy.test.mjs，8/8 通过，退出 0。证据：候选 evidence/s3-check-1789391249182879000.json 与 .log。此前对应缺失实现的红测保留，不覆盖日志。

测试执行从固定上游提取的实际图片函数/组件逻辑；React hooks、JSX 和部分解析上下文使用测试替身。不能表述为完整 DOM、SSR 或网络安全验收。完整 SSR 尝试因缺失 clsx/anser 等开发依赖未能运行，保留 pending-ssr.mjs 和失败日志；未为测试自动安装依赖或假装该层通过。

prepare-s3c-markdown.mjs 仅新建离线产物，两个 node --check 均退出 0，输入再次复核不变。产物目录：
D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\.dsh-test\isolated-dev-20260913\delivery-s3c-markdown-20260914

| 产物 | 输入 SHA-256 | 输出 SHA-256 |
|---|---|---|
| ui-primitives.mjs | b66c9f456ed2fdd942622ccfea14f8151091047618c00ad7d629e4c442eabe46 | f22de5bf82bd08d67f83370fc54168fee02a66ffaa030b26453199a031851b4d |
| web-frontend.mjs | e8719e727fee91f681ee1d885c6d204f2309c8a3bee9742825ce526ebe06ef73 | b8c6ab9227f23b6586e5a3ac9054bbfcae6ed55247bddc8e68e58718b40c5fee |

manifest.json 的 installed=false，生成时间 2026-09-14T13:09:06.946Z。

## 尚未满足的接点

Better Sidebar 0.19.1 原生文件路线不同于 0.18.0：native/surface.ts 的 resource 打开只传地址及 line，native/index.ts 从文件地址只恢复 path。只复用旧 safePreview meta 与 editor-safe id 补丁会丢失策略；不得宣称 safeFilePreview，当前文件打开继续禁用。

下一步须完成原生路由的策略身份、去重、参数传递及安全查看器合同测试，再准备安装包。开发副本正常退出前不安装；安装前后核对备份、目标依赖和启动 pins。安装后还需实际 Desktop 富预览/恶意资源不自动加载/普通查看器不受影响的证据；不发送既有聊天草稿、不产生真实调用。S3 整体未完成，完整 Desktop 跨版本回滚也未由本次验证覆盖。
