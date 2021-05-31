const mysql = require('mysql')

const config = require('./config') //需要从config中取处一些参数,直接取
const { debug } = require('../utils/constant')

function connect() {
    return mysql.createConnection({ //在调用的这个 createConnection的方法中 我们需要传入一些参数
        host: config.host,
        user: config.user,
        password: config.password,
        database: config.database,
        timeout: 6000000,
        multipleStatements: true //允许每条mysql语句有多条查询， 默认为false
    })

}

function querySql(sql) {
    const conn = connect()
    debug && console.log(sql)
    return new Promise((resolve, reject) => {
        try {
            conn.query(sql, (err, results) => {
                // console.log(sql, err, results, 112)
                if (err) {
                    debug && console.log('查询失败，原因：' + JSON.stringify(err))
                    reject(err)
                } else {
                    debug && console.log('查询成功', JSON.stringify(results))
                    resolve(results)
                }
            })
        } catch (e) {
            reject(e)
        } finally {
            conn.end() //调用conn.end来释放链接   如果不释放，这个链接会一致保存在我们的内存当中
        }
    })
}

function queryOne(sql) {
    return new Promise((resolve, reject) => {
        querySql(sql).then(results => { //通过这个方法来进行查询
            if (results && results.length > 0) {
                resolve(results[0])
            } else {
                resolve(null)
            }
        }).catch(err => {
            reject(err)
        })
    })
}

module.exports = {
    querySql,
    queryOne

}