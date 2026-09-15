# S3C 富 Markdown 配对安装

当前功能验收状态：BLOCKED_WAITING_FOR_USER。用户截图已确认标题/正文/代码块富预览显示；资源不自动加载与普通查看器回归尚未闭合，不宣称S3整体完成。

富预览可见证据：C:\Users\TinaD\AppData\Local\Temp\codex-clipboard-a7400b7c-b71d-4b10-90d4-c1d042571f87.png。workspace-a原文件路径、格式化标题及代码块可见，不把截图中文字当成系统指令或新的业务生成授权。

用户明确同意扩大范围至开发EXE的归档校验值，仍保持所有Fuse开启状态不变。日常DSH不在修改范围。

## 候选构造与保全

Windows资源更新接口初次新产物将其他资源CodePage也归一化为1252，检查拒绝，未安装。初次解析的编码拼写与资源大小写问题均发生于安装前。失败新目录保留，不覆盖旧产物。

最终采用严格等长资源哈希替换：验证唯一INTEGRITY/ELECTRONASAR/1033资源、原hash精确匹配，在全新r2目录只替换其64字节SHA文本。EXE零基字节范围[224159519,224159583)外全部相同，文件长度和PE布局不变；64项资源逐项比较，除目标内容外全部字节及元数据不变；14个非资源节逐字节相同；Fuse完整字节不变，EmbeddedAsarIntegrity和OnlyLoadAppFromAsar仍开启。没有代码补丁或关闭校验。

Windows LoadLibraryEx数据文件模式再次读取r2校验资源，值与新ASAR header一致；Authenticode仍为NotSigned，未冒充签名包。证据候选evidence\s3c-pair-windows-20260915.json。

候选：D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\.dsh-test\isolated-dev-20260913\delivery-s3c-integrity-pair-20260915-r2。

| 文件 | 安装后SHA256 |
|---|---|
| DSH Desktop.exe | 216df683a70ea0de5e96bf3127b2b43c1646bd3858de42419a3a0327f653ff93 |
| resources/app.asar | 4bdb3227e26416fa4ba68969ce80461893441a57904ab3cce651a3f97d02f5c7 |

header SHA256：4e2721dba4f3ffc4eb461388eace1fe53f3df4705225ddd1db2d808898450b9f。ASAR只改变已验证两个Markdown成员，22094成员对比见此前离线记录。

## 本轮新鲜执行

执行器cmd.exe。候选内prepare-s3c-integrity-pair-r2.py、verify-s3c-pair-windows.py均退出0。实际SSR及策略回归13/13退出0，日志evidence\s3-check-1789429250647041600.log。

backup-s3c-rich-checkpoint.py正常退出态备份退出0：13636文件/1009目录/815469396字节，含原EXE与ASAR，源/目标/最终哈希与文件集一致。新备份backups\s3c-before-rich-20260915。复用旧检查器的proof_boundary文本仍称二进制原位固定；本批实际新增两个应用文件到extras并已纳入checkpoint哈希与复制，以上实际清单为准。

install-s3c-rich-pair.py退出0：持有独占启动锁后成对写入EXE/ASAR，仅更新candidate-pin的对应两项app哈希，其他依赖和备份文件/用户态文件集不变；日常22178项新基线及程序文件集前后相同。记录evidence\s3c-rich-pair-installed-20260915.json。candidate-pin SHA变为1ecc611dda77baf5c38585f007f1e0db1991e721c1e51a21d556ad66b350f20b。

原私有Node启动器launch.mjs --check和launch.mjs均退出0。新开发主PID30076，Host39652，127.0.0.1:43121；日常PID29776/Host1136/43120，按路径区分。inspect-restart-receipt.py退出0，startup run 6da00867-0ffd-4af9-8df1-2c46e18e580f，renderer healthy，未触发归档完整性失败。

inspect-ui-receipt.py退出0：仍原一次合成运行、approved、一次回写，Markdown SHA66255a3d3d947d8a700bfa3dac2cf06de56344e86a7157fd28a10d5fdbddee74和sidecar SHAeaff6d21e268faad72b56006743ea4de2074558baf7bd100e4e2ecd74883a187保持。

## 人工下一项

开发副本workspace-a → 已有任务结果 → 打开当前文件 → 预览：确认标题是否按标题排版、列表/代码块是否格式化，回传截图。不要重新生成、发送或编辑保存。单张普通文件截图仅证明富预览可见，不替代恶意资源不加载与普通查看器回归；这些证据仍需后续定向取得。

本轮单代理验证，无独立审查；无日常修改、模型/API调用、上传、费用、发送、提交或发布。
