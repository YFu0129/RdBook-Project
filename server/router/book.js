const express = require('express')
const multer = require('multer') //multer是一个express的中间件, 最主要的用途的帮我门去做文件上传
const { UPLOAD_PATH } = require('../utils/constant')
const Result = require('../models/Result')
const Book = require('../models/Book')
const boom = require('boom')
const { decoded } = require('../utils')
const bookService = require('../services/book')

const router = express.Router()

//电子书上传的功能
router.post('/upload',
    multer({ dest: `${UPLOAD_PATH}/book` }).single('file'), //定义文件路径
    function(req, res, next) {
        if (!req.file || req.file.length === 0) {
            new Result('上传电子书失败').fail(res)
        } else {
            const book = new Book(req.file) //创建一个book对象，这个实例在执行时会进行执行models/book.js中的constructor代码
                // console.log(book)
            book.parse().then(book => {
                // console.log('book', book)
                new Result(book, '上传电子书成功').success(res) //将解析成功的Book 传回给前端
            }).catch(err => {
                next(boom.badImplementation(err))
            })
        }

    }
)

//新增电子书的功能
router.post(
    '/create',
    function(req, res, next) {
        const decode = decoded(req) //获取token， 是通过decoded这个方法， 从req的header,body中解析出来
            // console.log(req.body)
        if (decode && decode.username) {
            req.body.username = decode.username
        }
        const book = new Book(null, req.body) //Book.js中的 定义方法class Book方法要传两个参数，一个file 一个data， 这里用data方法
            // console.log(book)
        bookService.insertBook(book).then(() => {
            console.log('执行成功')
            new Result(book, '添加电子书成功').success(res) //接口执行成功后要返回
        }).catch(err => {
            next(boom.badImplementation(err))
        })
    }
)

//更新电子书
router.post(
    '/update',
    function(req, res, next) {
        const decode = decoded(req)
        if (decode && decode.username) {
            req.body.username = decode.username
        }
        const book = new Book(null, req.body)
        bookService.updateBook(book).then(() => {
            new Result(book, '更新电子书成功').success(res) //接口执行成功后要返回
        }).catch(err => {
            next(boom.badImplementation(err))
        })
    }
)

router.get('/get', function(req, res, next) {
    const { fileName } = req.query
    if (!fileName) {
        next(boom.badRequest(new Error('参数fileName不能为空')))
    } else {
        bookService.getBook(fileName).then(book => {
            new Result(book, '获取图书信息成功').success(res)
        }).catch(err => {
            next(boom.badImplementation(err))
        })
    }
})

router.get('/category', function(req, res, next) {
    bookService.getCategory().then(category => {
        new Result(category, '获取分类成功').success(res)
    }).catch(err => {
        next(boom.badImplementation(err))
    })
})

router.get('/list', function(req, res, next) {
    bookService.listBook(req.query).then(({ list, count, page, pageSize }) => {
        new Result({ list, count, page: +page, pageSize: +pageSize }, '获取图书列表成功').success(res)
    }).catch(err => {
        next(boom.badImplementation(err))
    })
})

router.get('/delete', function(req, res, next) {
    const { fileName } = req.query
    if (!fileName) {
        next(boom.badRequest(new Error('参数fileName不能为空')))
    } else {
        bookService.deleteBook(fileName).then(() => {
            new Result('删除图书信息成功').success(res)
        }).catch(err => {
            next(boom.badImplementation(err))
        })
    }
})

module.exports = router