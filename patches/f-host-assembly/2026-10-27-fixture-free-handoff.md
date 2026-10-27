# v4无夹具开发接续

这是既有维护入口的具名消费交接；不修改[原说明](README.md)或其冻结审计。原入口 `scripts/f-development-assembly.mjs` 未变，本批未修改产品代码或依赖清单。

当前复验输入固定为 `.local/f-r2-unattended-20261027/assembly-clean-spec.json`：明确R7 admission和已物化的 `.local/f-renderer-lease-20261027/conversation4`，只选择checkpoint4，不提供fixture。实际新根为 `.dsh-test/f-development-clean-20261027`；旧恢复复验根为 `.dsh-test/f-r2-unattended-20261027`，二者不可混用。均为本仓库下的实际绝对路径，完整输入位于各根 `evidence/f-assembly.json`。

无夹具组合195pin，恢复计数组合198pin；三项差异恰为明确fixture的三文件。两个组合的guard/checkpoint/bridge、业务候选、Sidebar/Host、App、Node及实际pnpm物化仍由原维护入口逐次核对。无夹具Profile未复制sessions、storages、credentials或userdata，首次运行由原生Host初始化；没有seed、proof slot或HTTP计数订阅。不是独立可移植包，不可删除保留的link源或混用市场版本。

本批已在固定Desktop上直接操作公开草稿：创建Flow-2-6任务，保留本地Skills默认，填写公开用户指令；同时填写原生未发送标记。正常退出、同入口重开后，两个草稿和任务页仍可见。未点核对/准备/生成/发送，未登录或迁认证。新的Profile通过首次启动不等于应用安装器、签名发行、升级/降级/回退或任意旧数据迁移。

下一接收方沿原CLI使用固定Node执行 `--check` 后 `--start`，无需读取测试proof才能打开业务工作台。创建其它候选必须给不存在的明确root，固定pnpm11.8.0离线lockfile-only→frozen-lockfile、ignore-scripts、私有HOME/cache和禁自动下载后seal一次；不得重签本批或历史准入。真实模型/API、用户材料外传、发行均保持独立条件。具名证据见 [R2无干预返回](../../docs/evidence/2026-10-27-f-r2-unattended-return.md)。
