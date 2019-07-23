### web前端日志及上报方案

通过收集前端异常报错信息, 帮助开发者判断线上项目产生的问题;

适用大部分前端项目、PC、移动端、框架、原生

`注意`由于使用了indexDB作为本地存储, 所以暂不支持服务端渲染 

上报接口仅支持`POST`请求方式

#### 使用方法

##### 安装

```
npm install monitor-web --save
```
##### 引入
```javascript
import MonitorWeb 'monitor-web'
```
或者使用require引入, 会自动注册为全局变量, 可供直接调用
```javascript
require('monitor-web')
window.MonitorWeb
new MonitorWeb('/*your report url*/')
```
也可以使用静态或动态创建script标签的方式引入效果同require一样
```html
<script src="node_modules/monitor-web/dist/index.js"></script>

```

注意, Vue用这样的方式进入可能会报错

`Uncaught SyntaxError: Unexpected token <`

解决办法是将第三方依赖的 JS 文件放到 /static/utils 目录下，引入路径也改成：
```html
<script src="./static/utils/monitor-web.js"></script>
```

##### 创建实例
`new MonitorWeb('传入上报接口url及配置')`
``` javascript
	new MonitorWeb('http://127.0.0.1:8888')
```
	
或根据需要传入更多配置项
```javascript
    new MonitorWeb({
        url: 'http://127.0.0.1:8888', // 上报url
        maxRetryCount: 5, // 上报重试次数
        reportingCycle: 100000, // 上报周期, 单位:毫秒
        moduleName: 'SenseAd-focus', // 页面项目名称
        isLog: true, // 是否在控制台打印日志及上报情况
		isHump: false // 上传的日志是否使用驼峰命名风格
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
|::isLog | boolean | false | 是否在控制台打印上报情况, 默认值:true|
|::isHump | boolean | false | 日志json的key是否使用驼峰命名, 默认值:false 默认使用下划线规则 |

## 日志上报
**接口及参数样例:**
#### POST /weblog/logreport
| 字段名 | 值类型 | 是否必传 | 描述及默认值 |
|:------|:------:|:-------:|:-------:|
| config | Object | true | js api 配置项|
|::url   | String |  true   | 上报接口url|
|::maxRetryCount | Number | true | 日志上报失败重试次数, 默认值: 5 |
|::reportingCycle | Number | true | 日志自动上报/清理周期, 单位/毫秒,默认值:100000|
|::moduleName | Number  |  true | 页面模块名称, 如不传则取页面url路径部分第一级 |
|::isLog | boolean | true | 是否在控制台打印上报情况|
|::isHump | boolean | false | 日志json的key是否使用驼峰命名, 默认值:false 默认使用下划线规则 |
|data    | Array(LogData)| true | 异常日志 |

#### 代码逻辑异常日志字段
##### Object:LogData
| 字段名 | 值类型 | 是否必传 | 描述及默认值 |
|:------|:------:|:-------:|:-------:|
| logType   | String | true | 错误日志类型, 代码错误或ajax错误 |
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
|performance      | Object | true | 性能监控 |
|::timing         | Object | true | 统计各阶段耗时 |
|::memory         | Object | true | 内存占用情况 |

#### ajax网络异常日志字段 

##### Object:LogData
| 字段名 | 值类型 | 是否必传 | 描述及默认值 |
|:------|:------:|:-------:|:-------:|
| logType   | String | true | 错误日志类型, 代码错误或ajax错误 |
| time   | long | true    | 该条日志记录时间 |
| timeLocalString | String | true | 格式化后的时间 |
| level  | String | true    | 该条日志的级别，分为 info、warn、error 3 种 |
| messages | Array | true   | 数组的第一个元素是大括号包裹的唯一请求id，之后的所有元素对应调用 logger[level] 依次传入的日志内容: 请求状态、请求耗时、url、请求方式、发送数据、状态码 |
| path    | String  | true   | 该条日志所在页面的 URL |
| userAgent | String   | true   | 该条日志所在页面的用户代理 |
|performance      | Object | true | 性能监控 | 
|::timing         | Object | true | 统计各阶段耗时 |
|::memory         | Object | true | 内存占用情况 |

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
import MonitorWeb 'monitor-web'

// 将创建的实例赋给vue原型中方便调用
Vue.prototype.$MonitorWeb = new MonitorWeb('http://127.0.0.1:8888')

// 在vue实例的config.errorHandler方法中, 将完整错误信息传入catchError等待上报
Vue.config.errorHandler = (err, vm, info) => {
  Vue.prototype.$MonitorWeb.catchError(err)
}
```
