import sendErrorWorker from './webworkers/sendError.worker'
import HelloIndexedDB from 'hello-indexeddb'
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
        if (typeof config === 'string') {
            config = {
                url: param,
                maxRetryCount: 5,
                reportingCycle: 10000,
                maxQueueCount: 100,
                moduleName: location.pathname.split('/')[1] || null,
                isLog: true,
                isHump: false
            };
        } else if (typeof config === 'object') {
            if (typeof param.url !== 'string') {
                throw new Error('MonitorWeb初始化错误 - 构造函数的参数 url 必须是一个字符串！');
            }
            if (typeof param.maxRetryCount !== 'number') {
                config.maxRetryCount = 5
            }
            if (typeof param.reportingCycle !== 'number') {
                config.reportingCycle = 10000
            }
            if (typeof param.maxQueueCount !== 'number') {
                config.maxQueueCount = 100
            }
            if (typeof param.moduleName !== 'string') {
                config.moduleName = location.pathname.split('/')[1] || null
            }
            if (typeof param.isLog !== 'boolean') {
                config.isLog = true
            }
            if (typeof param.isHump !== 'boolean') {
                config.isHump = false
            }
        } else {
            throw new Error('MonitorWeb初始化错误 - 构造函数的参数格式不正确！');
        }

        // 日志上报地址
        this.url = config.url;

        // 请求重试次数
        this.retryCount = 1;

        // 日志上报配置
        this.config = config;

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

        // 初始化
        this._init()
    }

    _init () {
        // 生成唯一id
        this.getReqId();

        // 自动记录异常
        this.exceptionHandler();

        // 记录点击操作
        this.exceptionClick();

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
            type: '[onError]',
            messages: error.message || null,
            errorType: error.name,
            path: location.href || null,
            lineNo: error.line || null,
            columnNo: error.column || null,
            error: error.stack || null,
            script: error.script || null,
            isTrusted: error.isTrusted || null,
            time: new Date().getTime(),
            timeLocalString: MonitorWeb._getDateTimeString(new Date()),
            clickEvents: this.clickEvents || null,
            userAgent: navigator.userAgent || null,
            moduleName: this.config.moduleName,
            performance: MonitorWeb.formatPerformance(performance),
            id: this.reqId + '-' + Number(Math.random().toString().substr(2)).toString(36)
        };
        this.queue.push(log);
        if (this.retryCount >= this.config.maxRetryCount) {
            this.send()
        }
    }

    // 清除历史log
    async clearHistory () {
        let history = await idb.getItem('MonitorWeb');
        if (history && history.data.length) {
            this.queue.push(...history.data);
        }
        await idb.delete('MonitorWeb')
    }
    // 记录点击事件
    exceptionClick () {
        document.addEventListener('click',(e) => {
            let path = [];
            e.path.forEach((item) => {
                path.unshift({
                    nodeName: item.nodeName || 'WINDOW',
                    className: item.className || null,
                    id: item.id || null
                })
            });
            this.clickEvents.unshift({
                x: e.pageX,
                y: e.pageY,
                width: window.innerWidth,
                height: window.innerHeight,
                path: path
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
                type: '[onError]',
                messages: error.message || null,
                path: error.filename || null,
                lineNo: error.lineno || null,
                columnNo: error.colno || null,
                error: error.error.stack || null,
                isTrusted: error.isTrusted || null,
                time: new Date().getTime(),
                timeLocalString: MonitorWeb._getDateTimeString(new Date()),
                clickEvents: this.clickEvents || null,
                userAgent: navigator.userAgent || null,
                moduleName: this.config.moduleName,
                performance: MonitorWeb.formatPerformance(performance),
                id: this.reqId + '-' + Number(Math.random().toString().substr(2)).toString(36)
            };
            this.queue.push(log);
            if (this.retryCount >= this.config.maxRetryCount) {
                this.send()
            }
            // return true // <-- 阻止报错向上传递
        });

        // Promise捕获异常
        window.addEventListener('unhandledrejection', (event) => {
            let performance = window.performance ||
                window.msPerformance ||
                window.webkitPerformance;
            let log = {
                type: '[onError]',
                messages: event.reason || null,
                path: window.location.href || null,
                errorType: 'PromiseError',
                userAgent: navigator.userAgent || null,
                time: new Date().getTime(),
                timeLocalString: MonitorWeb._getDateTimeString(new Date()),
                clickEvents: this.clickEvents || null,
                moduleName: this.config.moduleName,
                performance: MonitorWeb.formatPerformance(performance),
                id: this.reqId + '-' + Number(Math.random().toString().substr(2)).toString(36)
            };
            this.queue.push(log);
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

    // 将日志添加到队列中
    pushToQueue(time, level, ...args) {
        let performance = window.performance ||
            window.msPerformance ||
            window.webkitPerformance;
        args.unshift(`{${this.reqId + '-' + Number(Math.random().toString().substr(2)).toString(36)}}`);
        this.queue.push({
            type: '[ajax]',
            time: MonitorWeb._getDateTimeString(time),
            moduleName: this.config.moduleName,
            level,
            messages: args,
            path: window.location.href,
            userAgent: navigator.userAgent,
            performance: MonitorWeb.formatPerformance(performance)
        });
        if (this.retryCount >= this.config.maxRetryCount) {
            this.send()
        }
    }

    static formatPerformance (performance) {
        try {
            let timing = performance.timing;
            let memory = performance.memory;
            return {
                times: {
                    readyStart: {
                        value: timing.fetchStart - timing.navigationStart,
                        desc: "准备新页面时间耗时"
                    },
                    redirectTime: {
                        value: timing.redirectEnd - timing.redirectStart,
                        desc: "重定向耗时"
                    },
                    appcacheTime: {
                        value: timing.domainLookupStart - timing.fetchStart,
                        desc: "Appcache 耗时"
                    },
                    unloadEventTime: {
                        value: timing.unloadEventEnd - timing.unloadEventStart,
                        desc: "unload 前文档耗时"
                    },
                    lookupDomainTime: {
                        value: timing.domainLookupEnd - timing.domainLookupStart,
                        desc: "DNS 查询耗时"
                    },
                    connectTime: {
                        value: timing.connectEnd - timing.connectStart,
                        desc: "TCP连接耗时"
                    },
                    requestTime: {
                        value: timing.responseEnd - timing.requestStart,
                        desc: "request请求耗时"
                    },
                    initDomTreeTime: {
                        value: timing.domInteractive - timing.responseEnd,
                        desc: "请求完毕至DOM加载"
                    },
                    domReadyTime: {
                        value: timing.domContentLoadedEventEnd - timing.navigationStart,
                        desc: "DOM加载完成"
                    },
                    whiteScreenTime: {
                        value: timing.responseStart - timing.navigationStart,
                        desc: "白屏时间"
                    },
                    loadTime: {
                        value: timing.loadEventEnd - timing.navigationStart,
                        desc: "从开始至onload总耗时"
                    }
                },
                memory: {
                    jsHeapSizeLimit: {
                        value: memory.jsHeapSizeLimit,
                        desc: "内存大小限制"
                    },
                    totalJSHeapSize: {
                        value: memory.totalJSHeapSize,
                        desc: "可使用的内存"
                    },
                    usedJSHeapSize: {
                        value: memory.usedJSHeapSize,
                        desc: "JS 对象（包括V8引擎内部对象）占用的内存数"
                    },
                    tip: "通常，usedJSHeapSize不能大于totalJSHeapSize，如果大于，有可能出现了内存泄漏。"
                }
            };
        } catch (e) {}
    }

    //处理日志队列
    send () {
        if (this.queue && this.queue.length) {
            this.saveError()
        }
    }

    // 存储日志队列
    saveError () {
        // 创建多线程处理队列
        let worker = new sendErrorWorker();

        // 每次最多上报数条
        let data = {
            config: this.config,
            queue: this.queue.slice(0, this.config.maxQueueCount)
        };

        worker.postMessage(JSON.stringify(data));

        worker.onmessage = async (event) => {

            // 上报成功, 清除队列
            if (event.data === MonitorWeb.workerEnmu.done) {
                this.queue = [];
                this.retryCount = 1
            }

            if (event.data === MonitorWeb.workerEnmu.retry) {
                if (this.retryCount >= this.config.maxRetryCount) {
                    clearInterval(this.timer);
                    if (this.config.isLog) console.error(`发送日志请求的连续失败次数过多，已停止发送日志。请检查日志接口 ${this.url} 是否正常！`);
                } else {
                    if (this.config.isLog) console.warn('配置地址[' + this.config.url + ']上报失败, 等待下次重试 ' + this.retryCount + '...');
                    await idb.delete('MonitorWeb');
                    this.retryCount ++;
                }
            }

            //会话结束, 释放内存
            worker.terminate();
            worker = null;
        };

    };

    static _stylizeSupport() {
        const isChrome = !!window.chrome;
        const isFirefox = navigator.userAgent.indexOf('Firefox') !== -1;
        return isChrome || isFirefox;
    }
    //获取或者生成唯一请求 id
    getReqId() {
        this.reqId = document.querySelector('[name="_reqId"]') ? document.querySelector('[name="_reqId"]')
            .content : '';
        if (!this.reqId) {
            this.reqId = window._reqId;
        }
        if (this.reqId) {
            // 存在 reqId，说明这是一个服务器端生成的页面，设置一个标示
            this.idFromServer = true;
        } else {
            // 如果不存在 reqId，说明这是一个纯前端的页面，就自己生成一个 reqId https://stackoverflow.com/questions/105034/create-guid-uuid-in-javascript/8809472#8809472
            let time = Date.now();
            if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
                // 使用更高精度的时间
                time += performance.now();
            }
            this.reqId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, char => {
                const rand = (time + (Math.random() * 16)) % 16 | 0;
                time = Math.floor(time / 16);
                return (char === 'x' ? rand : ((rand & 0x3) | 0x8))
                    .toString(16);
            });
            this.idFromServer = false;
        }
    }

    static _getTimeString(time) {
        const now = (time === null ? new Date() : time);

        // 时
        let hour = String(now.getHours());
        if (hour.length === 1) {
            hour = `0${hour}`;
        }

        // 分
        let minute = String(now.getMinutes());
        if (minute.length === 1) {
            minute = `0${minute}`;
        }

        // 秒
        let second = String(now.getSeconds());
        if (second.length === 1) {
            second = `0${second}`;
        }

        // 毫秒
        let millisecond = String(now.getMilliseconds());
        if (millisecond.length === 1) {
            millisecond = `00${millisecond}`;
        } else if (millisecond.length === 2) {
            millisecond = `0${millisecond}`;
        }

        return `${hour}:${minute}:${second}.${millisecond}`;
    }

    // 获取日期时间字符串
    static _getDateTimeString(time) {
        const now = (time === null ? new Date() : time);

        // 年
        const year = String(now.getFullYear());

        // 月
        let month = String(now.getMonth() + 1);
        if (month.length === 1) {
            month = `0${month}`;
        }

        // 日
        let day = String(now.getDate());
        if (day.length === 1) {
            day = `0${day}`;
        }

        return `${year}-${month}-${day} ${MonitorWeb._getTimeString(now)}`;
    }

    // 调用系统 console 打印日志
    _printConsole(time, level, ...args) {
        if (console && this.config.isLog) {
            if (this.stylize) {
                console[level](`%c[${MonitorWeb._getTimeString(time)}] [${level.toUpperCase()}] -`, `color: ${MonitorWeb.colorEnum[level]}`, ...args);
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
export default MonitorWeb
