# S6 第一批：操作上下文与运行账户快照

当前目标状态：STATIC_ONLY。本批离线实现和验证完成；不是整个 S6、Workspace 目录绑定、实际 API 或安装验收完成。单代理自检，无独立审查。

## 已实施

1. Host 每次 getRuntime 捕获已标准化网络配置和本次凭据，凭据仅驻留闭包。请求前复核当前配置和凭据；变化后拒绝旧操作并保持失效，不改用新账户，不输出/持久化凭据及其指纹。
2. 新远端运行从认证用户详情的 `id` 取得 accountId，写入 execution 与结果 providerSnapshot 并纳入输入完整性哈希。不同账户禁止继续或查询流水；同一 requestKey 不能绑定另一个账户。
3. 旧记录没有 accountId 时仍可原样读取，不补写、不重算旧哈希；没有身份依据时拒绝远端继续。旧请求未知结果不重发规则保留。
4. 运行代码接在既有 index/runtime-config/remote-service/domain/contract 边界，没有新上传状态机、没有开放统一 API 入口；四字段文档映射与业务 Skill 未改。

账户字段依据本机 D:\OneDrive\4、董娣相关\3、绿洲慧写3.0\绿洲前端\docs\api\user-legacy.yaml 的 LegacyUserDetail.id。这里只核对文档，不代表当前真实账号接口已复验；不存在/非安全整数 id 时拒绝新运行，不按用户名、手机号或 JWT 内容猜测。

## 红绿与新鲜验证

执行器 cmd.exe，私有 Node 24.19.0；使用既有新隔离构建副本，Home/user/cache/temp 独立，无实际凭据。模拟 fetch/内存客户端和本地合成服务器不是线上访问。

- Host 切换凭据红灯：模拟网络调用 3 次，预期 0，退出 1；日志 D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\.dsh-test\source-promotion-20260915\check-1789448594081519700.log。
- 观察账户变化后恢复原凭据仍复活旧操作的反例退出 1；增加失效状态后通过。日志 D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\.dsh-test\source-promotion-20260915\check-1789448675072162900.log。
- 新账户记录/跨账户阻断/无效 id 七项反例退出 1，再实现账户快照与校验。日志 D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\.dsh-test\source-promotion-20260915\check-1789448770076978100.log。
- 最终定向 97/97 通过、无跳过，退出 0；覆盖 Host、账户、配置竞争、历史记录、Repository/RPC、审核写回及不重发。日志 D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\.dsh-test\source-promotion-20260915\check-1789448864943741900.log。
- 完整 `verify`（build、tests、pack dry-run）退出 0，93 项打包清单；两项旧 stage2 路径测试依旧跳过。日志 D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\.dsh-test\source-promotion-20260915\check-1789448865626381300.log。
- 当前源码与测试构建逐项相同后同步新版 lib/map；原 lib 另存备份。原已安装开发候选未改，pin 不变，--check 退出 0。验证记录 D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\.dsh-test\s6-runtime-20260915\verification.json。

## 边界与后续

本次检测请求前及异步解析边界可观察到的配置/凭据差异，不能取消已经发送的请求，也不承诺观测到两个检查点之间改变又恢复的全部历史事件。不同账户返回值仍不可能成为已捕获操作的请求凭据。真正账户/Workspace/目录绑定、确认失效和运行快照接线尚未完成。

下一批是原生设置中的显式绑定及统一四字段上传回执接线。尚未安装新构建、操作日常 DSH、修改后端、真实上传/生成、提交或推送。原升级验收只覆盖原候选字节，不能代替本批新源码安装证据。
