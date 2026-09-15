# S3C 安全/普通预览资源对照准备

## 第三轮最终验收

当前限定目标状态：PASS。用户分别回传第三轮安全页和普通文件入口截图，均显示r3文件标题与正确路径。03:00:55Z实时读取时服务器健康、未到期、文件SHA不变，safe=0，ordinary=3；普通请求为html.png、inline.png、reference.png，均在03:00:37Z发生，构成同一存活计数器的图片正对照。安全图片仅替代文字、HTML/iframe为文本、富标题/表格/代码块可见。结论仅限这些回环HTTP测试资源及该普通Markdown查看器，不泛化为所有网络通道/所有查看器安全审计。

第二轮到期且无普通正对照后未误判通过；第三轮使用全新r3目录和/round3/资源地址，服务器127.0.0.1:10209。验收记录保留在 D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\.dsh-test\isolated-dev-20260913\evidence\s3c-resource-check-20260915-r3\acceptance.json，包含两张用户截图绝对路径、实时健康、计数及全部请求时间。finish-s3c-resource-r3.py重新读取后归档，退出0，已通过stop文件正常停止服务器并确认stopped.json。旧轮及第三轮测试文件/日志均保留，不修改历史记录。

inspect-ui-receipt.py新鲜复验退出0：原任务仍一次合成运行、approved、一次回写，Markdown及sidecar哈希均保持。未生成/发送、未改原材料或日常程序；用户之前新建的空任务不删除。完整项目升级/发行回滚未据本轮宣布完成。

## 第二轮最新状态

用户确认第一轮safe.md曾从普通入口打开，原日志于01:12:28Z记录4次/safe/请求，01:14:57Z观察服务器已到期。该轮受入口混用影响，既不能认定安全预览失败，也不能判通过；原文件与日志保留。

用户批准第二轮后，只新建workspace-a\s3c-resource-check-20260915-r2及evidence同名目录，资源URL含/round2/前缀，避免旧页/旧端口请求混入。服务器PID3248，仅127.0.0.1:2758，2026-09-15T01:57:35Z启动，30分钟自动到期。start/read-s3c-resource-probe-r2.py均退出0，healthy=true、safe=0、ordinary=0、文件哈希不变。零计数是测试前基线，不是验收。

先只从已确认的安全文件页顶部路径框打开第二轮safe.md并截图，再读取健康与计数；取得此证据后才指引普通入口打开第二轮ordinary.md作正对照。未取得双侧证据前仍为BLOCKED_WAITING_FOR_USER。不更改原审核文件、应用或日常DSH。

当前目标状态：BLOCKED_WAITING_FOR_USER。计数器已健康启动，尚未取得实际页面打开和正对照，零请求不能判为通过。

当前开发进程路径已重新核对：PID24404/Host31760/127.0.0.1:43120，run278f85d2-3cbd-4a62-acff-91d6a81c7aa9，renderer healthy。没有观察到旧日常路径的进程，不能沿用上轮“双开”结论。首次只读进程脚本因PowerShell编码解析失败，显式UTF8输出后退出0；未修改应用或配置。

浏览器能力探索：本轮工具列表无可直接控制已登录Desktop的浏览器连接工具；本机npx存在，但不为此自动下载浏览器工具或提取凭据。采用人工原生路径操作和回环请求计数，明确不冒充自动化浏览器验收。

## 最小测试合同

- 仅新建workspace-a\s3c-resource-check-20260915内safe.md/ordinary.md，原审核文件不动。
- 每份包含标题/表格/代码块、Markdown行内与引用图片、原始HTML img/iframe，所有资源仅指向127.0.0.1固定测试响应，无外网，无脚本，无用户材料。
- 临时服务器只接收固定资源路径及health，不提供文件系统、不记录headers/凭据。绑定127.0.0.1:5316，PID36912，2026-09-15T00:44:47Z启动，最多1800秒，stop文件亦可停止。后台CREATE_NO_WINDOW启动，健康检查退出0。自动到期后不得把断服务导致零请求当作通过。
- 证据目录 D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\.dsh-test\isolated-dev-20260913\evidence\s3c-resource-check-20260915；server.json固定文件SHA与端口，requests.jsonl只记录时间/测试路径，read-s3c-resource-probe.py读取健康/计数/哈希。

## 人工操作与判据

1. 从绿洲结果“打开当前文件”进入的已验证安全文件页，在顶部原生路径框输入safe.md完整绝对路径并回车，保持预览，回传截图。实际已安装EditorHost.tsx的路径输入onOpen走safePreview分支，调用openFile(...,{safePreview:true})，不是直接改不可变地址；不依赖猜测文件夹图标用途。
2. 再从普通文件入口（功能中心“文件”，不是安全文件页路径框）打开ordinary.md，回传截图。普通Markdown图片至少产生一个请求作为对照；未出现请求则继续排查，不能判安全通过。
3. safe资源计数必须为0，ordinary正对照大于0且两页实际展示对应文件。此为本机HTTP资源类别证据，不概括为所有网络通道或完整安全审计。每次验收须核对计数器健康、超时状态及文件hash。
4. 收到证据后停止本轮计数器，保留测试文件和日志。无需重启、重新生成、发送、编辑保存、修改Profile或日常DSH。
