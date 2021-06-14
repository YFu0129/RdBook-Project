//jwt中间件 页面， 主要用途：做路由的验证
const jwt = require('express-jwt')
const { PRIVATE_KEY } = require('../utils/constant') //记住jwt验证时 一定要提供密钥啊！！！

module.exports = jwt({
    secret: PRIVATE_KEY,
    credentialsRequired: true,
    algorithms: ['HS256']
}).unless({
    path: [
        '/',
        '/user/login'
    ]
})