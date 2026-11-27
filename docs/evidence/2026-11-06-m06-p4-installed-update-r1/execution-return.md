# P4同版安装、UNKNOWN更新保全及首发范围准备回执

2026-11-06，Asia/Shanghai。Codex单代理，继续用户目标“按计划推进直至完成”；本轮为实质进展，整体未完成。

## 准确对象与结果

业务归档`6f2f16e771cb56bf5514b35de87bbf0903d6bd4faabad36cfef4f4ac327504bb`已装配到新内部安装bundle `1c5baba6844b1b9e28e3cfd0c0a8913cf68bb1857f317d68096851c0eefe4bef`。新根：`/Users/tinadong7036/Documents/开发项目/DSH-Oasis/.dsh-test/m06-p4-unknown-update-20261106-r1`。相对旧db673f66包仅3件业务源码和新template归档身份变化；App/固定运行时、客户端、业务资源及原2个guard不改，没有重写旧bundle/收据/expected hash。

实际控制器完成旧基线新装→新包升级→旧包回退→重新选择已封存新目标。新目标目前为active；实际Desktop配置准备及两个解析锚点核得604内部链接、Host/客户端/bundle同组件、唯一M06受控入口、57619/loopback、无需迁移、warnings为空，五项Profile元数据重准备不变。目标134业务成员逐字节绑定原归档，实际完整安装检查通过。没有App/Host启动或端口实际监听证据。

## 准确UNKNOWN场景

采用实际已安装writer lease、provider gate、固定SDK DomainFacility及JSON后端，经公共业务服务创建完整synthetic UNKNOWN记录。只有一次合成执行器调用，明确返回未知；没有真实模型/API未知请求。Context事件交付只接sink，不启动Host。

1. SDK持租约时，升级以F_INSTALL_BUSY拒绝，安装状态不改。
2. Domain/后端正常关闭后，升级前重读、升级至新版本重读、回退后重读均得到原完整记录；业务文件SHA256一直为`a7e3eb4111ebe1148889417c11e4692128f9f10aba83185f4d4d6fbedc7c4b86`。
3. 三次重读均保持UNKNOWN、冻结输入及任务身份；输入编辑拒绝，新requestKey创建拒绝，同key只返回原记录，不再次执行。
4. 升级后的追加文件在回退及目标重选后保持；最终双锁释放。真实Fetch、App spawn和初始夹具之外的执行器调用均0。

以上只关闭该**完整合成业务状态＋真实安装/存储链**的保全场景，不证明真实未决模型/API的结果、取消或退款，也不替代实际UI、正常启停及完整F接受。[installed-update-result.json](installed-update-result.json)、[target-composition-result-recheck.json](target-composition-result-recheck.json)及[新准入候选](installed-admission-candidate-recheck.json)给出准确状态。

## 首发准备

[134成员处置](release-file-disposition.json)和[RL01—09接续](release-readiness.md)已交；本次内部载体保持完整，不裁剪旧资源或修改pin。109项现有运行源码候选、19项兼容保留、3通知、1构建溯源、1元数据待定和1混合容器公开范围待核，均未获发布批准。operator原文已审阅：不进模型不等于自动保密/可公开；两项历史限定须保留，其本机路径与公开指针展示另核。六外部载体继续排除。

OasisIntWrite署名及商业联系TinaD.qd@outlook.com沿用户事实记录；实际许可人/贡献归属、正式采用/版权年度/日期、正式发行版本、专业/用户接受仍缺，未改根LICENSE或包private/license。[同版技术事实增量](technical-facts.md)只供后续内部交接，未投递或发布。

## 失败、复核与边界

首次证据脚本误把Domain声明直接交低层KV，实际SDK报descriptor.tables不可迭代；未创建业务文件，关闭后无锁。查固定源码后使用公开DomainFacility，显式核既有base/root和业务文件缺失才续接，没有重装或重派未知请求。另一处规格脚本在结果已写入后因最终日志变量作用域失败；原日志/产物保持，修正后以只读selected-target模式完整重验exit0，不重复版本选择。

产品源码本轮未改；复用P3的70项源码/3项归档测试及原安装控制器测试。新已安装组件另做3项guard测试通过，52个非白名单endpoint拒绝且凭据/模型/adapter/Fetch0。[verification.json](verification.json)给出本轮新鲜保全与配对检查。本轮没有App启动、真实模型/API/Dify/上传/费用、源CI/B/A、WorkBuddy投递、提交/推送或发布。专业复核人及权利链问题仍待用户补充，整体目标保持active。
