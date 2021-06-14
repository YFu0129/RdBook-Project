const Book = require('../models/Book')
const db = require('../db')
const _ = require('lodash')
const { debug } = require('../utils/constant')
const { reject } = require('lodash')

function exists(book) { //判断电子书是否存在
    const { title, author, publisher } = book
    const sql = `select * from book where title='${title}' and author='${author}' and publisher='${publisher}'`
    return db.queryOne(sql)
}

async function removeBook(book) { //电子书已经存在就要清除
    if (book) {
        book.reset() //自定义一个  删除已存在电子书的 reset方法，包括删除相关文件---解析出的epub文件，封面，解压后的文件
        if (book.fileName) {
            const removeBookSql = `delete from book where fileName='${book.fileName}'`
            const removeContentsSql = `delete from contents where fileName='${book.fileName}'`
            await db.querySql(removeBookSql)
            await db.querySql(removeContentsSql)
        }
    }
}

async function insertContents(book) {
    const contents = book.getContents()
        //console.log('contents', contents) //查看目录信息后从中提取有用字段
    if (contents && contents.length > 0) {
        for (let i = 0; i < contents.length; i++) {
            const content = contents[i]
            const _content = _.pick(content, [
                'fileName',
                'id',
                'href',
                'text',
                'order',
                'level',
                'label',
                'pid',
                'navId'
            ])
            console.log('_content', _content)
            await db.insert(_content, 'contents')
        }
    }
}

//放电子书相关操作的页面
function insertBook(book) { //最后就是调这个方法 来完成电子书的新增
    return new Promise(async(resolve, reject) => {
        try {
            if (book instanceof Book) { //参数book 必须为Book对象的一个实例-->可以获得 映射的那一大部分参数名称(this.xxx=data.xxx)
                const result = await exists(book)
                if (result) {
                    await removeBook(book)
                    reject(new Error('电子书已存在'))
                } else {
                    await db.insert(book.toDb(), 'book') //传入一个对象，传入一个表名
                    await insertContents(book) //电子书 目录的创建
                    resolve()
                }
            } else {
                reject(new Error('添加的图书对象不合法'))
            }
        } catch (e) {
            reject(e)
        }
    })
}

function updateBook(book) {
    return new Promise(async(resolve, reject) => {
        try {
            if (book instanceof Book) {
                const result = await getBook(book.fileName)
                if (result) {
                    const model = book.toDb()
                    if (+result.updateType === 0) {
                        reject(new Error('内置图书不能编辑'))
                    } else {
                        await db.update(model, 'book', `where fileName='${book.fileName}'`)
                        resolve()
                    }
                }
            } else {
                reject(new Error('添加的图书对象不合法'))
            }
        } catch (e) {
            reject(e)
        }
    })
}

function getBook(fileName) {
    return new Promise(async(resolve, reject) => {
        const bookSql = `select * from book where fileName='${fileName}'`
        const contentsSql = `select * from contents where fileName='${fileName}' order by \`order\``
        const book = await db.queryOne(bookSql)
        const contents = await db.querySql(contentsSql)
        if (book) {
            book.cover = Book.genCoverUrl(book)
            book.contentsTree = Book.genContentsTree(contents)
            resolve(book)
        } else {
            reject(new Error('电子书不存在'))
        }
    })
}

async function getCategory() {
    const sql = 'select * from category order by category asc'
    const result = await db.querySql(sql)
    const categoryList = []
    result.forEach(item => {
        categoryList.push({
            label: item.categoryText,
            value: item.category,
            num: item.num
        })
    })
    return categoryList
}

async function listBook(query) {
    debug && console.log(query)
    const { //通过解构， 来将query中的信息解构出来
        category,
        author,
        title,
        sort,
        page = 1,
        pageSize = 20
    } = query
    const offset = (page - 1) * pageSize //偏移量， 如第二页 查询第20个以后的量！  分页操作的方法。
    let bookSql = 'select * from book'
    let where = 'where'
    title && (where = db.andLike(where, 'title', title)) //title和author都是模糊查询  所以 db/index.js中 sql语句用like  category的采用and
    author && (where = db.andLike(where, 'author', author))
    category && (where = db.and(where, 'categoryText', category)) //where， ‘关键字key‘，value
    if (where !== 'where') {
        bookSql = `${bookSql} ${where}`
    }
    if (sort) {
        const symbol = sort[0]
        const column = sort.slice(1, sort.length)
        const order = symbol === '+' ? 'asc' : 'desc'
        bookSql = `${bookSql} order by \`${column}\` ${order}`
    }
    //查询书的数量：
    let countSql = `select count(*) as count from book` //查询出来一共有多少的书,但有时是要根据 种类来查询书的树木，因此：做判断：
    if (where !== 'where') { //表示 是有查询条件的！！
        countSql = `${countSql} ${where}` //对countSql进行一个更新， 要拼上新的where，即查询的条件
    }
    const count = await db.querySql(countSql)
        // console.log('count', count)

    bookSql = `${bookSql} limit ${pageSize} offset ${offset}`
    const list = await db.querySql(bookSql)
    list.forEach(book => book.cover = Book.genCoverUrl(book))
    return { list, count: count[0].count, page, pageSize }
}

function deleteBook(fileName) {
    return new Promise(async(resolve, reject) => {
        let book = await getBook(fileName)
        if (book) {
            if (+book.updateType === 0) { //getbook方法 在上面，可以帮我们拿到一本图书，并根据带的 updateType参数 的数 判断是否为内置图书（0）
                reject(new Error('内置电子书不能删除'))
            } else {
                const bookObj = new Book(null, book) //主要是为了使用这个对象下的 reset方法
                const sql = `delete from book where fileName='${fileName}'`
                db.querySql(sql).then(() => {
                    bookObj.reset()
                    resolve()
                })
            }
        } else {
            reject(new Error('电子书不存在'))
        }
    })
}

module.exports = {
    insertBook,
    getBook,
    updateBook,
    getCategory,
    listBook,
    deleteBook
}