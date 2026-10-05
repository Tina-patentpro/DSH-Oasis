# 项目文件导入安全定位候选

## 当前结论（安装及实际请求后，2026-10-04）

FAIL：仅指独立项目文件导入目标。用户确认保存正常退出后，本候选已在原开发副本限定安装并正常启动；实际 Desktop 只点击一次「项目文件」，新界面明确显示「项目文件列表：接口响应失败（响应状态），HTTP 404。不会自动重试。」未取得项目文件列表、元数据或下载证据。404 的具体服务端/网关原因未确定，不将它直接等同未部署，也不将离线 success=false 缺口归为本次生产根因。

安装等待退出门禁现已解除，不再要求重复退出或重装。按已批准计划的 404 停止条件，停止请求，不猜备用接口、不改生产服务器；需用户/服务方核对现有 GET /api/files 的实际路由与部署合同后明确接续。历史列表及其标签保留，未选择或下载历史文件来替代本目标。

## 安装前结论（历史）

BLOCKED_WAITING_FOR_USER：安全诊断及本地合同修正已完成离线验证，等待用户保存正常退出原开发副本后安装。尚未安装本候选、重试生产请求或取得项目文件列表/元数据/下载证据，不宣称生产故障已修复。

用户批准上一轮五步修复计划；本批只处理独立项目文件读取失败，不新增运行环境、不操作日常 DSH、不生成/上传/收费、不评价内容质量、不提交推送。

## 实现

- website-import-client记录白名单endpoint/stage/kind/httpStatus；区分HTTP、网络/响应传输、超时、JSON、合同与归属。项目归属核对失败不误标成文件列表失败。
- workbench-rpc出口及website-import-controller显示再次白名单化；不透传URL、凭据、原始异常、完整响应或材料。
- 原请求路径、GET、凭据边界、30秒超时、大小上限、归属检查、无重定向/无自动重试保持。失败保留原历史列表与其标签，不假装项目文件空列表。
- 权威files.yaml使用success标记；新增回归证实原unwrap未拒绝success=false，可提升其data为成功空列表。现显式拒绝。这是离线已证实缺口，不据此推断实际生产失败原因。
- 同范围OpenSpec记录：openspec/changes/import-website-project/specs/import-diagnostics/spec.md；执行台账见docs/plans/2026-10-04-project-file-import-repair.md。

## 新鲜验证

执行shell显式选择powershell.exe，login=false（工具无Profile启动）；Python入口 C:\Users\TinaD\AppData\Local\Python\pythoncore-3.14-64\python.exe。

沿用原固定依赖构建副本及既有离线验证器，包装入口：D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\.dsh-test\project-file-repair-work.py。网络阻断器及临时HOME沿用原验证器，不读取生产账户凭据、不安装依赖。

| 命令/步骤 | 结果 |
|---|---|
| node --version / pnpm --version | 退出0；v22.19.0 / 11.25.0；固定构建dsh-tools=0.1.5-rc.1、Cordis=4.0.2 |
| project-file-repair-work.py baseline | 退出0；主源码/既有固定构建193项一致，原字节、Git状态/差异备份 |
| test test/website-import-diagnostics.test.mjs（红灯） | 退出1；13项全部按预期因诊断缺失、失败包装误升成功而失败 |
| test test/website-import-diagnostics.test.mjs test/website-import.test.mjs test/website-import-ui.test.mjs test/website-import-api-scope.test.mjs | 退出0；50/50通过，无跳过 |
| verify（最终输入） | build/test/pack各退出0；704项中702通过、2既有条件跳过、0失败；pack dry-run 109项 |
| 最终清单与基线差异 / git diff --check | 退出0；194项源码/构建一致，仅4源文件、1新增测试、2生成lib改变，无原文件删除；无空白错误 |

最终验证：.dsh-test/project-file-repair-20261004/verify-1791069383713735700.log、同名.json、verified-1791069383713735700.json。
红灯：test-1791069031432561800.log；定向绿灯：test-1791069123603920300.log。

两项既有条件跳过为 approved isolated Home admits only the explicit native offline flag、isolated Host declares native services before accessing Cordis context，均未计通过。当前插件候选不修改Desktop/DSH/Sidebar版本；未执行本候选Host运行验证，安装前仍需新鲜保全与固定pin检查。

## 界面与人工门禁

Computer Use通过返回的窗口对象精确识别原开发窗口18745860，其app为原isolated-dev-20260913/app/DSH Desktop.exe；日常窗口4720302仅辨识，不操作。未发送任何UI输入、读取生产目录或下载。

已请求用户保存并正常退出开发副本；不能将先前其他批次退出确认复用于本次安装。退出后再检查进程、做本批一致备份与限定安装，随后一次显式项目文件列表请求定位。列表成功后才进入用户指定的一个文件下载。若实际为未部署/服务端故障，记录证据和人工接续，不改远端或猜测备用接口。

## 自审与保全

单代理增量自审，非独立审查。原7项文档变更保留；本批只追加自己的计划、证据、同范围OpenSpec记录和最新状态，不覆盖旧证据。原开发安装、Profile、业务存储、审核、项目文件及草稿未由本批操作；不将离线测试升级为安装、生产或S6完成结论。

## 安装、启动与实际列表续记

用户先同意下一步，再对保存正常退出回复「确认」。执行仍显式使用 powershell.exe / login=false；沿用上述 Python、原开发副本及固定构建，不创建第三套环境、不安装新依赖。复用既有安装/后验脚本，仅新增本批包装入口 project-file-repair-install.py、project-file-repair-post.py；不改旧脚本。源码和 lib 没有新编辑，因此不重复已完成的完整离线测试，改以已验证194项清单逐项核对本次输入。

开发组合保持 Desktop 2.0.9 / 内置 DSH 0.1.5-rc.1 / Better Sidebar 0.19.1 + safe-native-files-2 / Cordis 4.0.2。实际私有 Node v24.19.0，固定 dsh-tools 0.1.5-rc.1、@deepseek-ai/cordis 4.0.2；不使用日常或全局 CLI 替代开发目标。安装前固定 pin、无重定向路径和已退出进程断言通过。

| 本次步骤 | 新鲜结果 |
|---|---|
| deploy backup | 退出0；13,714文件一致备份，开发进程为空；2项当前存在的日常控制文件记录哈希 |
| deploy pack | 退出0；109项包，archive SHA256 6c45e7a2ba4e913620746ebe1fe4a358e836f196785b6b0c41ee6fa0237d70bc |
| deploy install / finalize | 各退出0；109项安装文件匹配，12项许可变化、13,702原文件保持，其他依赖/锁定包保持 |
| launch refresh / check / start | 各退出0；仅刷新准入v3固定哈希，未写settings/launcher；23项设置/业务/项目文件保持 |
| launch runtime / postcheck | 各退出0；本次 startup b852c50b-f376-48f3-84cb-7b60382a8aaf，主PID48616，Host127.0.0.1:43121；上海08:07:47 renderer healthy |
| UI后 postcheck --after-ui | 退出0；194项源码/固定构建、109项安装包继续一致，23项保护文件及2项日常控制文件哈希保持 |

本批备份：D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\.dsh-test\isolated-dev-20260913\backups\project-file-repair-before-20261004。

本批安装和实际UI证据目录：D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\.dsh-test\isolated-dev-20260913\evidence\project-file-repair-20261004。原始回执为 checkpoint.json（备份目录）、artifact.json、install.json、installation-verified.json、admission-v3.json、check-1791072445830009100.json、start-1791072464787913500.json、runtime-1791072476415258300.json、postcheck.json、ui-list-result.json、ui-draft-preservation.json、postcheck-after-ui.json。

Computer Use精确选择原隔离EXE窗口13436996；日常窗口4720302只辨识，不输入。已有workspace-a及原未发送草稿保持。打开功能中心/导入弹窗，账户已登录；显式读取网站项目，选择现有关联的工学键盘，历史列表显示39条源记录。随后仅点击一次「项目文件」，实际警报显示HTTP404；旧历史列表仍标为「网站历史正文和生成附件」，已勾选0项。不解除/重新提交关联、不重试、不下载、不上传、不生成、不收费。

归档安全错误后关闭弹窗；原草稿UI规范化文本仍949字符，SHA256=790d628fc7df17dbf5ab6df31bb3787a1c40dbf8fb46d5c670927bd7edc8707b，与此前基线一致，未发送。UI后23项保护文件（含业务存储、设置和项目文件）哈希不变，因此原版本/审核/回写未被本批操作改写。日常只证明本批未操作及两项控制文件保持，不扩大为整个日常Profile的历史差异归因。

下一步人工证据：服务方核对当前生产 GET /api/files 是否按文档部署、实际路由/网关挂载及 projectId 查询合同，回传方法/路径、状态码和必要响应结构字段名，不回传Authorization、JWT、凭据或材料正文。确认合同后再明确接续；列表成功后才由用户指定一个文件验收元数据/下载。单代理执行与自查，非独立审查；没有提交、推送、发布或远端写入，S6整体仍未完成。
