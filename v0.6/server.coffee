express = require "express"
app = express()
http = require("http").Server app
io = require("socket.io") http
fs = require "fs"
md5 = require "md5"
readline = require "readline"
moment = require "moment"
moment.locale "zh-cn"

gettime = -> moment().format "YYYY-MM-DD HH:mm:ss"

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
        @roll.insert name, password
        @sockets[name] ?= new Cache()
    
    # 注销一个用户
    @unregister = (name) ->
        sck?.disconnect?() for sck in @sockets[name]._cache if @sockets[name]
        @roll.erase name

    # 判断一个用户存在性
    @exist = (name, password) ->
        @roll.exist name, password

# 房间类，用于存储房间信息以及sockets
class Room

    @hist = {}

    @sockets = {}

    @roll = new Roll()

    # 注册一个房间
    @register = (name, password) ->
        @roll.insert name, password
        @sockets[name] = new Cache()

    # 注销一个房间
    @unregister = (name) ->
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
        @sockets[name].insert socket
        @send name,
              "sys message",
              time: gettime(),
              msg: "#{socket.username} 加入房间",
        for key1, val1 of @hist[name]
            for key2, val2 of val1
                socket.emit "new message",
                            username: socket.username,
                            time: val2.time,
                            ishist: true,
                            msg: "#{val2.msg}",

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

    # 判断房间里一个用户存在性
    @existUser = (name, username) ->
        for sck in @sockets[name]._cache
            return true if sck?.username is username
        return false

    # 保存留言
    @insertHist = (name, data) ->
        @hist[name] ?= {}
        @hist[name][data.username] ?= []
        @hist[name][data.username].push data

    # 删除留言
    @eraseHist = (name, username) ->
        delete @hist[name]?[username]

    # 获取在线用户
    @getCuruser = (name) ->
        sck.username for sck in @sockets[name]._cache

    # 发送所有留言
    @sendHist = (name, username, socket) ->
        for key1, val1 of @hist[name]
            for key2, val2 of val1
                socket.emit "new message",
                            username: socket.username,
                            time: val2.time,
                            ishist: true,
                            msg: "#{val2.data}"

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

    # 用户发言/图
    socket.on "message", (data) ->
        data.username = socket.username # Room.insertHist 使用
        data.time = gettime()           # Room.insertHist 使用
        dt = data.msg                   # 数据
        ishist = data.ishist            # 是否历史化: true 记录到留言 | false 不记录到留言
        time = data.time                # 时间
        if socket.islogin
            if socket.isjoin
                if "#{dt}" isnt ""
                    Room.send socket.roomname,
                              "new message",
                              username: socket.username,
                              time: time,
                              ishist: ishist,
                              msg: "#{dt}"
                    Room.insertHist socket.roomname, data if ishist
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

# 初始化
readline.createInterface input: fs.createReadStream "config.txt"
    .on "line", (line) ->
        [type, name, password] = line.split(" ")
        if type is "user"
            User.register name, password
        else if type is "room"
            Room.register name, password
    .on "close", () ->
        app.use "/", express.static "#{__dirname}/TinyChat"
        http.listen 8080, -> console.log "listening on port 8080"
        # http.listen 2333, -> console.log "listening on port 2333"