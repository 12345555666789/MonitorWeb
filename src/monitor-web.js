import SendErrorWorker from './webworkers/sendError.worker'
import Fn from './function'
import HelloIndexedDB from './indb/hello-indexeddb'
let idb = new HelloIndexedDB();
// 使 Error 对象支持 JSON 序列化
if (!('toJSON' in ErrorEvent.prototype)) {
    Object.defineProperty(ErrorEvent.prototype, 'toJSON', {
        value() {
            const alt = {};
            Object.getOwnPropertyNames(this)
                .forEach(function (key) {
                    alt[key] = this[key];
                }, this);
            return alt;
        },
        configurable: true,
        writable: true
    });
}

export class MonitorWeb {
    constructor(param) {
        let config = param;
        if (typeof config === 'undefined') {
            throw new Error('MonitorWeb初始化错误 - 构造函数的参数不能为空！');
        }
        if (typeof config === 'object') {
            if (typeof param.url !== 'string') {
                throw new Error('MonitorWeb初始化错误 - 构造函数的参数 url 必须是一个字符串！');
            }
            if (typeof param.maxRetryCount !== 'number') {
                config.maxRetryCount = 5
            }
            if (typeof param.reportingCycle !== 'number') {
                config.reportingCycle = 10000
            }
            if (typeof param.moduleName !== 'string') {
                throw new Error('MonitorWeb初始化错误 - 构造函数的参数 moduleName 必须是一个字符串！');
            }
            if (typeof param.isLog !== 'boolean') {
                config.isLog = true
            }
        } else {
            throw new Error('MonitorWeb初始化错误 - 构造函数的参数格式不正确！');
        }

        // 日志最大存储与上报数量
        this.maxQueueCount = 100

        // 创建多线程处理队列
        this.worker = new SendErrorWorker();

        // 是否是file协议
        this.isFile = window.location.protocol === 'file:';

        // 创建设备唯一ID
        this.uuid = ''
        if (!this.isFile) {
            this.uuid = localStorage.getItem('monitor_uuid')
            if (!this.uuid) {
                let uuid = Fn.getReqId()
                localStorage.setItem('monitor_uuid', uuid)
                this.uuid = uuid
            }
        }

        // 日志上报地址
        this.url = config.url;

        // 请求重试次数
        this.retryCount = 1;

        // 日志上报配置
        this.config = config;

        // 日志字段命名使用下划线风格
        this.config.isHump = false

        // 上报请求状态
        this.sendStatus = MonitorWeb.workerEnmu.ready;

        // 是否要格式化 console 打印的内容
        this.stylize = config.stylize == null ? true : config.stylize;

        this.stylize = this.stylize && MonitorWeb._stylizeSupport();

        // 异常日志队列
        this.queue = [];

        // 点击事件源路径
        this.clickEvents = [];

        // 是否自动记录未捕获错误
        this.autoLogError = config.autoLogError == null ? true : config.autoLogError;

        // 是否自动记录 Promise 错误
        this.autoLogRejection = config.autoLogRejection == null ? true : config.autoLogRejection;

        // 是否自动记录 ajax
        this.autoLogAjax = config.autoLogAjax == null ? true : config.autoLogAjax;

        // 默认的 ajax 自动记录情况过滤
        const defaultLogAjaxFilter = (ajaxUrl, ajaxMethod) => true;

        // ajax 自动记录情况过滤，返回 true 代表要记录日志，false 代表不记录日志
        this.logAjaxFilter = config.logAjaxFilter == null ? defaultLogAjaxFilter : config.logAjaxFilter;

        // xhr 原生 open 方法
        this.xhrOpen = XMLHttpRequest.prototype.open;

        // xhr 原生 send 方法
        this.xhrSend = XMLHttpRequest.prototype.send;

        this.isIE = !!window.ActiveXObject || "ActiveXObject" in window

        // 初始化
        this._init()
    }

    _init () {
        // 记录点击操作
        this.exceptionClick();

        // 自动记录异常
        this.exceptionHandler();

        // 自动记录ajax请求异常
        this.ajaxHandler();

        //清理历史log
        this.clearHistory();

        // 定时检查上报
        this.timer = setInterval(() => {
            this.send()
        }, this.config.reportingCycle)
    }

    // 将框架捕获的报错添加至队列
    catchError (error) {
        let performance = window.performance ||
            window.msPerformance ||
            window.webkitPerformance;
        let log = {
            logType: '[onError]',
            messages: error.message || null,
            errorType: error.name,
            path: location.href || null,
            lineNo: error.line || null,
            columnNo: error.column || null,
            error: error.stack || null,
            script: error.script || null,
            isTrusted: error.isTrusted || null,
            time: new Date().getTime(),
            timeLocalString: Fn._getDateTimeString(new Date()),
            clickEvents: [...this.clickEvents] || null,
            userAgent: navigator.userAgent || null,
            moduleName: this.config.moduleName,
            performance: Fn.formatPerformance(performance),
            id: Fn.getReqId() + '-' + Number(Math.random().toString().substr(2)).toString(36),
            uuid: this.uuid
        };
        this.queue.unshift(log);
        if (this.retryCount >= this.config.maxRetryCount) {
            this.send()
        }
    }

    // 清除历史log
    async clearHistory () {
        if (!this.isFile) {
            let history = await idb.getItem('MonitorWeb');
            if (history && history.data.length) {
                this.queue.unshift(...history.data);
            }
            await idb.delete('MonitorWeb')
        }
    }
    // 记录点击事件
    exceptionClick () {
        document.addEventListener('click',(e) => {
            let path = [];
            this.clickEvents = [];
            if (e.path) {
                e.path.forEach((item) => {
                    path.unshift({
                        nodeName: item.nodeName || 'WINDOW',
                        className: item.className || null,
                        id: item.id || null
                    })
                });
            }
            this.clickEvents.unshift({
                x: e.pageX,
                y: e.pageY,
                width: window.innerWidth,
                height: window.innerHeight,
                path: path,
                outerHtml: e.target.outerHTML
            });
        });
    }

    // 自动捕获异常
    exceptionHandler () {
        // 页面onerror捕获异常
        window.addEventListener('error', (error) => {
            let performance = window.performance ||
                window.msPerformance ||
                window.webkitPerformance;
            let log = {
                logType: '[onError]',
                messages: error.message || null,
                path: error.filename || null,
                lineNo: error.lineno || null,
                columnNo: error.colno || null,
                error: error.error.stack || null,
                isTrusted: error.isTrusted || null,
                time: new Date().getTime(),
                timeLocalString: Fn._getDateTimeString(new Date()),
                clickEvents: [...this.clickEvents] || null,
                userAgent: navigator.userAgent || null,
                moduleName: this.config.moduleName,
                performance: Fn.formatPerformance(performance),
                id: Fn.getReqId() + '-' + Number(Math.random().toString().substr(2)).toString(36),
                uuid: this.uuid
            };
            this.queue.unshift(log);
            if (this.retryCount >= this.config.maxRetryCount) {
                this.send()
            }
        });

        // Promise捕获异常
        window.addEventListener('unhandledrejection', (event) => {
            let performance = window.performance ||
                window.msPerformance ||
                window.webkitPerformance;
            let log = {
                logType: '[onError]',
                messages: event.reason || null,
                path: window.location.href || null,
                errorType: 'PromiseError',
                userAgent: navigator.userAgent || null,
                time: new Date().getTime(),
                timeLocalString: Fn._getDateTimeString(new Date()),
                clickEvents: [...this.clickEvents] || null,
                moduleName: this.config.moduleName,
                performance: Fn.formatPerformance(performance),
                id: Fn.getReqId() + '-' + Number(Math.random().toString().substr(2)).toString(36),
                uuid: this.uuid
            };
            this.queue.unshift(log);
            if (this.retryCount >= this.config.maxRetryCount) {
                this.send()
            }
        });
    }

    // 解析 url
    static resolveUrl(url) {
        const link = document.createElement('a');
        link.href = url;
        return `${link.protocol}//${link.host}${link.pathname}${link.search}${link.hash}`;
    }

    // 自动记录ajax请求异常
    ajaxHandler() {
        if (this.autoLogAjax) {
            const that = this;

            // 重写 open 方法
            XMLHttpRequest.prototype.open = function (...args) {
                this._MonitorWebMethod = args[0];
                this._MonitorWebUrl = MonitorWeb.resolveUrl(args[1]);
                that.xhrOpen.apply(this, args);
            };

            // 重写 send 方法
            XMLHttpRequest.prototype.send = function (data) {
                // 请求开始时间
                const startTime = new Date();

                // 添加 readystatechange 事件
                this.addEventListener('readystatechange', function () {
                    // 排除掉用户自定义不需要记录日志的 ajax
                    if (that.logAjaxFilter(this._MonitorWebUrl, this._MonitorWebMethod)) {
                        try {
                            if (this.readyState === XMLHttpRequest.DONE) {
                                // 请求结束时间
                                const endTime = new Date();

                                // 请求耗时
                                const costTime = (endTime - startTime) / 1000;

                                const messages = [];
                                if (this.status >= 200 && this.status < 400) {
                                    messages.push('接口请求成功。');
                                } else {
                                    messages.push('接口请求失败！');
                                }
                                messages.push(`请求耗时：${costTime}s URL：${this._MonitorWebUrl} 请求方式：${this._MonitorWebMethod}`);
                                if (this._MonitorWebMethod.toLowerCase() === 'post') {
                                    messages.push('表单数据：', data);
                                }
                                messages.push(`状态码：${this.status}`);
                                if (this.status >= 200 && this.status < 400) {
                                    // 暂不记录请求成功的状态
                                    // that.info('[ajax]', ...messages);
                                } else {
                                    that.error('[ajax]', ...messages);
                                }

                                if (console && console.group) {
                                    console.groupEnd();
                                }
                            }
                        } catch (err) {
                            const messages = [];
                            messages.push('接口请求出错！');
                            messages.push(`URL：${this._MonitorWebUrl} 请求方式：${this._MonitorWebMethod}`);
                            if (this._MonitorWebMethod.toLowerCase() === 'post') {
                                messages.push('表单数据：', data);
                            }
                            messages.push(`状态码：${this.status}`);
                            messages.push(`ERROR：${err}`);
                            that.error('[ajax]', ...messages);
                        }
                    }
                });

                that.xhrSend.call(this, data);
            };
        }
    }

    // 将ajax日志添加到队列中
    pushToQueue(time, level, ...args) {
        let performance = window.performance ||
            window.msPerformance ||
            window.webkitPerformance;
        this.queue.unshift({
            logType: '[ajax]',
            id: `${Fn.getReqId() + '-' + Number(Math.random().toString().substr(2)).toString(36)}`,
            time: new Date().getTime(),
            timeLocalString: Fn._getDateTimeString(new Date()),
            moduleName: this.config.moduleName,
            level,
            messages: args,
            path: window.location.href,
            userAgent: navigator.userAgent,
            performance: Fn.formatPerformance(performance),
            clickEvents: [...this.clickEvents] || null
        });
        if (this.retryCount >= this.config.maxRetryCount) {
            this.send()
        }
    }

    //处理日志队列
    send () {
        if (this.queue && this.queue.length && this.sendStatus === MonitorWeb.workerEnmu.ready) {
            this.saveError()
        }
    }

    // 使用原生ajax上报
    sendSync (data) {
        let errorJSON = {
            data: Fn.analysisError(data.queue),
            config: data.config
        }
        if (!data.config.isHump) {
            delete data.config.isHump
            Fn.jsonToUnderline(errorJSON)
        }
        Fn.ajax({
            method: 'POST',
            url: data.config.url,
            data: errorJSON,
            async: false
        })
        this.queue = []
    }

    // 存储日志队列
    saveError () {
        // 自动补齐协议及域名
        if (this.config.url.indexOf('http') === -1) {
            let origin = window.location.origin;
            if (this.config.url.indexOf('/') === 0) {
                this.config.url = origin + this.config.url
            } else {
                this.config.url = origin + '/' + this.config.url
            }
        }

        // 每次最多上报数条
        let data = {
            isFile: this.isFile,
            config: this.config,
            queue: this.queue.slice(0, this.maxQueueCount)
        };
        if (this.isIE) {
            this.sendSync(data)
        } else {
            this.worker.postMessage(JSON.stringify(data));
        }

        this.worker.onmessage = async (event) => {
            // 后台未返回时, 上报状态改为pending, 阻止连续上报
            if (event.data === MonitorWeb.workerEnmu.pending) {
                this.sendStatus = MonitorWeb.workerEnmu.pending
            }

            // 上报成功, 清除队列
            if (event.data === MonitorWeb.workerEnmu.done) {
                this.queue = [];
                this.retryCount = 1;
                !this.isFile ? await idb.delete('MonitorWeb') : null;
                this.sendStatus = MonitorWeb.workerEnmu.ready
            }

            if (event.data === MonitorWeb.workerEnmu.retry) {
                if (this.retryCount >= this.config.maxRetryCount) {
                    clearInterval(this.timer);
                    this.sendStatus = MonitorWeb.workerEnmu.ready;
                    if (this.config.isLog) console.error(`发送日志请求的连续失败次数过多，已停止发送日志。请检查日志接口 ${this.url} 是否正常！`);
                } else {
                    if (this.config.isLog) console.warn('配置地址[' + this.config.url + ']上报失败, 等待下次重试 ' + this.retryCount + '...');
                    !this.isFile ? await idb.delete('MonitorWeb') : null;
                    this.retryCount ++;
                    this.sendStatus = MonitorWeb.workerEnmu.ready;
                }
            }
        };
    };

    static _stylizeSupport() {
        const isChrome = !!window.chrome;
        const isFirefox = navigator.userAgent.indexOf('Firefox') !== -1;
        return isChrome || isFirefox;
    }

    // 调用系统 console 打印日志
    _printConsole(time, level, ...args) {
        if (console && this.config.isLog) {
            if (this.stylize) {
                console[level](`%c[${Fn._getTimeString(time)}] [${level.toUpperCase()}] -`, `color: ${MonitorWeb.colorEnum[level]}`, ...args);
            } else {
                console[level](...args);
            }
        }
    }
    _log(time, level, ...args) {
        // 调用系统 console 打印日志
        this._printConsole(time, level, ...args);

        // 将日志添加到队列中
        this.pushToQueue(time, level, ...args);
    }

    // 记录一条信息日志
    info(...args) {
        this._log(null, MonitorWeb.levelEnum.info, ...args);
    }

    // 记录一条普通日志
    log(...args) {
        this.info(...args);
    }

    // 记录一条警告日志
    warn(...args) {
        this._log(null, MonitorWeb.levelEnum.warn, ...args);
    }

    // 记录一条错误日志
    error(...args) {
        this._log(null, MonitorWeb.levelEnum.error, ...args);
    }
    /* eslint-enable no-console, no-bitwise*/
}
// 日志级别枚举
MonitorWeb.levelEnum = {
    /**
     * 信息
     */
    info: 'info',

    /**
     * 警告
     */
    warn: 'warn',

    /**
     * 错误
     */
    error: 'error',
};

// 日志颜色枚举
MonitorWeb.colorEnum = {
    /**
     * 信息日志颜色，默认宝蓝色
     */
    info: 'DodgerBlue',

    /**
     * 警告日志颜色，默认橘黄色
     */
    warn: 'orange',

    /**
     * 错误日志颜色，默认红色
     */
    error: 'red',

    /**
     * ajax分组颜色，默认紫色
     */
    ajaxGroup: '#800080',

    /**
     * 日志发送成功颜色，默认绿色
     */
    sendSuccess: 'green',

    /**
     * 描述文字颜色，默认粉红色
     */
    desc: '#d30775',
};

// webWorker 返回状态枚举
MonitorWeb.workerEnmu = {
    /**
     * 等待
     */
    ready: 'READY',
    /**
     * 等待
     */
    pending: 'PENDING',
    /**
     * 成功
     */
    done: 'DONE',

    /**
     * 重试
     */
    retry: 'RETRY',

    /**
     * 失败
     */
    failed: 'FAILED'
};
