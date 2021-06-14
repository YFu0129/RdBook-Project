const {
    MIME_TYPE_EPUB,
    OLD_UPLOAD_URL,
    UPLOAD_URL,
    UPLOAD_PATH //实际路径
} = require('../utils/constant')

const fs = require('fs')
const path = require('path')
const Epub = require('../utils/epub')
const xml2js = require('xml2js').parseString


const { resolve } = require('path')
const { rejects } = require('assert')
const { static } = require('express')

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
        const bookPath = `${destination}/${filename}${suffix}` //因为原来的路径没有.epub后缀，所以这里是加上后缀后的新路径

        const url = `${UPLOAD_URL}/book/${filename}${suffix}` //这是电子书的下载url链接
        const unzipPath = `${UPLOAD_PATH}/unzip/${filename}` //这是电子书解压后的文件夹路径
        const unzipUrl = `${UPLOAD_URL}/unzip/${filename}` //这是电子书解压后的文件夹url
        if (!fs.existsSync(unzipPath)) { //如果同步  电子书的解压路径 不存在， 就去创建（迭代去创建）
            fs.mkdirSync(unzipPath, { recursive: true })
        }
        if (fs.existsSync(oldBookPath) && !fs.existsSync(bookPath)) {
            fs.renameSync(oldBookPath, bookPath) //重命名成 带有.epub结尾的书籍
        }
        this.fileName = filename //是文件名 无后缀
        this.path = `/book/${filename}${suffix}` //epub文件相对路径
        this.unzipPath = `/unzip/${filename}` //epub解压后的相对路径
        this.filePath = this.path //起一个filePath的别名 更好辨认
        this.url = url //epub文件的下载链接
        this.title = ''
        this.author = ''
        this.publisher = ''
        this.contents = [] //目录
        this.contentsTree = [] //树状目录解构
        this.cover = '' //封面图片的下载链接
        this.coverPath = '' //封面图片路径
        this.category = -1 //电子书的分类ID
        this.categoryText = '' //分类名称
        this.language = ''
        this.unzipUrl = unzipUrl //解压后 文件夹的链接
        this.originalName = originalname //电子书文件的原名
    }

    createBookFromData(data) { //电子书数据传入数据库 要进行一个名称映射, book对象生成好了后 就可以生成相应的sql语句， 最后通过sql语句的insert方法完成数据库的插入
        this.fileName = data.fileName
        this.cover = data.coverPath
        this.title = data.title
        this.author = data.author
        this.publisher = data.publisher
        this.bookId = data.fileName
        this.language = data.language
        this.rootFile = data.rootFile
        this.originalName = data.originalName
        this.path = data.path || data.filePath
        this.filePath = data.path || data.filePath
        this.unzipPath = data.unzipPath
        this.coverPath = data.coverPath
        this.createUser = data.username
        this.createDt = new Date().getTime()
        this.updateDt = new Date().getTime()
        this.updateType = data.updateType === 0 ? data.updateType : 1
        this.category = data.category || 99
        this.categoryText = data.categoryText || '自定义'
        this.contents = data.contents || []
    }

    parse() { //用于完善 这个Book class类里的一些属性
        return new Promise((resolve, reject) => {
            const bookPath = `${UPLOAD_PATH}${this.filePath}` //upload——path本地的 根据开发环境获取到的文件路径， filepath指向的是电子书的相对路径
            if (!fs.existsSync(bookPath)) {
                reject(new Error('电子书不存在'))
            }
            const epub = new Epub(bookPath)
            epub.on('error', err => { //在epub.js中 封装好的 emit一个error事件，包括 打印错误时显示的信息
                reject(err)
            })
            epub.on('end', err => {
                if (err) {
                    reject(err)
                } else {
                    // console.log('epub end', epub.manifest)
                    const { //获取对象的方法：直接解构 出来metadata中的数据
                        language,
                        creator,
                        creatorFileAs,
                        title,
                        cover,
                        publisher
                    } = epub.metadata
                    if (!title) {
                        reject(new Error('图书标题为空'))
                    } else {
                        this.title = title //在上面的 createfile里做过 处理  this.title=‘’
                        this.language = language || 'en'
                        this.author = creator || creatorFileAs || 'unknown'
                        this.publisher = publisher || 'unknown'
                        this.rootFile = epub.rootFile

                        const handleGetImage = (err, file, mimeType) => {
                            if (err) {
                                reject(err)
                            } else {
                                const suffix = mimeType.split('/')[1] //截取处 图片的类型
                                const coverPath = `${UPLOAD_PATH}/img/${this.fileName}.${suffix}`
                                const coverUrl = `${UPLOAD_URL}/img/${this.fileName}.${suffix}`
                                fs.writeFileSync(coverPath, file, 'binary')
                                this.coverPath = `/img/${this.fileName}.${suffix}`
                                this.cover = coverUrl
                                resolve(this) //将当前的book实体传入进去，尽可以在book.js中的 上传成功的 then里面获取到
                            }
                        }

                        try {
                            this.unzip()
                            this.parseContents(epub).then(({ chapters, chapterTree }) => {
                                this.contents = chapters
                                this.contentsTree = chapterTree
                                epub.getImage(cover, handleGetImage) //getImage方法也是在epub源码文件中的方法，传入两个参数，图片id和回调函数
                            })
                        } catch (e) {
                            reject(e)
                        }
                    }
                }
            })
            epub.parse()
        })
    }
    unzip() {
        const AdmZip = require('adm-zip')
        const zip = new AdmZip(Book.genPath(this.path))
        zip.extractAllTo(Book.genPath(this.unzipPath), true) //是否进行覆盖
    }

    parseContents(epub) { //解析目录的第一步就是去获取ncx文件
        function getNcxFilePath() {
            const spine = epub && epub.spine //电子书zip格式下的文件夹里的文件里 有全部信息
            const manifest = epub && epub.manifest
                // console.log('spine', spine) //从spine下面能拿到 toc， 里面有个id，和href
            const ncx = spine.toc && spine.toc.href
            const id = spine.toc && spine.toc.id
                // console.log('spine', ncx, manifest[id].href)
            if (ncx) {
                return ncx
            } else {
                return manifest[id].href
            }
        }

        function findParent(array, level = 0, pid = '') {
            return array.map(item => {
                //第一个场景：当前navpoint下没有子目录了 直接赋值
                item.level = level
                item.pid = pid
                    //第二个场景：存在navpoint子目录，且这个子目录为一个数组，就调这个方法继续进行迭代
                if (item.navPoint && item.navPoint.length > 0) { //说明这级菜单下 存在子目录
                    item.navPoint = findParent(item.navPoint, level + 1, item['$'].id) //当前层级为level，继续让它的子目录去寻找所以level必须加1
                } else if (item.navPoint) {
                    //navpoint不是一个数组，是一个对象， 就直接赋值-->表示只有一个目录
                    item.navPoint.level = level + 1
                    item.navPoint.pid = item['$'].id
                }
                return item
            })
        }

        function flatten(array) {
            return [].concat(...array.map(item => {
                if (item.navPoint && item.navPoint.length > 0) {
                    return [].concat(item, ...flatten(item.navPoint)) //副目录跟在主目录后 进行拼接展开
                } else if (item.navPoint) {
                    return [].concat(item, item.navPoint)
                }
                return item
            }))
        }

        const ncxFilePath = Book.genPath(`${this.unzipPath}/${getNcxFilePath()}`)
            // console.log('ncxfilepath', ncxFilePath)
        if (fs.existsSync(ncxFilePath)) { //存在时就需要读取ncx文件
            return new Promise((resolve, reject) => {
                const xml = fs.readFileSync(ncxFilePath, 'utf-8') //通过xml2js 这个库 来解析
                const dir = path.dirname(ncxFilePath).replace(UPLOAD_PATH, '')
                    // console.log('dir', dir)   //电子书所在相对路径 如：/users/fuyuwen/upload/admin-upload-ebook/unzip/xxxxxxxxxxxxx
                const fileName = this.fileName
                const unzipPath = this.unzipPath
                xml2js(xml, {
                    explicitArray: false,
                    ignoreAttrs: false
                }, function(err, json) {
                    if (err) {
                        reject(err)
                    } else {
                        // console.log('xml', json) //取的是  ncx属性下的 navMap
                        const navMap = json.ncx.navMap
                            // console.log('xml', navMap)
                        if (navMap.navPoint && navMap.navPoint.length > 0) { //说明目录存在,且为一个数组
                            navMap.navPoint = findParent(navMap.navPoint)
                            const newNavMap = flatten(navMap.navPoint) //将 树状目录解构 变为一维结构
                            const chapters = []
                                // console.log('nav', newNavMap.length, epub.flow.length)
                                // console.log(epub.flow, newNavMap)
                            newNavMap.forEach((chapter, index) => {
                                const src = chapter.content['$'].src
                                chapter.id = `${src}`
                                chapter.href = `${dir}/${src}`.replace(unzipPath, '')
                                chapter.text = `${UPLOAD_URL}${dir}/${src}` //拿到这个章节的url路径
                                chapter.label = chapter.navLabel.text || ''

                                chapter.navId = chapter['$'].id
                                chapter.fileName = fileName
                                chapter.order = index + 1
                                chapters.push(chapter)
                            })
                            const chapterTree = Book.genContentsTree(chapters)
                            resolve({ chapters, chapterTree }) //返回给前端
                        } else {
                            reject(new Error('目录解析失败，目录数为0'))
                        }
                    }
                })
            })
        } else {
            throw new Error('目录文件不存在') //ncx文件
        }
    }

    toDb() {
        return {
            fileName: this.fileName,
            cover: this.coverPath,
            title: this.title,
            author: this.author,
            publisher: this.publisher,
            bookId: this.fileName,
            language: this.language,
            rootFile: this.rootFile,
            originalName: this.originalName,
            filePath: this.filePath,
            unzipPath: this.unzipPath,
            coverPath: this.coverPath,
            createUser: this.createUser,
            createDt: this.createDt,
            updateDt: this.updateDt,
            updateType: this.updateType,
            category: this.category,
            categoryText: this.categoryText
        }
    }

    getContents() {
        return this.contents
    }

    reset() { //删除已存在电子书的方法： 先判断是否存在 文件，封面，和解压文件
        console.log(this.fileName)
        if (Book.pathExists(this.filePath)) {
            fs.unlinkSync(Book.genPath(this.filePath)) //删除单个文件 用unlink这个方法
        }
        if (Book.pathExists(this.coverPath)) {
            fs.unlinkSync(Book.genPath(this.coverPath))
        }
        if (Book.pathExists(this.unzipPath)) { //这个是个文件夹，删除用rmdir这个方法
            fs.rmdirSync(Book.genPath(this.unzipPath), { recursive: true }) //表示进行迭代删除
        }
    }

    static genPath(path) {
        if (path.startsWith('/')) {
            path = `/${path}`
        }
        return `${UPLOAD_PATH}${path}`
    }

    static pathExists(path) {
        if (path.startsWith(UPLOAD_PATH)) {
            return fs.existsSync(path)
        } else {
            return fs.existsSync(Book.genPath(path))
        }
    }

    static genCoverUrl(book) {
        const { cover } = book
        if (book.updateType === 0) { //一本老得电子书
            if (cover) {
                if (cover.startsWith('/')) {
                    return `${OLD_UPLOAD_URL}${cover}`
                } else {
                    return `${OLD_UPLOAD_URL}/${cover}`
                }
            } else {
                return null
            }
        } else {
            if (cover) {
                if (cover.startsWith('/')) {
                    return `${UPLOAD_URL}${cover}`
                } else {
                    return `${UPLOAD_URL}/${cover}`
                }
            } else {
                return null
            }
        }
    }

    static genContentsTree(contents) {
        if (contents) {
            const contentsTree = []
            contents.forEach(c => {
                c.children = []
                if (c.pid === '') { //如果当前章节 pid为空，就说明 是一个一级目录
                    contentsTree.push(c) //直接放进树里 反正就一节！
                } else {
                    const parent = contents.find(_ => _.navId === c.pid)
                    parent.children.push(c)
                }
            })
            return contentsTree
        }
    }
}

module.exports = Book