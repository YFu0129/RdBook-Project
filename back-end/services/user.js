//放置所有的 业务逻辑层
const { querySql, queryOne } = require('../db')

function login(username, password) { //这里的login指具体业务逻辑而不是查询语句了
    return querySql(`select * from admin_user where username='${username}' and password = '${password}'`)
        //不再需要打印结果或者错误，只需要直接返回给前端
}

function findUser(username) {
    return queryOne(`select id, username, nickname, role, avatar from admin_user where username='${username}'`) //有时可能并不是所有内容都想查询（显示）出来 如密码 虽然是加密的，就改*那个地方，指定想查询的
}

module.exports = {
    login,
    findUser
}