# S3C 完整 Markdown SSR 与离线归档

当前目标状态：STATIC_ONLY。实际组件 SSR 已通过，未安装应用补丁，Electron 启动及浏览器网络行为仍待验证。

用户明确批准新增隔离测试依赖。cmd.exe 执行 prepare-s3c-test-deps.py，私有 Node 调用 npm，固定14个直接依赖，禁用脚本/audit/fund、空 user/global npmrc，独立用户目录及缓存。仅 registry.npmjs.org，实际解析95包，锁定完整 resolved/integrity，退出0。目录 D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\.dsh-test\isolated-dev-20260913\test-deps-s3c-20260915；锁文件SHA256 fb5dab7250262300d94d3f8b1096c78c4fdfbe70d11be9bbad95976b7f0fb6e8。现有候选/安装pin、Profile及源码package/lock六项哈希前后不变。未安装到任何现有 Profile 或应用目录。

测试只修改隔离源码内 pending-ssr.mjs 的显式依赖 resolver，实际 React/ReactDOM 与 MarkdownText/解析器参与 SSR，CSS 以空模块处理。5项完整组件测试退出0；随后加上原生/内嵌前端函数测试，合计13/13退出0。日志 evidence\s3-check-1789428143724286700.log，早先独立SSR日志 s3-check-1789428127494228800.log。覆盖图片/引用/脚注、流式与非流式、本地图片resolver不调用、标题/表格、原始HTML/危险链接以及普通调用仍有图片。不是完整浏览器布局、网络拦截或安装包证明。

只读归档核对两个真实成员与离线补丁输入完全一致；未安装app.asar SHA256仍为 f0bb5e285039adf18819c1026d9dabd6a6f604ca4f0d40cef45654aff684b0d1。证据 evidence\s3c-markdown-install-targets-20260915.json。

create-only构造新归档 D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\.dsh-test\isolated-dev-20260913\delivery-s3c-markdown-asar-20260915\app.asar：完整核对22094成员，仅ui-primitives/lib/index.js及web-frontend/dist/assets/index-DuF6ti6g.js正文改变，重算对应块完整性；其余成员字节、除布局offset以外元数据、unpacked/link元数据不变。新归档SHA256 4bdb3227e26416fa4ba68969ce80461893441a57904ab3cce651a3f97d02f5c7，manifest installed=false。首次归档长度断言把payload前缀算错，在写入前失败；修正为实际header四字节前缀后构造和逐成员比对退出0。此为单代理自校验，不是独立工具或Electron验收。

下一步：用户正常退出开发副本后，新建含当前Sidebar修补与文件标签状态的备份；先核对Electron归档完整性约束及新归档能否按现有启动策略使用，不为启动绕过/关闭安全校验。通过后才在候选替换归档及其对应pin；日常程序、EXE、Profile依赖均不改。未知完整性要求或目标漂移时停止，不能强行启动。需要真实Desktop富预览、资源不自动加载及普通查看器回归才关闭功能验收。不发送、不生成、不调用模型/API。
