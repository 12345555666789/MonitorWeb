import PointReportWorker from "./webworkers/pointReport.worker"
import Fn from './function'
export class AnalysisWeb {
	constructor (params) {
		let config = params;
		// 埋点配置
		if (typeof config === 'object') {
			if (typeof config.url !== 'string') {
				throw new Error('Analysis初始化错误 - 构造函数的参数 url 必须是一个字符串！');
			}
			if (!config.appid && typeof config.appid + '' !== 'string') {
				throw new Error('Analysis初始化错误 - 构造函数的参数 config.appid 必须是一个有效字符串或数字！');
			}
		} else {
			throw new Error('Analysis初始化错误 - 构造函数的参数必须是一个对象！');
		}
		// 创建埋点多线程处理
		this.worker = new PointReportWorker();
		// 创建设备唯一ID
		this.uuid = localStorage.getItem('analysis_uuid')
		if (!this.uuid) {
			let uuid = Fn.getReqId()
			localStorage.setItem('analysis_uuid', uuid)
			this.uuid = uuid
		}

		// 是否是file协议
		this.isFile = !!(self.location && self.location.protocol === 'file:');

		// 日志上报配置
		this.config = {
			url: config.url,
			appid: config.appid
		};

		// 日志字段命名使用下划线风格
		this.config.isHump = false

		this._init()
	}
	_init() {
		this.clickStat('-1')
	}
	// 自定义埋点
	clickStat (pointName, params) {
		let paramsString = params
		try {
			if (paramsString) {
				paramsString = JSON.stringify(params)
			}
		} catch (e) {
			paramsString = ''
		}
		let data = {
			config: this.config,
			data: [{
				pointParams: paramsString || '',
				pointName,
				uuid: this.uuid,
				userAgent: navigator.userAgent || null,
				performance: Fn.formatPerformance(performance),
				timeLocalString: Fn._getDateTimeString(new Date())
			}],
		};
		this.worker.postMessage(JSON.stringify(data));
	}
}
