import axios from 'axios'
import HelloIndexedDB from '../indb/hello-indexeddb'
import Fn from '../function'

let config = {};

// 保存并上报错误日志
onmessage = async (event) => {
    let data = JSON.parse(event.data);
    let queue = data.queue;
    self.idb = null;
    self.isFile = data.isFile;
    let newErrorJSON = {
        data: Fn.analysisError(queue),
        config: data.config
    };
    config = newErrorJSON.config;
    if (indexedDB) {
        !self.isFile ? self.idb = new HelloIndexedDB() : null;
        !self.isFile ? await self.idb.delete('MonitorWeb') : null;
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
        await sendError(config, oldErrorJSON);
    } else {
        await sendError(config, newErrorJSON);
    }
};

let sendError = async (config, errorJSON) => {
    if (!config.isHump) {
        delete  config.isHump
        Fn.jsonToUnderline(errorJSON)
    }
    postMessage('PENDING');
    await axios.post(config.url, errorJSON).then(async (res) => {
        if (config.isLog || config.is_log) console.info('%c[' + Fn._getTimeString(new Date()) + '] - ' + errorJSON.data.length + '条日志上报成功！', 'color: green');
        if (indexedDB) {
            !self.isFile ? await self.idb.delete('MonitorWeb') : null;
        }
        postMessage('DONE');
    }).catch(() => {
        postMessage('RETRY');
    });
};
