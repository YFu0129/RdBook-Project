const mysql = require('mysql')

const config = require('./config') //需要从config中取处一些参数,直接取
const { debug } = require('../utils/constant')
const { isObject } = require('../utils')
const { reject, findIndex } = require('lodash')

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

function insert(model, tableName) {
    return new Promise((resolve, reject) => {
        if (!isObject(model)) { //model需要为一个对象， 所以创建一个方法来判断是否为对象
            reject(new Error('插入数据库失败，插入数据非对象'))
        } else {
            const keys = []
            const values = []
            Object.keys(model).forEach(key => {
                    if (model.hasOwnProperty(key)) { //看一下当前的key是否是model自身的key而不是原型链上的key
                        keys.push(`\`${key}\``) //数据库中 有些数据名 或者单词是关键字， 需要带着反引号 查询
                        values.push(`'${model[key]}'`)
                    }
                })
                //开始拼sql语句
            if (keys.length > 0 && values.length > 0) {
                let sql = `INSERT INTO \`${tableName}\` (`
                const keysString = keys.join(',')
                const valuesString = values.join(',')
                sql = `${sql}${keysString}) VALUES (${valuesString})`
                debug && console.log(sql)
                    //插入
                    //第一步创建数据库链接
                const conn = connect() //用connect方法创建链接
                try { //try catch方法来进行执行
                    conn.query(sql, (err, result) => {
                        if (err) {
                            reject(err)
                        } else {
                            resolve(result)
                        }
                    })
                } catch (e) {
                    reject(e)
                } finally {
                    conn.end() //释放链接
                }
            } else {
                reject(new Error('插入数据库失败，对象中没有任何属性'))
            }
        }
    })
}

function update(model, tableName, where) {
    return new Promise((resolve, reject) => {
        if (!isObject(model)) {
            reject(new Error('插入数据库失败，插入数据非对象'))
        } else {
            //insert into a,b values(c,d) 这是insert语句
            //update tableName set a=v1, b=v2 where.... 这是update语句
            const entry = []
            Object.keys(model).forEach(key => {
                if (model.hasOwnProperty(key)) {
                    entry.push(`\`${key}\`='${model[key]}'`) //反引号是为了防止 出现特殊字符， 而单引号是因为有值引入
                }
            })
            if (entry.length > 0) {
                let sql = `UPDATE \`${tableName}\` SET`
                sql = `${sql} ${entry.join(',')} ${where}`
                    // debug && console.log(sql)
                const conn = connect()
                try {
                    conn.query(sql, (err, result) => {
                        if (err) {
                            reject(err)
                        } else {
                            resolve(result)
                        }
                    })
                } catch (e) {
                    reject(e)
                } finally {
                    conn.end()
                }
            }
        }
    })
}

function and(where, k, v){
    if(where === 'where'){
        return `${where} \`${k}\`='${v}'`
    }else{
        return `${where} and \`${k}\`='${v}'`
    }
}

function andLike(where, k, v){
    if(where === 'where'){
        return `${where} \`${k}\` like '%${v}%'`
    }else{
        return `${where} and \`${k}\` like '%${v}%'`
    }
}

module.exports = {
    querySql,
    queryOne,
    insert,
    update,
    and,
    andLike

}