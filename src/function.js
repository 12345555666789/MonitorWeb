//生成唯一id
function getReqId() {
	let time = Date.now();
	if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
		// 使用更高精度的时间
		time += performance.now();
	}
	return  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, char => {
		const rand = (time + (Math.random() * 16)) % 16 | 0;
		time = Math.floor(time / 16);
		return (char === 'x' ? rand : ((rand & 0x3) | 0x8))
			.toString(16);
	});
}

// 获取日期时间字符串
function _getDateTimeString(time) {
	const now = (time === null ? new Date() : time);

	// 年
	const year = String(now.getFullYear());

	// 月
	let month = String(now.getMonth() + 1);
	if (month.length === 1) {
		month = `0${month}`;
	}

	// 日
	let day = String(now.getDate());
	if (day.length === 1) {
		day = `0${day}`;
	}

	return `${year}-${month}-${day} ${_getTimeString(now)}`;
}
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

function formatPerformance (performance) {
	try {
		let timing = performance.timing;
		let memory = performance.memory;
		return {
			times: {
				readyStart: {
					value: timing.fetchStart - timing.navigationStart,
					desc: "准备新页面时间耗时"
				},
				redirectTime: {
					value: timing.redirectEnd - timing.redirectStart,
					desc: "重定向耗时"
				},
				appcacheTime: {
					value: timing.domainLookupStart - timing.fetchStart,
					desc: "Appcache 耗时"
				},
				unloadEventTime: {
					value: timing.unloadEventEnd - timing.unloadEventStart,
					desc: "unload 前文档耗时"
				},
				lookupDomainTime: {
					value: timing.domainLookupEnd - timing.domainLookupStart,
					desc: "DNS 查询耗时"
				},
				connectTime: {
					value: timing.connectEnd - timing.connectStart,
					desc: "TCP连接耗时"
				},
				requestTime: {
					value: timing.responseEnd - timing.requestStart,
					desc: "request请求耗时"
				},
				initDomTreeTime: {
					value: timing.domInteractive - timing.responseEnd,
					desc: "请求完毕至DOM加载"
				},
				domReadyTime: {
					value: timing.domContentLoadedEventEnd - timing.navigationStart,
					desc: "DOM加载完成"
				},
				whiteScreenTime: {
					value: timing.responseStart - timing.navigationStart,
					desc: "白屏时间"
				},
				loadTime: {
					value: timing.loadEventEnd - timing.navigationStart,
					desc: "从开始至onload总耗时"
				}
			},
			memory: {
				jsHeapSizeLimit: {
					value: memory.jsHeapSizeLimit,
					desc: "内存大小限制"
				},
				totalJSHeapSize: {
					value: memory.totalJSHeapSize,
					desc: "可使用的内存"
				},
				usedJSHeapSize: {
					value: memory.usedJSHeapSize,
					desc: "JS 对象（包括V8引擎内部对象）占用的内存数"
				},
				tip: "通常，usedJSHeapSize不能大于totalJSHeapSize，如果大于，有可能出现了内存泄漏。"
			}
		};
	} catch (e) {}
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

function ajax(opt) {
	opt = opt || {};
	opt.method = opt.method.toUpperCase() || 'POST';
	opt.url = opt.url || '';
	opt.async = typeof opt.async !== 'boolean' ? opt.async : true;
	opt.data = opt.data || null;
	opt.success = opt.success || function () {};
	var xmlHttp = null;
	if (XMLHttpRequest) {
		xmlHttp = new XMLHttpRequest();
	}
	else {
		xmlHttp = new ActiveXObject('Microsoft.XMLHTTP');
	}
	var params = [];
	for (var key in opt.data){
		params.push(key + '=' + opt.data[key]);
	}
	var postData = params.join('&');
	if (opt.method.toUpperCase() === 'POST') {
		xmlHttp.open(opt.method, opt.url, opt.async);
		xmlHttp.send(JSON.stringify(opt.data));
	}
	else if (opt.method.toUpperCase() === 'GET') {
		xmlHttp.open(opt.method, opt.url + '?' + postData, opt.async);
		xmlHttp.send(null);
	}
	xmlHttp.onreadystatechange = function () {
		if (xmlHttp.readyState === 4 && xmlHttp.status === 200) {
			opt.success(xmlHttp.responseText);
		}
	};
}

// 定义错误类型
const errorTypes = [
	'SyntaxError', // 语法错误
	'ReferenceError', // 引用错误
	'RangeError', // 范围错误
	'TypeError', // 类型错误
	'URLError', // URL错误
	'EvalError', // Eval错误
	'promiseError' // 异步错误
]

function analysisError (data) {
	let errors = [...data]
	errors.forEach(item => {
		if (item.logType === '[onError]' && !item.errorType && item.messages) {
			item.errorType = errorTypes.filter(errorType => item.messages.indexOf(errorType) !== -1)[0]
		}
	})
	return errors
}

export default {
	_getTimeString,
	_getDateTimeString,
	getReqId,
	formatPerformance,
	jsonToUnderline,
	ajax,
	analysisError
}
