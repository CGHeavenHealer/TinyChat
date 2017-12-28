express = require "express"
app = express()
http = require("http").Server app
io = require("socket.io") http
fs = require "fs"
md5 = require "md5"
readline = require "readline"
tcdb = require "./tcdb.js"
moment = require "moment"
moment.locale "zh-cn"

# 读取时间
gettime = -> moment().format "YYYY-MM-DD HH:mm:ss"

# 数据库配置
tcdb.database.MAX_INSERT_COUNTER = 5;
tcdb.database.MAX_REMOVE_COUNTER = 5;
tcdb.database.MAX_UPDATE_COUNTER = 5;
db = tcdb.make()
db_name = "db_tc"

# 名单类，用于处理名单
class Roll
    _roll: {}
    constructor: (@_roll = {}) ->
    insert: (key, val) ->
        if not @_roll[key] then @_roll[key] = val else undefined
    erase: (key) ->
        delete @_roll[key]
    get: (key) ->
        @_roll[key]
    exist: (key, val) ->
        @_roll[key] and @_roll[key] is val

# 储物类，用于处理存储
class Cache
    _cache: []
    constructor: (@_cache = []) ->
    insert: (data) ->
        @_cache.push data
    erase: (data) ->
        @_cache = (dt for dt in @_cache when dt isnt data)
    exist: (data) ->
        data in @_cache

# 用户类，用于存储用户信息以及sockets
class User
    
    @sockets = {}

    # 插入一个用户连接
    @insert = (name, socket) ->
        @sockets[name].insert socket

    # 删除一个用户连接
    @erase = (name, socket) ->
        @sockets[name].erase socket
        socket?.disconnect?()

    @roll = new Roll()

    # 注册一个用户
    @register = (name, password) ->
        
        # database => 插入一个用户
        db.insert tcdb.mkline "password", password, "user", name
        
        @roll.insert name, password
        @sockets[name] ?= new Cache()
    
    # 注销一个用户
    @unregister = (name) ->
        
        # database => 删除一个用户
        # 还未支持将房间记录中的用户删除
        db_remove (tcdb.mkline name, 0, "user"), -> true
        
        sck?.disconnect?() for sck in @sockets[name]._cache if @sockets[name]
        @roll.erase name

    # 判断一个用户存在性
    @exist = (name, password) ->
        @roll.exist name, password

# 房间类，用于存储房间信息以及sockets
class Room

    @sockets = {}

    @roll = new Roll()

    # 注册一个房间
    @register = (name, password) ->
        
        # database => 插入一个房间
        db.insert tcdb.mkline "roompass", password, "room", name
        # db.insert tcdb.mkline "id_cnt", 0, "room", name, "message"
        db.update (tcdb.mkline "id_cnt", 0, "room", name, "message"), (id_cnt) -> 
            id_cnt || 0
        
        
        @roll.insert name, password
        @sockets[name] = new Cache()

    # 注销一个房间
    @unregister = (name) ->
        
        # database => 删除一个房间
        db_remove (tcdb.mkline name, 0, "room"), -> true
        
        
        @roll.erase name
        @send name, 
              "sys message",
              time: gettime(),
              msg: "房间 #{name} 已被注销",
        sck?.isjoin = false for sck in @sockets[name]._cache
        delete @sockets[name]

    # 判断一个房间存在性
    @exist = (name, password) ->
        @roll.exist name, password

    # 加入一个用户
    @join = (name, socket) ->
        
        
        # database => 查询 返回未读消息
        lastseeid = (db.select (tcdb.mkline "lastseeid", 0, "room", name, "joined", socket.username), -> true)[0].lastseeid || 0
        res = []
        tmp = (db.select (tcdb.mkline "message", 0, "room", name), -> true)[0].message
        for key of tmp
            if key isnt "id_cnt" && lastseeid <= parseInt(key[3 ..]) + 20 # 返回未读消息+最近20条
                tmp2 = {}
                tmp2[key] = tmp[key]
                res.push tmp2

        for obj in res
            cc = ""
            for key of obj then cc = key
            socket.emit "new message",
                        username: obj[cc].sender,
                        time: obj[cc].time,
                        msg: obj[cc].text,
        
        # database => 更新
        curid = (db.select (tcdb.mkline "id_cnt", 0, "room", name, "message"), -> true)[0].id_cnt
        db.update (tcdb.mkline "lastseeid", 0, "room", name, "joined", socket.username), (lastseeid) -> lastseeid || curid
        
        
        @sockets[name].insert socket
        @send name,
              "sys message",
              time: gettime(),
              msg: "#{socket.username} 加入房间",

    # 离开一个用户
    @leave = (name, socket) ->
        socket.isjoin = false
        @sockets[name].erase socket
        @send name,
              "sys message",
              time: gettime(),
              msg: "#{socket.username} 离开房间",

    # 全体发送消息
    @send = (name, ent, data) ->
        sck?.emit? ent, data for sck in @sockets[name]._cache

io.on "connection", (socket) -> 

    # 用户登录
    socket.on "login", (data) ->
        time = gettime()
        if not socket.islogin
            if User.exist data.username, data.password
                User.insert data.username, socket
                socket.username = data.username
                socket.password = data.password
                socket.islogin = true
                socket.emit "login suc"
            else
                socket.emit "err", time: time, msg: "登录失败",
        else
            socket.emit "err", time: time, msg: "已经登录",

    # 用户加入房间
    socket.on "join", (data) ->
        time = gettime()
        if socket.islogin
            if Room.exist data.roomname, data.roompass
                socket.emit "join suc"
                Room.join data.roomname, socket
                socket.roomname = data.roomname
                socket.roompass = data.roompass
                socket.isjoin = true
            else
                socket.emit "err", time: time, msg: "加入房间失败",
        else
            socket.emit "err", time: time, msg: "请先登录",

    # 用户发言
    socket.on "message", (data) ->
        dt = data.msg                   # 数据
        time = gettime()                # 时间
        if socket.islogin
            if socket.isjoin
                if "#{dt}" isnt ""
                    
                    # database => 添加 新消息
                    curid = (db.update (tcdb.mkline "id_cnt", 0, "room", socket.roomname, "message"), (id) -> id + 1)[0]
                    db.update (tcdb.mkline "id_#{curid}", 0, "room", socket.roomname, "message"), (lastseeid) -> 
                        sender: socket.username,
                        time: time,
                        text: "#{dt}",

                    # database => 更新 用户lastseeid
                    db.update (tcdb.mkline "lastseeid", 0, "room", socket.roomname, "joined", socket.username), (lastseeid) -> curid

                    
                    Room.send socket.roomname,
                              "new message",
                              username: socket.username,
                              time: time,
                              msg: "#{dt}"
                else
                    socket.emit "err", time: time, msg: "输入不能为空",
            else
                socket.emit "err", time: time, msg: "请先加入房间",
        else
            socket.emit "err", time: time, msg: "请先登录",

    # 用户断线(离开房间、登出)
    socket.on "disconnect", ->
        if socket.islogin
            Room.leave socket.roomname, socket if socket.isjoin
            User.erase socket.username, socket

exit = ->
    db.close()
    process.exit 0
    
### 初始化 ###

try
	db.connect db_name
	readline.createInterface input: fs.createReadStream "config.txt"
	    .on "line", (line) ->
	        [type, name, password] = line.split(" ")
	        if type is "user"
	            User.register name, password
	        else if type is "room"
	            Room.register name, password
	    .on "close", () ->
	        readline.createInterface input: process.stdin
	                .on "line", (line) ->
	                    try
	                        console.log eval line
	                    catch e
	                        console.log e

	        app.use "/", express.static "#{__dirname}/TinyChat"
	        http.listen 8080, -> console.log "listening on port 8080"
	        # http.listen 2333, -> console.log "listening on port 2333"
catch e
	console.log "初始化是产生错误: " + e