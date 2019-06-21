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
                path: path
            });
            this.clickEvents.splice(30)
        });
        window.addEventListener('error', (msg, fileUrl, lineNo, columnNo, error) => {
            let stack = null;
            if (error && error.stack) stack = error.stack;
            console.log(msg.toJSON());
            let log = {
                msg: msg || null,
                path: fileUrl || null,
                lineNo: lineNo || null,
                columnNo: columnNo || null,
                error: stack,
                time: new Date().getTime(),
                clickEvents: this.clickEvents,
                userAgent: navigator.userAgent
            };
            this.saveError(log);
            // return true // <-- 阻止报错向上传递
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

            }

        };

    };
}
export default MonitorForWeb
