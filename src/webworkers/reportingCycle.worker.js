import axios from 'axios'
let IndexedDB = require('hello-indexeddb');
globalThis.HelloIndexedDB = IndexedDB;
const { HelloIndexedDB } = globalThis.HelloIndexedDB;
let idb = new HelloIndexedDB();
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

// 定期清理及上报
function clearDB () {
    errorTypes.map(async (errType) => {
        let errJSON = [];
        try {
            errJSON = await idb.getItem(errType) || [];
        } catch (e) {
            console.log(e);
        }
        if (errJSON && errJSON.length) {
            sendError(errJSON[errJSON.length -1].config, errJSON);
            idb.delete(errType)
        }
    })
}
