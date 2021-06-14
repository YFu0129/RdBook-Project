//这个是全局的入口文件，实际运行项目时就是启动这个入口文件
const router = require('./router'); //自定义的一个中间件， 连接外面的 router文件夹
const express = require('express'); //先将express引用进来，
const app = express(); //就是一个express应用

const fs = require('fs') //nodejs的一个文件库，主要做文件处理
const https = require('https') //也是一个默认的库

const bodyParser = require('body-parser')
const cors = require('cors')


// //一  中间件 （一定要写在 请求之前，绝大部分的中间件都要在响应结束前 调用）第一步：
// function myLogger(req, res, next) { //这个就是express框架的 中间件， 一个回调函数。包括三个参数,这三个参数是在回调时被注入。
//     console.log('myLogger');
//     next();
// }
// //中间件 第二步：
// app.use(myLogger); //使用 use 来使用中间件。



// //二  定义路由：
// app.get('/', function(req, res) { //两个参数，浏览器发送来的请求是 req，  服务器返回的参数数据 是 res
//         res.send('hello node') //通过get请求 访问各路径时， 这句话 会返回给我们的浏览器！！
//             // throw new Error('error....')    //配合下面的一场处理使用，因为下面设置了msg 和 json转换， 所以浏览器可以收到错误信息
//     }) //这是创建一个基于express的监听(这个是根路由)



// //三  异常处理：
// function errorHandler(err, req, res, next) {
//     console.log(err);
//     res.status(500).json({ //返回一个错误码，同时返回一个json，这个json当中可以给出一个error和一个message
//         error: -1,
//         msg: err.toString() //有了message 就可以将error 的 返回给浏览器端
//     })
// }
// app.use(errorHandler);


// // app.post('/', function(req, res) { //使用post 请求的路由 在浏览器中访问不到了， 因为在地址栏输入的 都是get请求

// // })

app.use(cors())
    //bodyParser 要在使用路由前 将bodyparser这个扩展这个给它使用起来：
app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json())

app.use('/', router) //router其实就是一个中间件，从上面 require的。为的是将全局的路由度托管到这个路由下面（可以将整个业务的源码变得更简洁）


//通过 fs库 来读取https文件夹中的证书和密钥
const privateKey = fs.readFileSync('./https/bookadminproject.key')
const pem = fs.readFileSync('./https/bookadminproject.pem')
const credentials = {
    key: privateKey,
    cert: pem
}
const httpsServer = https.createServer(credentials, app) //启动一个https服务


const server = app.listen(5000, function() { //最后通过一个（监听端口号,以及监听完成后 给我们的一个回调函数）  来将整个项目运行起来，
    const { address, port } = server.address(); //可以监听到 web应用的地址 和端口号
    console.log('Http Server 启动成功： http://%s:%s', address, port)
})
httpsServer.listen(18082, function() {
        console.log('HTTPS server is running on: https://localhost:%s', 18082)
    }) //使用这个启动的 https服务  来调用一个listen方法监听端口号