### web前端日志及上报方案

通过收集前端异常报错信息, 帮助开发者判断线上项目产生的问题;

适用大部分前端项目、PC、移动端、框架、原生

`注意`由于使用了indexDB作为本地存储, 暂不支持服务端渲染 

上报接口请求方式为`POST`, 暂不支持更改

#### 使用方法

##### 安装

```
npm install monitor-web --save
```
##### 导入
```javascript
import MonitorWeb from 'monitor-web'
```

##### 创建实例
```javascript
    new MonitorWeb({
        url: 'http://127.0.0.1:8888', // 上报url 必传!
        maxRetryCount: 5, // 上报重试次数
        reportingCycle: 10000, // 上报周期, 单位:毫秒
        moduleName: 'focus', // 页面项目名称 必传!
        isLog: true, // 是否在控制台打印日志及上报情况
    });
```

#### js api配置项

| 字段名 | 值类型 | 是否必传 | 描述及默认值 |
|:------|:------:|:-------:|:-------|
| config | Object | true    |配置对象 |
|::url   | String |  true   | 上报接口url 必传 |
|::maxRetryCount | Number | false | 日志上报失败重试次数, 默认值: 5 |
|::reportingCycle | Number | false | 日志自动上报/清理周期, 单位/毫秒,默认值:10000|
|::moduleName | String  |  true | 页面模块名称, 必传 |
|::isLog | boolean | false | 是否在控制台打印上报情况, 默认值:true|

## 日志上报
**接口及参数样例:**
#### POST /weblog/logreport
| 字段名 | 值类型 | 是否必传 | 描述及默认值 |
|:------|:------:|:-------:|:-------|
| config | Object | true    |配置对象 |
|::url   | String |  true   | 上报接口url|
|::max_retry_count | Number | true | 日志上报失败重试次数, 默认值: 5 |
|::reporting_cycle | Number | true | 日志自动上报/清理周期, 单位/毫秒,默认值:10000|
|::module_name | String  |  true | 页面模块名称, 必传 |
|::is_log | boolean | true | 是否在控制台打印上报情况, 默认值:true|
|data    | Array(LogData)| true | 异常日志 |

#### 代码逻辑异常日志字段
##### Object:LogData
| 字段名 | 值类型 | 是否必传 | 描述及默认值 |
|:------|:------:|:-------:|:-------|
| log_type   | String | true | 错误日志类型, 代码错误或ajax错误 |
| click_events | Array(Object) | true | 点击报错时收集到的事件源及html结构路径|
|::height | Number | false | 浏览器高度px |
|::width | Number | false | 浏览器宽度px |
|::x | Number | false | 鼠标位置x坐标 |
|::y | Number | false | 鼠标位置y坐标 |
|::outer_html | String | false | 点击元素标签以及子元素 |
|::path | Array(Object) | false | 点击事件源路径从window到事件源 |
|::::node_name | String | false | 标签名称 |
|::::class_name | String | false | 标签类名 |
|::::id | String | false | 标签ID |
| column_no | Number | true  | 报错代码起始列|
| line_no  | Number | true | 报错代码起始行 |
| error_type | String | true | 错误类型 |
| error | String | true | 完整异常信息 | 
| is_trusted | String | true | 是否为用户操作事件导致的异常 |
| msg | String | true | 异常信息 |
| path | String | true | 页面路径 |
| time | long | true | 异常产生时间戳 |
| user_agent | String | true | 用户信息Navigator.userAgent(操作系统版本、浏览器内核、浏览器版本)|
| time_local_string | String | true | 格式化后的时间 |
|id               | String | true | 唯一id|
|performance      | Object | true | 性能监控 |
|::timing         | Object | true | 统计各阶段耗时 |
|::memory         | Object | true | 内存占用情况 |

#### ajax网络异常日志字段 

##### Object:LogData
| 字段名 | 值类型 | 是否必传 | 描述及默认值 |
|:------|:------:|:-------:|:-------|
| log_type   | String | true | 错误日志类型, 代码错误或ajax错误 |
| time   | long | true    | 该条日志记录时间 |
| time_local_string | String | true | 格式化后的时间 |
| level  | String | true    | 该条日志的级别，分为 info、warn、error 3 种 |
| messages | Array | true   | 数组的第一个元素是大括号包裹的唯一请求id，之后的所有元素对应调用 logger[level] 依次传入的日志内容: 请求状态、请求耗时、url、请求方式、发送数据、状态码 |
| path    | String  | true   | 该条日志所在页面的 URL |
| user_agent | String   | true   | 该条日志所在页面的用户代理 |
|performance      | Object | true | 性能监控 | 
|::timing         | Object | true | 统计各阶段耗时 |
|::memory         | Object | true | 内存占用情况 |
| click_events | Array(Object) | true | 点击报错时收集到的事件源及html结构路径|
|::height | Number | false | 浏览器高度px |
|::width | Number | false | 浏览器宽度px |
|::x | Number | false | 鼠标位置x坐标 |
|::y | Number | false | 鼠标位置y坐标 |
|::outer_html | String | false | 点击元素标签以及子元素 |
|::path | Array(Object) | false | 点击事件源路径从window到事件源 |
|::::node_name | String | false | 标签名称 |
|::::class_name | String | false | 标签类名 |
|::::id | String | false | 标签ID |

#### 实例方法

##### catchError  手动将错误信息传入队列

一般在框架内部错误被拦截,无法被全局捕获时, 需使用框架自身的捕获报错的方法来将捕获到的异常信息传入上报队列

如vue有config.errorHandler, react有EerrorBoundary和unstable_handleError的方法;

当然如果有特别需要也可以在try catch中使用.

| 参数 | 类型 | 是否必传 | 描述及默认值 |
|:------|:------:|:-------:|:-------:|
| error | Object | true | 错误信息 |

**以vue举例:**
```javascript
// 在main.js中引入后, 自动注册为全局变量
import MonitorWeb from 'monitor-web'

// 将创建的实例赋给vue原型中方便调用
Vue.prototype.$MonitorWeb = new MonitorWeb(
    {
        url: 'http://127.0.0.1:8888', // 上报url 必传!
        maxRetryCount: 5, // 上报重试次数
        reportingCycle: 10000, // 上报周期, 单位:毫秒
        moduleName: 'focus', // 页面项目名称 必传!
        isLog: true, // 是否在控制台打印日志及上报情况
    }
)

// 在vue实例的config.errorHandler方法中, 将完整错误信息传入catchError等待上报
Vue.config.errorHandler = (err, vm, info) => {
  Vue.prototype.$MonitorWeb.catchError(err)
}
```
