import sendErrorWorker from './webworkers/sendError.worker'
class MonitorForWeb {
    constructor(param) {
        /**
         * 使 Error 对象支持 JSON 序列化
         */
        if (!('toJSON' in ErrorEvent.prototype)) {
            /* eslint-disable no-extend-native */
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
            /* eslint-enable no-extend-native */
        }
        let config = param;
        if (typeof config === 'undefined') {
            throw new Error('MonitorForWeb初始化错误 - 构造函数的参数不能为空！');
        }
        if (typeof config === 'string') {
            config = {
                url: param,
                retryCount: 5
            };
        } else if (typeof config === 'object') {
            if (typeof param.url !== 'string') {
                throw new Error('MonitorForWeb初始化错误 - 构造函数的参数 url 必须是一个字符串！');
            }
            if (typeof param.retryCount !== 'number') {
                config.retryCount = 5
            }
        } else {
            throw new Error('MonitorForWeb初始化错误 - 构造函数的参数格式不正确！');
        }

        // 日志上报地址
        this.url = config.url;
        this.config = config;
        this._init()
    }

    _init () {
        // 记录点击事件
        this.clickEvents = [];
        window.addEventListener('error', (error) => {
            setTimeout(() => {
                let log = {
                    msg: error.message || null,
                    path: error.filename || null,
                    lineNo: error.lineno || null,
                    columnNo: error.colno || null,
                    error: error.error.stack || null,
                    isTrusted: error.isTrusted,
                    time: new Date().getTime(),
                    clickEvents: this.clickEvents,
                    userAgent: navigator.userAgent
                };
                this.saveError(log);
            }, 500)
            // return true // <-- 阻止报错向上传递
        });
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
            this.clickEvents.splice(30)
        });
        window.addEventListener('unhandledrejection', (event) => {
            this.saveError({promiseError: event.reason})
        });
    }
    saveError (json) {
        json.config = this.config;
        const worker = new sendErrorWorker();

        worker.postMessage(JSON.stringify(json));

        worker.onmessage = function (event) {

            if (event.data === 'done!') {

                worker.terminate();

                console.log('完成上报');

            } else {
                console.log('上报失败, 已保存至本地数据库, 等待下次上传');
            }

        };

    };
}
export default MonitorForWeb
