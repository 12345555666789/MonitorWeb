import axios from 'axios'
import HelloIndexedDB from 'hello-indexeddb'
let config = {};

// 定义错误类型
const errorTypes = [
    'SyntaxError', // 语法错误
    'ReferenceError', // 引用错误
    'RangeError', // 范围错误
    'TypeError', // 类型错误
    'URLError', // URL错误
    'EvalError', // Eval错误
    'promiseError' // 异步错误
];
function analysisError (data) {
    let errors = [...data];
    errors.forEach(item => {
        if (item.logType === '[onError]' && !item.errorType && item.messages) {
            item.errorType = errorTypes.find(errorType => item.messages.indexOf(errorType) !== -1)
        }
    });
    return errors
}

// 保存并上报错误日志
onmessage = async (event) => {
    let data = JSON.parse(event.data);
    let queue = data.queue;
    self.idb = null;
    self.isFile = data.isFile;
    !self.isFile ? self.idb = new HelloIndexedDB() : null;
    !self.isFile ? await self.idb.delete('MonitorWeb') : null;
    let newErrorJSON = {
        data: analysisError(queue),
        config: data.config
    };
    config = newErrorJSON.config;
    let oldErrorJSON = {};
    try {
        if (!self.isFile) {
            oldErrorJSON = await self.idb.getItem('MonitorWeb') || {};
        } else {
            oldErrorJSON = {}
        }
    } catch (e) {
        if (config.isLog) console.error(e);
    }
    if (oldErrorJSON.data && oldErrorJSON.data.length) {
        oldErrorJSON.data.push(...newErrorJSON.data)
    } else {
        oldErrorJSON = newErrorJSON
    }
    try {
        !self.isFile ? await self.idb.setItem('MonitorWeb', oldErrorJSON) : null;
    } catch (e) {
        if (config.isLog) console.error(e);
    }
    sendError(config, oldErrorJSON);
};

let sendError = (config, errorJSON) => {
    if (!config.isHump) {
        delete  config.isHump
        jsonToUnderline(errorJSON)
    }
    postMessage('PENDING');
    axios.post(config.url, errorJSON).then(async (res) => {
        if (config.isLog || config.is_log) console.info('%c[' + _getTimeString(new Date()) + '] - ' + errorJSON.data.length + '条日志上报成功！', 'color: green');
        !self.isFile ? await self.idb.delete('MonitorWeb') : null;
        postMessage('DONE');
    }).catch(() => {
        postMessage('RETRY');
    });
};

function _getTimeString(time) {
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

function hump2Underline(s) {
    return s.replace(/([A-Z])/g, '_$1').toLowerCase()
}

function jsonToUnderline(obj) {
    if (obj instanceof Array) {
        obj.forEach(function(v, i) {
            jsonToUnderline(v)
        })
    } else if (obj instanceof Object) {
        Object.keys(obj).forEach(function(key) {
            let newKey = hump2Underline(key);
            if (newKey !== key) {
                obj[newKey] = obj[key];
                delete obj[key]
            }
            jsonToUnderline(obj[newKey])
        })
    }
}
