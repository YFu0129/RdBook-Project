const express = require('express');
const { user } = require('../db/config');
const Result = require('../models/Result')

const { login, findUser } = require('../services/user') //放业务逻辑的那个页面，里面有return的 querySql，从这里拿到一个 login方法
const { md5, decoded } = require('../utils')
const { PWD_SALT, PRIVATE_KEY, JWT_EXPIRED } = require('../utils/constant')
const { body, validationResult } = require('express-validator')
const boom = require('boom')
const jwt = require('jsonwebtoken')

const router = express.Router()

//user.js是一个嵌套路由页    前半部分都是固定好的 user.js那边

//这个就是与前端api请求对应的  user/login的API是吗？
// router.post('/login', function(req, res) {
//     console.log(req.body)
//     res.json({
//         code: 0, //通过res直接返回一个结果
//         msg: '登录成功'
//     })
// })
//使用 result方法后：
router.post('/login', [
        body('username').isString().withMessage('用户名必须为字符'), //express-validator表单校验器的 规则
        body('password').isString().withMessage('密码必须为数字')
    ],
    function(req, res, next) {
        const err = validationResult(req)
            //console.log(err)
        if (!err.isEmpty()) { //帮助判断 errors数组是否为空
            // const msg = err.errors[0].msg
            const [{ msg }] = err.errors //errors为数组，通过【】获取数组，然后里面的msg再加一个{}
            next(boom.badRequest(msg)) //错误传给下一个中间件去执行,badRequest表示 401错误，参数异常
        } else { //如果errors数组为空----没有错误
            let { username, password } = req.body
                //但是需要对这个password进行加密处理！：
            password = md5(`${password}${PWD_SALT}`) //将这个明文密码与设置的那个盐值PWD进行一个拼接合并，一起传入md5加密的这个方法！


            /*下面为登陆逻辑：
            query逻辑可以放在这里 就是 select*from xxx 数据库里的数据 那个逻辑。 现在移入进services/user.js里统一放置
            但现在 拿到 services里的login方法后，就可以进行判断：*/
            login(username, password).then(user => { //拿取user信息
                if (!user || user.length === 0) { //表示用户不存在（数据库中无数据）
                    new Result('登陆失败').fail(res) //返回给前端的数据
                } else {
                    const token = jwt.sign( //jwt的sign方法！用来生成token：要传三个参数：
                        { username },
                        PRIVATE_KEY, //从utils/constant中拿
                        { expiresIn: JWT_EXPIRED } //也从utils里拿
                    )

                    //将生成好的token作为一个参数传到 前端。
                    new Result({ token }, '登录成功').success(res) //向前端返回一个成功的信息，  若不在result里写数据，就会传 result方法中的默认msg：操作成功
                }
            })
        }

    })


router.get('/info', function(req, res) { //用户查询,查询的逻辑也在services中(从 数据库中查询)
    const decode = decoded(req)
    if (decode && decode.username) {
        findUser(decode.username).then(user => {
            if (user) {
                user.roles = [user.role] //前端获取的是roles， 进行一个转换改造， 将role作为一个数组传进去(用户登陆成功的关键)
                new Result(user, '用户信息查询成功').success(res)
            } else {
                new Result('用户信息查询失败').fail(res)
            }

        })
    } else {
        new Result('用户信息查询失败').fail(res)
    }


})

module.exports = router