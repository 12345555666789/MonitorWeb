# monitor-web
### web前端日志及上报方案

目的就是想帮助开发者第一时间能够知晓线上项目的异常情况, 最好是通过日志的信息就可以判断问题

目前这个脚本的功能就是通过监听一些事件, 来收集异常的信息, 一旦出现异常报错就添加到"队列", 定时器每过一段时间就会把队列中的异常日志上报到服务器中
如果上报失败就暂存到本地indexDB存储等待下次上报

理论上适用大部分前端项目、PC、移动端、框架、原生。

使用了webworker 分别处理日志分类以及上报请求

只采集报错异常的相关信息

#### 使用方法

##### 安装

```
npm install monitor-web --save
```
##### 引入
```javascript
// 自动注册为全局变量
import 'monitor-web'
or
require('monitor-web')
```
**CDN**
```
<script src="目前还不行"></script>
```

##### 创建实例
``` javascript
	new MonitorWeb('传入上报接口url及配置')
例如:
	new MonitorWeb('http://127.0.0.1:8888')
or:
    new MonitorWeb({
        url: 'http://127.0.0.1:8888', // 上报url
        maxRetryCount: 5, // 上报重试次数
        reportingCycle: 100000, // 上报周期, 单位:毫秒
        moduleName: 'SenseAd-focus', // 页面项目名称
        isLog: true // 是否在控制台打印日志及上报情况
    });
```

#### js api配置项

| 字段名 | 值类型 | 是否必传 | 描述及默认值 |
|:------|:------:|:-------:|:-------:|
| config | Object | true    |配置对象,创建实例时传入, 默认值: 无 |
|::url   | String |  true   | 上报接口url|
|::maxRetryCount | Number | false | 日志上报失败重试次数, 默认值: 5 |
|::reportingCycle | Number | false | 日志自动上报/清理周期, 单位/毫秒,默认值:100000|
|::moduleName | Number  |  false | 页面模块名称, 如不传则取页面url路径部分第一级 |
|::isLog | String | false | 是否在控制台打印上报情况|

#### 代码逻辑异常日志字段
| 字段名 | 值类型 | 是否必传 | 描述及默认值 |
|:------|:------:|:-------:|:-------:|
| type   | String | true | 错误类型, 代码错误或ajax错误 |
| clickEvents | Array(Object) | true | 点击报错时收集到的事件源及html结构路径|
|::height | Number | false | 浏览器高度px |
|::width | Number | false | 浏览器宽度px |
|::x | Number | false | 鼠标位置x坐标 |
|::y | Number | false | 鼠标位置y坐标 |
|::path | Array(Object) | false | 点击事件源路径从window到事件源 |
|::::nodeName | String | false | 标签名称 |
|::::className | String | false | 标签类名 |
|::::id | String | false | 标签ID |
| columnNo | Number | true  | 报错代码起始列|
| lineNo  | Number | true | 报错代码起始行 |
| errorType | String | true | 错误类型 |
| error | String | true | 完整异常信息 | 
| isTrusted | String | true | 是否为用户操作事件导致的异常 |
| msg | String | true | 异常信息 |
| path | String | true | 页面路径 |
| time | long | true | 异常产生时间戳 |
| userAgent | String | true | 用户信息Navigator.userAgent(操作系统版本、浏览器内核、浏览器版本)|
| timeLocalString | String | true | 格式化后的时间 |
|id               | String | true | 唯一id|

#### ajax网络异常日志字段 
这里引用了lajax的重写XHR的方法

| 字段名 | 值类型 | 是否必传 | 描述及默认值 |
|:------|:------:|:-------:|:-------:|
| type   | String | true | 错误类型, 代码错误或ajax错误 |
| time   | String | true    | 该条日志记录时间 |
| level  | String | true    | 该条日志的级别，分为 info、warn、error 3 种 |
| messages | Array | true   | 数组的第一个元素是大括号包裹的唯一请求id，之后的所有元素对应调用 logger[level] 依次传入的日志内容: 请求状态、请求耗时、url、请求方式、发送数据、状态码 |
| url    | String  | true   | 该条日志所在页面的 URL |
| userAgent | String   | true   | 该条日志所在页面的用户代理 

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
import 'monitor-web'

// 将创建的实例赋给vue原型中方便调用
Vue.prototype.$MonitorWeb = new MonitorWeb('http://127.0.0.1:8888')

// 在vue实例的config.errorHandler方法中, 将完整错误信息传入catchError等待上报
Vue.config.errorHandler = (err, vm, info) => {
  Vue.prototype.$MonitorWeb.catchError(err)
}
```
