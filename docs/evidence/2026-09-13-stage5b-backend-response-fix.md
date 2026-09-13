# 5B 后端用户详情响应修复：历史记录（已按用户要求恢复原状）

最新状态：用户批准恢复后，本次补丁已撤回并仅重启 lzpy。原文件哈希及现网原行为已复验；详情见 docs/evidence/2026-09-13-stage5b-backend-restore.md。以下 PASS 和“当前”表述仅指当时修复目标，不再代表当前部署。

日期：2026-09-13。当前目标状态：PASS，仅指用户详情禁止凭据字段修复及生效验证，不代表整个5B或真实生成通过。

## 最新：用户授权重启后的定向验收

- 用户明确“同意重启”；助手按该窗口授权执行，不宣称通过后台指标独立证明全部业务任务已清空。
- 重启前快照仍 accomplished；两个文件的字节哈希与批准版本一致。
- 仅通过宝塔 ServiceManager.new_mgr('lzpy') 执行该项目 stop_project/start_project，不重启服务器、宝塔或 Nginx。
- 云助手任务 t-qd06wy3osm9dgjk：Success / ExitCode=0，任务内停止、启动及端口检查耗时4秒；这不是测得的全站中断时长。
- 新进程 PID21933，服务器报告启动时间 2026-09-13 21:33:03；原 PID2188 已被替换，8000端口可达。
- 现网 POST https://lzhxpy.oasisintwrite.com/api/apicategories/apidetail，body仅已批准服务名“权利要求书生成-Fast”，无凭据头、无生成调用；HTTP200/code200。
- 完整响应经过原插件 assertNoForbiddenCredentialFields 检查，native Node退出0；api_key/credentials不存在，包括嵌套属性。未改变检查器。
- id/name/api_type/price/model_name/is_async/input_schema/output_schema/created_at/updated_at 十个业务字段存在；schema均为数组。该检查证明字段存在，不是生产数据前后逐值对比。
- https://app.oasisintwrite.com/workspace 与 https://lzhxa.oasisintwrite.com/ 均HTTP200/text/html；仅入口HTTP可访问性，不是登录后浏览器完整功能验收。
- 后置保全任务 t-qd06wy3to2t3wg0：Success / ExitCode=0，仅批准服务文件变化，另122个Python源码文件哈希不变，新进程仍监听8000。
- 未做恢复演练、磁盘回滚、真实生成、材料上传或费用动作。磁盘快照保留3天的设置不变。
- node_repl直接加载插件时遇到zod模块解析限制，改用项目既有native Node执行原检查器成功；未安装依赖或扩展诊断链。
- 下文“待维护窗口”等为写入阶段历史。当前已解除该字段阻塞，下一步继续5B实际schema/映射和项目绑定核对，不据此开放真实API创建。

## 授权及边界

- 用户临时允许逐次明确批准的远端既有文件修改；本次明确要求按方案修改与测试、不做恢复演练。
- 用户要求变更前磁盘备份，确认“3天”为保留期限，不是周期性备份。
- 修改和定向测试已执行；尚未确认全部用户的业务任务清空，未重启后端、未进行现网接口复验。
- 未生成、上传、读取数据库/凭据、修改账务、安装依赖、提交、推送或恢复磁盘。

## 目标与磁盘备份

- ECS：118.190.217.223 / cn-qingdao / i-m5eaknjckahl5587xh3l / OIW-网站-青岛。
- 系统盘：d-m5e6f966zms46sfrpqjo，80 GiB；后端目录位于该盘 /dev/vda3。
- 快照：s-m5e2srdaaznk7hkfhy7l，2026-09-13T13:17:02Z 创建；实施前重新查询为 accomplished，保留 3 天。
- 在线磁盘快照不冒充数据库一致性备份或已演练恢复；未修改既有自动快照策略。

## 最小修复与计划收窄

原计划新增用户端模型；候选 diff 检查发现现有 ApiDetailPublic 已覆盖全部业务字段且不包含 api_key/credentials。因此复用现有公开模型，仅修改一个文件，不新增重复 schema。

- 修改：/www/wwwroot/lzpy/app/services/apiconfig_services.py。
- 增加 ApiDetailPublic 导入；get_api_name_detail 的返回标注及构造改用该模型；移除 api_key=None、credentials='' 两个占位参数。
- model_name 仍显式回退空串；其余业务字段、空列表回退、400 错误保持不变。
- /www/wwwroot/lzpy/app/schemas/api.py 不变，旧 ApiResponsedetail 保留；未改管理端或其他服务函数。

## 基线与保全

- 服务文件原始字节 SHA-256：2a3ce49be3c67e5eed94280abb352b193b1f93dbd298a52298d184cad9931d5b。
- 服务文件新 SHA-256：f049fd81660315cc743b3f8bdb5d68e6b26eb91ea38d05a98a8dcbb519bc1115。
- schema 原始字节 SHA-256（不变）：22408b9b73681cd3c57881d72659d87a4702ca37eb305657cfda46879452a34f。
- 上述为原始字节哈希，不能与此前 read_text 换行归一化后计算的哈希混用。
- 独立备份目录：/root/oasis-change-backups/20260913-stage5b-fhy7l；包含两文件 .before 副本、manifest.json 和 test_response_contract.py。
- 文件写入前再次核对基线，独占创建临时文件、保留 0755/UID1000/GID1000 后原子替换。
- app 下 123 个非符号链接 Python 文件逐项哈希对比：仅目标服务文件变化，另 122 个保持一致。该证据不覆盖全盘或运行日志。
- 未设置文件级备份的自动清理；3 天保留仅应用于磁盘快照。

## 测试与实际结果

- 使用既有运行时 /www/server/pyporject_evn/versions/3.10.20/bin/python3.10 -B，AST 提取目标模型/函数/响应包装；DAO 为内存合成替身，不导入生产应用或接数据库。
- 红灯：t-qd06wy2tf4lqsxs，旧代码 5 项中 4 通过、1 失败，退出 1，明确 Forbidden credential property: api_key。旧模型存在 Pydantic class Config 弃用警告，本次不扩展修复。
- 补充 HTTP 测试时首次按重复函数名选错路由，测试出现 NameError；已改为按精确 /apidetail 装饰器选择，不修改生产路由。
- 最终六项：无禁止属性、业务字段一致、旧共享模型保留、缺失服务错误不变、既有回退不变、实际路由隔离 HTTP 序列化。
- 写入任务 t-qd06wy377pkk0lc：候选 6/6，落盘源码 6/6，Success / ExitCode=0。
- 复核任务 t-qd06wy390g4tips：独立 sha256sum 与预期一致，原 PID2188 仍监听 8000，启动时间未变；Success / ExitCode=0。

## 未完成与人工门禁

- 服务 reload=False，尚未重启；不能将源码测试通过当作现网接口已修复。
- 后端使用进程内后台任务执行部分生成、结果保存和扣费。云助手空闲不等于业务空闲；不能保证重启恢复这类任务。
- 等待用户确认所有用户的生成及后台保存/扣费结束，并暂停新提交、提供维护窗口；之后仅重启宝塔项目 lzpy，再进行受控只读现网详情复验。
- 不进行恢复演练；若真实上线失败，按获准回滚方案恢复文件，而不是用全盘恢复覆盖后续业务数据。
- 5B 尚未完成实际绑定，不绕过插件凭据检查、不进入真实 API 创建。
