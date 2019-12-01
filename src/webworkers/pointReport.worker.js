import axios from 'axios'
import Fn from '../function'

let config = {};
// 保存并上报错误日志
onmessage = async (event) => {
	let data = JSON.parse(event.data);
	config = data.config
	await sendPoint(config, data);
};

let sendPoint = async (config, data) => {
	if (!config.isHump) {
		delete  config.isHump
		Fn.jsonToUnderline(data)
	}
	await axios.post(config.url, data)
};
