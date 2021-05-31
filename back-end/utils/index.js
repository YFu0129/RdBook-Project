//这是一个 放置工具类的 页面
const crypto = require('crypto')
const jwt = require('jsonwebtoken')
const { PRIVATE_KEY } = require('./constant')

function md5(s) {
    //参数需要为 string类型，不然会出错！
    return crypto.createHash('md5').update(String(s)).digest('hex');
    //实现md5加密，通过createhash这个 创建了一个md5的对象，这个对象里包含了一个update方法，通过对这个传入的参数 s 进行加密
}

function decoded(req) {
    let token = req.get('Authorization') //token在req的autorization中存在，
    if (token.indexOf('Bearer') === 0) { //bearer参数位于开头部分
        token = token.replace('Bearer ', '') //记得bearer参数后的空格！！得一起替换
    }
    return jwt.verify(token, PRIVATE_KEY) //将获取的token 和 从上面拿到的PRIVATEKEY 传入verify方法
}

module.exports = {
    md5,
    decoded
}