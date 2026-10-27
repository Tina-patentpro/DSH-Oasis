# 恢复HTTP观察夹具版本

当前仅使用 `recovery-upload-observer-2.mjs`。它对无法分类的地址记录unclassifiedRequests，对证据写入失败记录evidenceWriteFailures；任一非零、缺subscribed/disposed或缺活跃请求事件时，不能接受“零上传”证据。它不捕获或输出错误对象、原始地址、query、header、body。

`recovery-upload-observer.mjs` 和原两项测试只保留2026-10-27首轮109成员冻结证据。该历史版存在独立审计P2：畸形URL可使诊断订阅异常退出并在stderr暴露原始query；不得用于新Profile、新夹具或交付默认组合。旧正常流量观察不重签，反例和旧源码保持。P2修复回归在 `../recovery-upload-observer-2.test.mjs`。

两版均仅测试用途；无夹具195pin开发组合不加载任何一版。
