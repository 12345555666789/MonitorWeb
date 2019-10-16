import axios from 'axios'
let config = {};
// 保存并上报错误日志
onmessage = async (event) => {
	let data = JSON.parse(event.data);
	config = data.config
	sendPoint(config, data);
};

let sendPoint = (config, data) => {
	if (!config.isHump) {
		delete  config.isHump
		jsonToUnderline(data)
	}
	axios.post(config.url, data)
};

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
