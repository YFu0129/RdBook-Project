const {
    MIME_TYPE_EPUB,
    UPLOAD_URL,
    UPLOAD_PATH //实际路径
} = require('../utils/constant')

const fs = require('fs')
const Epub = require('../utils/epub')
const { resolve } = require('path')
const { rejects } = require('assert')

class Book {
    constructor(file, data) { //如果传入file参数: 表示当前电子书为刚上传的电子书的文件，  data:表示现在希望更新或插入电子书数据
            if (file) {
                this.createBookFromFile(file)
            } else {
                this.createBookFromData(data)
            }
        }
        //分别创建这两个方法
    createBookFromFile(file) {
        console.log(file) //查看书籍信息
        const {
            destination,
            filename,
            mimetype = MIME_TYPE_EPUB,
            path,
            originalname
        } = file
        const suffix = mimetype === MIME_TYPE_EPUB ? '.epub' : '' //加后缀

        const oldBookPath = path //原有的文件路径。就是打印出来的
        const bookPath = `${destination}/${filename}.${suffix}` //因为原来的路径没有.epub后缀，所以这里是加上后缀后的新路径

        const url = `${UPLOAD_URL}/book/${filename}${suffix}` //这是电子书的下载url链接
        const unzipPath = `${UPLOAD_PATH}/unzip/${filename}` //这是电子书解压后的文件夹路径
        const unzipUrl = `${UPLOAD_URL}/unzip/${filename}` //这是电子书解压后的文件夹url
        if (!fs.existsSync(unzipPath)) { //如果同步  电子书的解压路径 不存在， 就去创建（迭代去创建）
            fs.mkdirSync(unzipPath, { recursive: true })
        }
        if (fs.existsSync(oldBookPath) && !fs.existsSync(bookPath)) {
            fs.renameSync(oldBookPath, bookPath) //重命名成 带有.epub结尾的书籍
        }
        this.filename = filename //是文件名 无后缀
        this.path = `/book/${filename}${suffix}` //epub文件相对路径
        this.unzipPath = `/unzip/${filename}` //epub解压后的相对路径
        this.filePath = this.path //起一个filePath的别名 更好辨认
        this.url = url //epub文件的下载链接
        this.title = ''
        this.author = ''
        this.publisher = ''
        this.contents = []
        this.cover = '' //封面图片的下载链接
        this.category = -1 //电子书的分类ID
        this.categoryText = ''
        this.language = ''
        this.unzipUrl = unzipUrl //解压后 文件夹的链接
        this.originalname = originalname //电子书文件的原名
    }

    createBookFromData(data) {

    }

    parse() { //用于完善 这个Book class类里的一些属性
        return new Promise((resolve, reject) => {
            const bookPath = `${UPLOAD_PATH}${this.filePath}` //upload——path本地的 根据开发环境获取到的文件路径， filepath指向的是电子书的相对路径
            if (!fs.existsSync(bookPath)) {
                reject(new Error('电子书不存在'))
            }
            const epub = new Epub(bookPath)
            epub.on('error', err => {
                reject(err)
            })
            epub.on('end', err => {
                if (err) {
                    reject(err)
                } else {
                    console.log(epub.metadata)
                    resolve()
                }
            })
            epub.parse()
        })
    }
}

module.exports = Book