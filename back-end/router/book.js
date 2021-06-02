const express = require('express')
const multer = require('multer') //multer是一个express的中间件, 最主要的用途的帮我门去做文件上传
const { UPLOAD_PATH } = require('../utils/constant')
const Result = require('../models/Result')
const Book = require('../models/Book')
const boom = require('boom')

const router = express.Router()

router.post('/upload',
    multer({ dest: `${UPLOAD_PATH}/book` }).single('file'), //定义文件路径
    function(req, res, next) {
        if (!req.file || req.file.length === 0) {
            new Result('上传电子书失败').fail(res)
        } else {
            const book = new Book(req.file) //创建一个book对象，这个实例在执行时会进行执行models/book.js中的constructor代码
                // console.log(book)
            book.parse().then(book => {
                console.log('book', book)
                new Result('上传电子书成功').success(res)
            }).catch(err => {
                next(boom.badImplementation(err))
            })
        }

    }
)

module.exports = router