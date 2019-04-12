let express = require('express')
let app = express()
let bodyParser = require('body-parser')

let bodyParserplugin = bodyParser.urlencoded({ extended: false })
app.all('*', function (req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    //Access-Control-Allow-Headers
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    res.header('Access-Control-Allow-Methods', '*');
    res.header('Content-Type', 'application/json;charset=utf-8');
    next();
});

app.post('/', bodyParserplugin, function (req, res) {
    console.log(req.body);
    res.send()
})

app.listen(8888, () => console.log('启动监听端口8888'))