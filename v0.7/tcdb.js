/** 
 * tcdb 数据库
 * // 实际上就是一个JSON的package
 */

((global) => {

    // 文件读取API
    let fs = require("fs");
    
    // 释放到全局 => key<string>, val<anything>
    let release = (key, val) => this[key] = val;

    // database 类
    let database = function () {
        this.data = {};
        this.lock = false;
        this.name = "";
        this._insert_counter = 0;
        this._remove_counter = 0;
        this._update_counter = 0;
    };
    
    // 数据库位置
    database.DB_PATH = "./"
    
    // 最多缓存插入次数
    database.MAX_INSERT_COUNTER = 100;
    
    // 最多缓存删除次数
    database.MAX_REMOVE_COUNTER = 100;
    
    // 最多缓存更新次数
    database.MAX_UPDATE_COUNTER = 100;
    
    // database 对象属性
    let dbproto = database.prototype;
    
    // 数据库数据
    dbproto.data = {};
    
    // 数据库锁
    dbproto.lock = false;
    
    // 数据库名
    dbproto.name = "";
    
    // @private 插入次数
    dbproto._insert_counter = 0;
    
    // @private 删除次数
    dbproto._remove_counter = 0;
    
    // @private 更新次数
    dbproto._update_counter = 0;
    
    // 连接数据库 => db_name: string
    dbproto.connect = function (db_name) {
        while(this.lock);
        this.lock = true;
        this.name = db_name;
        this._read();
        this.lock = false;
        this._insert_counter = 0;
        this._remove_counter = 0;
        this._update_counter = 0;
    };
    
    // 关闭数据库
    dbproto.close = function () {
        while(this.lock);
        this.lock = true;
        this._write();
        this.lock = false;
    };
    
    // 保存数据库
    dbproto.save = function () {
        while(this.lock);
        this.lock = true;
        this._write();
        this.lock = false;
    };
    
    // 插入数据
    dbproto.insert = function (data) {
        while(this.lock);
        this.lock = true;
        
        if(++ this._insert_counter === database.MAX_INSERT_COUNTER) {
            this._write();
            this._insert_counter = 0;
        }
        
        let fn = (pt, data) => {
            for(let key in data) {
                let val = data[key];
                if(!pt[key]) {
                    pt[key] = val;
                } else if(Object.prototype.toString.call(val) === '[object Object]') {
                    fn(pt[key], val);
                } else {
                    pt[key] = val;
                }
            }
        };
        
        fn(this.data, data);
        
        this.lock = false;
    };
    
    // 删除数据
    dbproto.remove = function (path, condfn) {
        while(this.lock);
        this.lock = true;
        
        if(++ this._remove_counter === database.MAX_REMOVE_COUNTER) {
            this._write();
            this._remove_counter = 0;
        }
        
        let fn = (pt, path, condfn) => {
            for(let key in path) {
                let val = path[key];
                if(!pt[key]) {
                    return;
                } else if(Object.prototype.toString.call(val) === '[object Object]') {
                    fn(pt[key], val, condfn);
                } else if(condfn(val)) {
                    delete pt[key];
                }
            }
        };
        
        fn(this.data, path, condfn);
        
        this.lock = false;
    };
    
    // 查询数据 开始位置, 判断函数
    dbproto.select = function (path, condfn) {
        while(this.lock);
        this.lock = true;
        
        let res = [];
        
        let fn = (pt, path, condfn) => {
            for(let key in path) {
                let val = path[key];
                if(!pt[key]) {
                    pt[key] = val;
                }
                if(Object.prototype.toString.call(val) === '[object Object]') {
                    fn(pt[key], val, condfn);
                } else if(condfn(pt[key])) {
                    let tmp = {};
                    tmp[key] = pt[key];
                    res.push(tmp);
                }
            }
        };
        
        fn(this.data, path, condfn);
        
        this.lock = false;
        
        return res;
    };
    
    // 更新数据
    dbproto.update = function (path, updatefn) {
        while(this.lock);
        this.lock = true;
        
        if(++ this._update_counter === database.MAX_UPDATE_COUNTER) {
            this._write();
            this._update_counter = 0;
        }
        
        let res = [];
        
        let fn = (pt, path, updatefn) => {
            for(let key in path) {
                let val = path[key];
                if(!pt[key]) {
                    pt[key] = val;
                }
                if(Object.prototype.toString.call(val) === '[object Object]') {
                    fn(pt[key], val, updatefn);
                } else {
                    pt[key] = updatefn(pt[key]);
                    res.push(pt[key]);
                }
            }
        };
        
        fn(this.data, path, updatefn);
        
        this.lock = false;
        
        return res;
    }
    
    // 获取所有数据
    dbproto.show = function () {
        return this.data;
    };
    
    // @private 从文件读取数据库
    dbproto._read = function () {
        try {
            this.data = JSON.parse(fs.readFileSync(database.DB_PATH + this.name));
        } catch(e) {
            console.log(e);
            this.data = {};
        };
    };
    
    // @private 将数据库保存到文件
    dbproto._write = function () {
        try {
            fs.writeFileSync(database.DB_PATH + this.name, JSON.stringify(this.data));
        } catch(e) {
            console.log(e);
        }
    };
    

    // 释放构造函数
    release("make", () => new database());
    
    // 释放构造函数
    release("database", database);
    
    // 释放构造object函数
    release("mkline", function () {
        let res = {};
        if(arguments.length < 2) return res;
        let key = arguments[0];
        let val = arguments[1];
        let fn = (id, hd, key, val) => {
            if(id >= arguments.length) {
                hd[key] = val;
                return;
            }
            let tmp = arguments[id];
            hd[tmp] = {};
            fn(id + 1, hd[tmp], key, val);
        };
        fn(2, res, key, val);
        return res;
    });
    
})(this);