//这里是 封装了一个 result方法   联通 utils里的框架方法中 有两个分别判断 error=-1，success=0的方法， 以防需要来回修改接口的 code值

const {
    CODE_ERROR,
    CODE_SUCCESS,
    CODE_TOKEN_EXPIRED
} = require('../utils/constant')

class Result { //ES6 中的class类 本质还是一个function，只是对其中的结构进行了一定的改造，（更像java了）
    //constructor构造器-->传三个参数： data：向前端返回的数据，msg：向前端返回的信息， options：一些辅助信息 
    constructor(data, msg = '操作成功', options) {
        this.data = null
        if (arguments.length === 0) {
            this.msg = '操作成功'
        } else if (arguments.length === 1) {
            this.msg = data
        } else {
            this.data = data
            this.msg = msg
            if (options) {
                this.options = options
            }
        }
    }

    createResult() { //一个新定义的方法 由 json（res）调用
        if (!this.code) {
            this.code = CODE_SUCCESS //没有code时  默认code是 success
        }
        let base = { //这是一个基础结构，包含一个code和一个msg，  进行更新的数值都是更新的这两个code和msg
            code: this.code,
            msg: this.msg
        }
        if (this.data) {
            base.data = this.data //赋值，新增一个data属性进去
        }

        if (this.options) { //其余辅助信息，
            base = {...base, ...this.options } //，过解构赋值， 生成一个新的base对象。
        }
        console.log(base)
        return base //返回的base 对象就会填充进 json里面
    }

    json(res) {
        res.json(this.createResult()) //通过res.json 返回给前端。
    }

    success(res) {

        this.code = CODE_SUCCESS
        this.json(res)
    }

    fail(res) {
        this.code = CODE_ERROR
        this.json(res)
    }

    jwtError(res) {
        this.code = CODE_TOKEN_EXPIRED
        this.json(res)
    }
}

module.exports = Result