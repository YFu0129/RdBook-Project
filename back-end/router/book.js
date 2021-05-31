const express = require('express')
const multer = require('multer') //multer是一个express的中间件, 最主要的用途的帮我门去做文件上传
const { UPLOAD_PATH } = require('../utils/constant')
const Result = require('../models/Result')

const router = express.Router()

router.post('/upload', multer({ dest: `${UPLOAD_PATH}/book/` }).single('file'), //定义文件路径
    function(req, res) {
        if (!req.file || req.file.length === 0) {
            new Result('上传电子书失败').fail(res)
        } else {
            new Result('上传电子书成功').success(res)
        }

    }
)

module.exports = router