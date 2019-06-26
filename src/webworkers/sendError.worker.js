import axios from 'axios'
let IndexedDB = require('hello-indexeddb');
globalThis.HelloIndexedDB = IndexedDB;
const { HelloIndexedDB } = globalThis.HelloIndexedDB;
let idb = new HelloIndexedDB();
let config = {};
sendErrorWorker();

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
        errorTypes.map((item1) => {
            if (item.messages.includes(item1)) {
                item.errType = item1
            }
        });
    });
    return errors
}

// 保存并上报错误日志
function sendErrorWorker () {
    onmessage = async (event) => {
        await idb.delete('MonitorWeb');
        let data = JSON.parse(event.data);
        let queue = data.queue;
        let newErrorJSON = {
            data: analysisError(queue),
            config: data.config
        };
        config = newErrorJSON.config;
        let oldErrorJSON = {};
        try {
            oldErrorJSON = await idb.getItem('MonitorWeb') || {};
        } catch (e) {
            if (config.isLog) console.log(e);
        }
        if (oldErrorJSON.data && oldErrorJSON.data.length) {
            oldErrorJSON.data.push(...newErrorJSON.data)
        } else {
            oldErrorJSON = newErrorJSON
        }
        try {
            await idb.setItem('MonitorWeb', oldErrorJSON);
        } catch (e) {
            if (config.isLog) console.log(e);
        }
        sendError(config, oldErrorJSON.data);
    }
}

let sendError = (config, errorJSON) => {
    axios.post(config.url, errorJSON).then(async (res) => {
        if (config.isLog) console.log(errorJSON.length + '条日志上报成功');
        await idb.delete('MonitorWeb');
        postMessage('DONE');
    }).catch(() => {
        postMessage('RETRY');
    });
};
