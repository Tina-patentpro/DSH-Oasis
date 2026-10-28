# F-IN-A01测试来源修复返回

2026-10-29，Asia/Shanghai。接续[首轮独立FAIL](2026-10-29-f-installed-layout-independent-audit.md)，报告SHA256 `f24c463d342732782b6812a1a0ced488c8522e05ed4306d5a0ea1af07099d783`；本轮仅修F-IN-A01/P2，不修改生产入口、安装包或既有GUI结论。

首轮测试只在本机历史目录完整时通过，干净检出8项均因缺夹具失败。作者在独立最小源码副本复现exit1后，将 `scripts/tests/f-installed-runtime.test.mjs:20` 的读取从忽略目录 `.local/f-process-recovery-20261027/extension-r3/index.mjs` 改为已跟踪的 `patches/storage-json-single-owner/index.mjs`。两份provider原件逐字节相同，SHA256均为 `9d1c8da0ed70accc2b679bccbfc72c9a353f96573155fbef0951ff4df5c71bdc`；不把旧运行目录纳入Git。

只有该测试单行变化，原测试SHA256 `cde772700df176b42ee546626cacd8b309c99848eb67261ad18c23c07528ed5a`，新SHA256 `6dcd0f47f680a3f7a08d9b36538fa45e969c0a50381072664595ab19a448b354`。原字节另存为[原测试证据](2026-10-29-f-installed-layout-audit-original-runtime-test.mjs.txt)，不是继续执行的测试入口。首轮[326成员执行单](2026-10-29-f-installed-layout-execution.json)及其hash保持；历史测试成员按新[修复执行单](2026-10-29-f-installed-layout-A01-repair-execution.json)中准确原路径→原字节归档映射复核，不用新测试hash重签旧记录。另有326份完整不可变副本和原expected hash，其他325 live成员仍一致。

新建干净源码副本只携带controller、lease、ownership、tracked provider及修复测试五文件，没有`.local`历史目录。工具Node24.21.0与实际随包Electron Node24.18.1分别 **8/8、exit0**；三份受影响测试分别 **15/15、exit0**。四条完整argv、cwd、日志及退出码在修复执行单成员内。原环境134/134、首轮独立15/15与3/3探针各自保留，不冒称本修复重跑134项。

三份生产源码、R3两个整包、安装controller/receipt/current、公开JSON/IDB快照及所有历史失败不变。无需重建包、启动Desktop或重演旧GUI；本次没有真实模型/API/上传/发送/费用、认证迁移、日常安装、提交或推送。完整F及原发行/上游/跨平台等出口仍开放，最终处置由同一指定Max独立复审另记。
