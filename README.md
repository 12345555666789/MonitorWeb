### web前端日志收集及埋点上报方案

##### 安装
###### 版本V2.0.5
```
npm install monitor-web --save
```
##### 导入
功能分为`MonitorWeb`异常监控, 和`AnalysisWeb`埋点分析两部分, 可根据需要导入
```javascript
import {MonitorWeb, AnalysisWeb} from 'monitor-web'
```

#### 一、前端异常日志采集与上报

通过收集前端异常报错信息, 帮助开发者判断线上项目产生的问题;

适用大部分前端项目、PC、移动端、框架、原生

`注意`由于使用了indexDB作为本地存储, 暂不支持服务端渲染 

上报接口请求方式为`POST`, 暂不支持更改

##### 使用方法

##### js api配置项

| 字段名 | 值类型 | 是否必传 | 描述及默认值 |
|:------|:------:|:-------:|:-------|
| config | Object | true    |配置对象 |
|config::url   | String |  true   | 上报接口url 必传 |
|config::maxRetryCount | Number | false | 日志上报失败重试次数, 默认值: 5 |
|config::reportingCycle | Number | false | 日志自动上报/清理周期, 单位/毫秒,默认值:10000|
|config::moduleName | String  |  true | 页面模块名称, 必传 |
|config::isLog | Boolean | false | 是否在控制台打印上报情况, 默认值:true |

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

##### 实例方法

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
import {MonitorWeb} from 'monitor-web'

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

##### 日志上报内容
**接口及参数样例:**
##### POST /weblog/logreport
| 字段名 | 值类型 | 是否必传 | 描述及默认值 |
|:------|:------:|:-------:|:-------|
| config | Object | true    |配置对象 |
|::url   | String |  true   | 上报接口url|
|::max_retry_count | Number | true | 日志上报失败重试次数, 默认值: 5 |
|::reporting_cycle | Number | true | 日志自动上报/清理周期, 单位/毫秒,默认值:10000|
|::module_name | String  |  true | 页面模块名称, 必传 |
|::is_log | boolean | true | 是否在控制台打印上报情况, 默认值:true|
|data    | Array(LogData)| true | 异常日志 |

##### 代码逻辑异常日志字段
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
|uuid             | String | true | 设备唯一ID |

##### ajax网络异常日志字段 

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
|uuid             | String | true | 设备唯一ID |


---

#### 二、埋点分析

通过手动埋点方式, 收集用户操作信息, 帮助产品对用户行为以及各功能流程进行统计分析;

##### 使用方法

##### js api配置项
| 字段名 | 值类型 | 是否必传 | 描述及默认值 |
|:------|:------:|:-------:|:-------|
| config | Object | true    |配置对象 |
|config::url | String | true | 埋点上报接口Url |
|config::appid | String | true | 分析用户下appID |
|config::appName | String | true | app名称 |

##### 创建实例
```javascript
    new AnalysisWeb({ // 埋点相关配置
 		url: 'http://127.0.0.1:8888', // 埋点接口url, 必传
 		appid: '1000101', // 用户下该应用ID, 必传
 		appName: '本地测试应用' // 应用名称, 必传
    });
```


##### 实例方法

##### clickStat 埋点上报
将方法放入需要埋点的流程代码中执行;

例如: 页面初始化、 登录、 注册成功、 跳转页面、游戏开始、游戏得分、游戏结束等关键步骤流程;

| 参数 | 类型 | 是否必传 | 描述及默认值 |
|:------|:------:|:-------:|:-------:|
| eventName | String | true | 埋点事件名 |
| params | Any | false | 埋点自定义携带的参数 |

例:

```javascript
// 创建实例
    let analysis = new AnalysisWeb({ // 埋点相关配置
        	url: 'http://127.0.0.1:8888', // 埋点接口url, 不传则默认使用日志上报url
            appid: '1000101', // 用户下该应用ID, 必传
            appName: '本地测试应用' // 应用名称, 如不传则默认使用moduleName
    });

// 在流程中调用
    analysis.clickStat('initPage', '进入页面')
// ...
    analysis.clickStat('login', {
        name: '登陆成功',
        userID: 'XXX'
    })
// ...
    analysis.clickStat('loadList', [
        {adName: '广告1', id: 'XXX'},
        {adName: '广告2', id: 'XXX'},
        {adName: '广告3', id: 'XXX'},
        {adName: '广告4', id: 'XXX'},
        {adName: '广告5', id: 'XXX'}
    ])
```

**接口及参数样例:**
##### POST /weblog/logreport
| 字段名 | 值类型 | 是否必传 | 描述及默认值 |
|:------|:------:|:-------:|:-------|
| config | Object | true    |配置对象 |
|config::url | String | true | 埋点上报接口Url |
|config::appid | String | true | 分析用户下appID |
|config::appName | String | true | app名称 |
|data | Array(Object) | true | 埋点数据 |
| data::point_params    | Any | false | 埋点自定义携带参数 |
| data::point_name | String | false | 埋点事件名 |
| data::uuid | String | true | 设备ID |
| data::user_agent | Object | true | 用户代理信息 |
| data::performance | Object | true | 性能信息 |
| data::time_local_string | String | true | 上报时间 |
