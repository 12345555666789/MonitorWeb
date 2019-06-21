if (globalThis['hello-indexeddb']) {
    sendError()
} else if (XMLHttpRequest) {
    var xhr = new XMLHttpRequest()
    xhr.open('post', './node_modules/hello-indexeddb/dist/hello-indexeddb.js', true)
    xhr.onreadystatechange = function () {
        if (xhr.readyState === 4 && xhr.status === 200) {
            eval(xhr.response)
            sendError()
        }
    }
    xhr.send()
}

// 定义错误类型
function analysisError (errorStr) {
    let errorTypes = [
        'SyntaxError', // 语法错误
        'ReferenceError', // 引用错误
        'RangeError', // 范围错误
        'TypeError', // 类型错误
        'URLError', // URL错误
        'EvalError', // Eval错误
        'promiseError' // 异步错误
    ]
    let errorJSON = {...JSON.parse(errorStr)}
    errorTypes.map((item) => {
        if (errorStr.includes(item)) {
            errorJSON.errType = item
        }
    })
    return errorJSON
}

// 保存并上报错误日志
function sendError () {
    const { HelloIndexedDB } = globalThis['hello-indexeddb']
    let idb = new HelloIndexedDB()
    onmessage = async function (event) {
        let newErrorJSON = analysisError(event.data)
        let oldErrorJSON = await idb.getItem(newErrorJSON.errType)
        if (oldErrorJSON && oldErrorJSON.length) {
            oldErrorJSON.push(newErrorJSON)
        } else {
            oldErrorJSON = [newErrorJSON]
        }
        await idb.setItem(newErrorJSON.errType, oldErrorJSON)

        if (XMLHttpRequest) {
            var xhr = new XMLHttpRequest()
            xhr.open('post', 'http://127.0.0.1:8888', true)
            xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded')
            xhr.send("error=" + JSON.stringify(event.data) + 'time=' + new Date().getTime())
            xhr.onreadystatechange = function () {
                if (xhr.readyState === 4 && xhr.status === 200) {
                    postMessage('done!')
                }
            }
        }
    }
}
