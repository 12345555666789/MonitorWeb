export default class MonitorWeb {
    constructor(
        /**
         * 监控配置项
         */
        config?: {
            /**
             * 上报地址, 必填
             */
            url?: string,
            /**
             * 日志上报失败重试次数, 默认值: 5
             * @default 5
             */
            maxRetryCount?: number,
            /**
             * 日志自动上报/清理周期, 单位/毫秒,默认值:10000
             * @default 10000
             */
            reportingCycle?: number,
            /**
             * 页面模块名称, 如不传则取页面url路径部分第一级
             */
            moduleName?: string,
            /**
             * 是否在控制台打印上报情况, 默认值:true
             * @default true
             */
            isLog?: boolean,
            /**
             * 日志json的key是否使用驼峰命名, 默认值:false 默认使用下划线规则
             * @default false
             */
            isHump?: boolean,
            /**
             * 日志队列最大数量, 默认100条
             * @default 100
             */
            maxQueueCount?: number
        } | string,
    )
    /**
     * 手动捕获报错函数
     */
    catchError(err: any): void;
}
