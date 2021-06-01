const { env } = require('./env')
const UPLOAD_PATH = env === 'dev' ? '/Users/fuyuwen/upload/admin-upload-ebook' : '/root/upload/admin-upload/ebook'

const UPLOAD_URL = env === 'dev' ? 'https://bookadminproject.com/admin-upload-ebook' : 'https://www.bookadminproject.com/admin-upload-ebook'

module.exports = {
    CODE_ERROR: -1, //一个错误的标识码， 为-1
    CODE_SUCCESS: 0,
    CODE_TOKEN_EXPIRED: -2,
    debug: true, //上线的时候记得改为false
    PWD_SALT: 'admin_imooc_node', //这个 SALT 可以理解为jwt重的一个密钥，自己设置的！与密码混合后生成新的密码，外界不知密钥因此很难破解
    PRIVATE_KEY: 'admin_imooc_node_test_youbaobao_xyz', //自己去写密钥---jwt网址，这里用的跟老师的一样
    JWT_EXPIRED: 60 * 60, //时间是秒级的， 先指定一个小时
    UPLOAD_PATH,
    UPLOAD_URL,
    MIME_TYPE_EPUB: 'application/epub+zip'
}