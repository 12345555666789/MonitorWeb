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
             * 埋点配置
             * @default undefined
             */
            analysisConfig?: any

        }
    )
    /**
     * 手动捕获报错函数
     */
    catchError(err: any): void;

    /**
     * 埋点函数
     */
    clickStat(eventName: string, params?: any): void;
}
