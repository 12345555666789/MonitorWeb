import axios from 'axios'
let HelloIndexedDB = require('hello-indexeddb');
globalThis.HelloIndexedDB = HelloIndexedDB;
sendErrorWorker();
// 定义错误类型
function analysisError (errorStr) {
    const errorTypes = [
        'SyntaxError', // 语法错误
        'ReferenceError', // 引用错误
        'RangeError', // 范围错误
        'TypeError', // 类型错误
        'URLError', // URL错误
        'EvalError', // Eval错误
        'promiseError' // 异步错误
    ]
    let errorJSON = {...JSON.parse(errorStr)};
    errorTypes.map((item) => {
        if (errorStr.includes(item)) {
            errorJSON.errType = item
        }
    })
    return errorJSON
}

// 保存并上报错误日志
function sendErrorWorker () {
    const { HelloIndexedDB } = globalThis.HelloIndexedDB;
    let idb = new HelloIndexedDB();
    onmessage = async (event) => {
        let newErrorJSON = analysisError(event.data);
        let oldErrorJSON = {};
        let retryCount = 0;
        try {
            oldErrorJSON = await idb.getItem(newErrorJSON.errType);
        } catch (e) {}
        if (oldErrorJSON && oldErrorJSON.length) {
            oldErrorJSON.push(newErrorJSON)
        } else {
            oldErrorJSON = [newErrorJSON]
        }
        try {
            await idb.setItem(newErrorJSON.errType, oldErrorJSON);
        } catch (e) {}
        let sendError = () => {
            axios.post(newErrorJSON.config.url, newErrorJSON).then((res) => {
                postMessage('done!')
            }).catch(() => {
                if (retryCount <= newErrorJSON.config.retryCount) {
                    retryCount ++;
                    sendError();
                } else {
                    postMessage('Failed')
                }
            });
        }
        sendError();
    }
}
