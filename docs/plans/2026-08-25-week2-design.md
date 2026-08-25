# 第二周项目工作台持久化设计

日期：2026-08-25  
状态：已按总体计划和 DSH `0.1.1-rc.2` 本机合同冻结

## 1. 目标与范围

第二周只完成项目原生多任务页与本地持久化：页签创建、选择、重命名、关闭、工作流选择、面板状态、项目切换、Host 重启恢复和 revision 冲突处理。状态主键仍是 DSH `workspaceId`；同项目不同 Session 共享，同名或同路径项目不得猜测合并。浏览器不得用 `localStorage` 保存业务状态。本周不接入专业生成服务，不实现材料正文、产物下载、项目文件写回、Dify 或收费管理。

## 2. 方案比较与裁决

### 方案 A：浏览器 localStorage

实现最少，但状态绑定浏览器与 origin，无法由 Host 验证 Workspace 身份，也无法可靠证明 Host 重启恢复和并发写冲突。它还会形成第二套事实源。拒绝。

### 方案 B：插件直接读写自有 JSON

可以持久化，但会重复 DSH 已提供的临时文件、fsync、原子 rename、版本戳和生命周期处理；也绕过 `ctx.storageDomain` 的 schema 验证、单 Domain 写链与标准错误。拒绝。

### 方案 C：DSH Domain Storage + JSON backend（采用）

Host 通过 `ctx.storageDomain.open()` 打开一个领域，每个 Workspace 一行。读取来自权威内存态；写入先持久化再更新内存，并在 Domain 内串行。当前 Web Profile 已组合 JSON backend，其每次写入使用临时文件、fsync 和原子 rename。Client 通过 DSH Connection 的专用 `/oasis-workbench` logical RPC channel 调用 Host；该 channel 固定为 `loopback` authority，不扩大 LAN 暴露面。

## 3. 持久数据合同

DSH 当前 `UNIT_NAME_RE` 为 `^[a-z][a-z0-9_]*$`，所以总体计划中的展示名 `oasis-workbench-v1` 不能作为实际 Domain 名。实现固定为：

```text
Domain name: oasis_workbench
Domain version: 1
Table: workspaces
Key: workspaceId
Record schemaVersion: 1
```

一条记录为：

```js
{
  schemaVersion: 1,
  workspaceId,
  revision,
  panelMode: 'hidden' | 'normal' | 'expanded',
  activeTaskId: string | null,
  taskOrder: string[],
  tasks: {
    [taskId]: {
      taskId, title,
      workType: null | 'technical-rd' | 'cn-invention-patent',
      workflowId: string | null,
      workflowVersion: string | null,
      inputRefs: [], formValues: {},
      run: null, preview: null,
      review: 'not-reviewed',
      createdAt, updatedAt
    }
  },
  updatedAt
}
```

schema 同时校验：`taskOrder` 不重复、每个 id 都存在于 `tasks`、不得有 order 外的孤儿 task、`activeTaskId` 必须为空或位于 order、task map key 必须等于记录内 `taskId`、Workspace key 必须等于记录内 `workspaceId`。返回对象深克隆并冻结，调用方不得原地修改 Domain 暴露的记录。

## 4. 写入、revision 与故障语义

缺失 Workspace 行只在内存中投影 revision 0 的空状态，首次实际变更才物化。Client 保存时提交完整候选状态和 `expectedRevision`；Host 不接受 Client 提交 `revision`、`updatedAt` 或其他 Workspace ID。每个 Workspace 有一条 promise 队列，完整覆盖“读取权威行 → 比较 revision → 校验候选 → 持久 put → 返回已提交行”。成功后 revision 加一，时间由 Host 分配。

revision 不匹配不抛基础设施错误，也不静默覆盖，而返回：

```js
{ committed: false, reason: 'revision-conflict', current }
```

Client 进入 conflict 状态，保留本地未提交草稿并展示“重新载入当前版本”与后续人工合并入口；第二周不做自动字段合并。后端打开失败、存储损坏或写入失败作为基础设施错误拒绝，由 RPC 转成通用错误，不能伪装成 revision 冲突。

Domain/JSON backend 没有跨进程 CAS 或写锁；本合同只承诺一个 DSH Host 进程内的并发安全。两个 Host 指向同一根目录属于禁止部署方式，并在验证报告中保留边界。

## 5. Host 与 Client 数据流

Host 注入 `tools`、`storageDomain`、`connection`。启动时打开 Domain，注册 `/oasis-workbench` channel，固定两个 endpoint：

- `state/get`：严格接收 `{ workspaceId }`，返回当前权威记录或 revision 0 空状态；
- `state/replace`：严格接收 `{ workspaceId, expectedRevision, state }`，返回 committed union。

未知 endpoint、字段多余、类型错误或身份不一致返回 DSH RPC `bad-request`；channel 仅 loopback、同源可达。状态不进入模型提示词、Session 日志或工具输出；现有 `oasis_workbench_status` 只报告能力级别，不输出用户数据。

Client 注入 `@deepseek-ai/dsh-client-connection`，每个 Workspace 维护 `idle/loading/ready/saving/conflict/error`。首次进入项目先 hydrate；完成前不得把默认空状态覆盖到 Host。所有本地动作使用同一个纯 reducer，并把快照依序提交。快速连续动作进入 Workspace 专属队列，后一项只在前一项返回新 revision 后发送。项目切换不会取消另一项目已经进入队列的持久写，但 UI 只渲染当前项目状态。

## 6. 恢复、删除与验证

关闭 task 是普通持久变更；删除 Workspace 注册不自动删除绿洲行，因为总体计划要求保留 orphaned 状态并等待人工处理。第二周不提供 orphan 清理 RPC。

验证必须使用全新临时 `DSH_HOME`：Host-1 在 Workspace A/B 写入不同状态并停止；Host-2 用同一临时 Home 重启，必须恢复两个项目且不串数据；两个并发 Client 使用同一 revision 写入时只能一个提交，另一个得到权威 current；浏览器刷新和 A/A/B/A 切换必须恢复页签、工作流与面板模式；hidden 后原生 Details 仍可打开。全过程比较真实 `C:\Users\TinaD\.dsh` 全树哈希，并安全清理临时根。
