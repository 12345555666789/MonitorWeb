let path = require('path');
module.exports = {
    entry: './src/index.js',//入口文件
    output: {//出口配置
        path: path.resolve('dist'),//出口文件路径
        filename: "[name].[chunkhash:8].js"//出口文件名称
    },
    // devtool: "source-map",
    module: {
        rules:
            [
                {
                    test: /\.worker\.js$/,
                    use: {
                        loader: 'worker-loader',
                        options: { inline: true, fallback: false}
                    },
                },
                {
                    test: /\.js$/,
                    use: {
                        loader: 'babel-loader'
                    },
                    exclude: /node_modules/
                }
            ]
    }
};
