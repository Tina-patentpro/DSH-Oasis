# 历史附件中文 URL 校验修正

当前目标状态：**BLOCKED_WAITING_FOR_USER**。源码修正和安装后，用户重试的两个附件已有一个保存成功，另一个报IMPORT_REQUEST_FAILED；等待网站同一历史附件的下载对照，尚不能确定剩余失败根因。下文“尚未安装/等待重试”为此前记录，不将离线结果代替生产证据。

## 实际反馈与保全

用户截图 C:\Users\TinaD\AppData\Local\Temp\codex-clipboard-2ec3a29a-8c79-43ff-b88c-9e139e65ff38.png 显示5项中3个Markdown已保存、2个DOCX返回IMPORT_ITEM_CHANGED。

实际清单位于 D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\.dsh-test\isolated-dev-20260913\workspace-a\.oasis-import-0dc9273b-3c20-44f2-a198-669cd0a4e838.jsonl，而非此前建议的workspace-b。只读核对三份已保存文件SHA256均匹配清单intent；不移动或删除文件，不解除关联，不重新下载。未读取正文用于模型分析，未读取凭据或请求生产接口。

## 缺陷与范围

列表的legacyUrl以WHATWG URL.href存储规范化地址，而下载前直接比较详情原始file_url与该地址。原文中文和空格被编码时，即使源地址完全不变也误报IMPORT_ITEM_CHANGED，且发生在二进制请求之前。

内存fetch替身复现：ASCII附件5次只读请求后取得合成字节；中文附件仅4次元数据请求后误报变化。它证明代码缺陷，与实际两个中文文件名失败吻合；本轮未采集生产列表/详情原始URL，因此不排除这两个附件还存在其他服务端问题。

修正仅让详情也使用既有legacyUrl规范化后比较。保持域名/路径信任、账户与项目归属、大小限制、查询参数比较、无Bearer附件下载、禁止重定向及无覆盖写回；不扩大受信任域，不把所有同名附件当成同一文件。

## 新鲜验证

执行器：显式PowerShell，私有Node，原固定依赖构建副本，独立临时HOME及既有network-guard；无真实上传、生成或费用。

证据目录：D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\.dsh-test\import-url-repair-20260926。

- 复用既有验证助手建立本批独立baseline，保留原R1证据及全部已有未提交变更；起始190项源码/构建一致。
- 定向红灯 test-1790433271693715300.log：20项中19通过、1失败，失败为中文附件同址误报IMPORT_ITEM_CHANGED，退出1。
- 最小修正后 test-1790433300527578700.log：20/20通过，退出0。覆盖原文/编码四组合、中文和空格；不同路径、查询、域名、API路径、片段和空值仍在二进制下载前拒绝。
- 完整 verify-1790433306608555600.log：build、全量测试、离线pack dry-run分别退出0；625项中623通过、2既有条件跳过、0失败，包108项。
- 主源码与构建190项匹配本批verified清单；与本批baseline相比只变更src/website-import-client.js和test/website-import.test.mjs，未删除文件、未改客户端bundle。
- imported-files-check.json：三份已保存Markdown均匹配导入清单哈希；已安装的website-import-client.js仍为修复前字节，说明尚未安装。

单代理自审，非独立审查。部署前继续保留真实导入清单、文件及关联；用户保存退出后才执行备份和限定安装/准入更新。部署后重新读取列表，仅由用户选择原失败附件再次导入，核对落盘及DSH打开。若另有错误继续按证据定位，不自动重试或放宽安全边界。未提交、推送或修改日常DSH。

## 2026-09-26 用户退出后的安装与启动

用户明确回传“开发副本已退出”。只读进程检查未发现原开发副本进程后，复用已有受限安装器，为本批新建独立备份/证据目录；未覆盖旧R1记录。执行器为显式PowerShell，私有Node v24.19.0。

1. import-url-repair-deploy.py backup退出0：13,689文件逐项复制、哈希及源稳定性验证；包含真实导入后的设置、关联、三份Markdown和导入清单。
2. pack/install/finalize均退出0：108文件包离线安装、禁用脚本；归档SHA256为309a6c8155f395a327d050ba0006d15c58d7a2cdd07d8d77aa8c6954755fe6ef。13,682原文件保持，7项批准的插件/必要安装元数据变化，其他依赖不变。
3. import-url-repair-launch.py refresh/check/start均退出0：只刷新准入v3固定哈希，不写settings、启动器或cordis配置。15项设置/业务/项目文件不变。原副本主PID51572，Host127.0.0.1:43120。
4. 新启动run为4efff641-078b-4b0a-aca3-b2b08b501ade，2026-09-26T14:42:50.170Z开始，14:42:54.241Z完成且renderer healthy；未以历史启动日志冒充本批。
5. runtime及import-url-repair-post.py退出0：108项安装文件与验证包一致，主源码/构建190项与本批verified清单一致；15项保护文件保持，三份已导入Markdown和原导入清单哈希均不变。

备份：D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\.dsh-test\isolated-dev-20260913\backups\import-url-before-20260926。

安装/启动/保全证据：D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\.dsh-test\isolated-dev-20260913\evidence\import-url-repair-20260926。

本次采样的两项日常控制文件哈希保持；日常历史settings缺失/变化归因仍未解决，不能扩大为整个日常Profile已验证。未操作日常安装、未自动下载或生成、未读取凭据明文、未提交或推送。

下一步沿用已建立关联和已保存文件的workspace-a，重新读取网站项目，只勾选原失败的两份DOCX导入。不要解除关联或重复勾选三份已成功Markdown；真实附件下载/打开结果由用户回传后再关闭此项。

## 安装后两附件重试回传

用户截图 C:\Users\TinaD\AppData\Local\Temp\codex-clipboard-2eccdd2e-b666-40de-8df3-78a63a097e9d.png 显示：申请文件审计报告DOCX保存成功，权利要求书生成报告DOCX失败码已变为IMPORT_REQUEST_FAILED。

本轮只读检查退出0：实际清单为原workspace-a内的.oasis-import-914e2e40-fd52-4a7a-8b5a-faa5598566ef.jsonl。成功附件17,244字节，SHA256匹配intent，ZIP CRC检查及DOCX必要成员存在检查通过；没有读取正文用于模型分析，也未声称Word或DSH界面打开已验收。原三份Markdown哈希保持，当前108项安装文件仍匹配本批artifact。

剩余附件：flow-2-6-权利要求书生成报告-20260505-1742.docx。当前客户端把非200（401/403另判）、网络异常、超时、禁止重定向触发的异常及JSON解析失败统称IMPORT_REQUEST_FAILED，清单不含HTTP状态或请求阶段，不能据此归因为404、服务器文件缺失或某个安全限制。未获取详情原始URL，未猜下载地址、读取凭据、再次请求生产或放宽重定向/域名限制。

下一步仅请用户在网站同一条历史记录尝试下载这份既有附件，回报能否下载及可见错误（不重新生成、不发送令牌或材料正文）。这是诊断对照，不改变应用内导入的产品流程。若网站也失败，按实际错误确定源文件问题；若网站成功，再按实际下载链定位插件差异。现有四份成功文件保留，不需要再次导入或解除关联。
