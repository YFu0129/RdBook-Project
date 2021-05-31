const express = require('express');
const boom = require('boom');
const userRouter = require('./user');
const bookRouter = require('./book');
const { route } = require('./user');
const jwtAuth = require('./jwt')
const Result = require('../models/Result')



//注册路由（这个router的作用主要就是帮我们处理 路由的监听）
const router = express.Router()

router.use(jwtAuth) //在调用路由之前，使用use这个方法来调用jwt验证的这个中间件

//各个路由。
router.get('/', function(req, res) { //监听 根路由下面的一个处理。
        res.send('小慕读书管理后台') //res是返回给浏览器端的
    })
    //use请求(是一个中间页的方法)也不可在浏览器url中请求，因为是个嵌套的，但如果user这个嵌套的路由中 有get方法， 则可以通过/user/info这样找到里面get后的子路由
router.use('/user', userRouter) //这里是一个 路由的嵌套， 本来是user这个路由，user.js中 有get请求方式 针对info， 而这里是将user路由嵌套了进来

router.use('/book', bookRouter) //将所有经过book的路由 都委托给bookRouter来处理


/*处理404 异常  boom源码中有大量的 快速处理异常状态码的方法
因为上面是返回了一个异常，所以下面必须跟着一个异常处理的 中间件。
*/
router.use((req, res, next) => { //这个是一个正常的中间件，不是异常处理中间件，是处理404 的
    next(boom.notFound('接口不存在')) //boom中 有很多 方法
})

router.use((err, req, res, next) => {
    console.log(err)
    if (err.name && err.name === 'UnauthorizedError') { //表示是一个token错误
        const { status = 401, message } = err //不存在就给一个默认值401
        new Result(null, 'Token 验证失败', { //可以有效提醒用户哪里错误而不是单纯验证码
            error: status,
            errMsg: message
        }).jwtError(res.status(status))
    } else { //表示为常规错误
        const msg = (err && err.message) || '系统错误'
        const statusCode = (err.output && err.output.statusCode) || 500; //错误码是从 error的 output中显示的
        const errorMsg = (err.output && err.output.payload && err.output.payload.error) || err.message //errormsg也是从 output中拿

        new Result(null, msg, {
            error: statusCode,
            errorMsg
        }).fail(res.status(statusCode))
    }
})



module.exports = router //最后导出的其实就是这个router