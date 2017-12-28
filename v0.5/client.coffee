io = require "socket.io-client"
fs = require "fs"
md5 = require "md5"
readline = require "readline"
colors = require "colors"
disable =
    notice: false,
col = [
    "#e21400", "#91580f", "#f8a700", "#f78b00",
    "#58dc00", "#287b00", "#a8f07a", "#4ae8c4",
    "#3b88eb", "#3824aa", "#a700ff", "#d300e7",
]

addmsg = (username, msg, time, ishist) ->
    if usepip
        console.log """
        <div class="msg">
            <span class="username" color="#{col[parseInt(md5(username), 16) % col.length]}">#{if ishist then "(leave) " else ""}#{username}</span>
            <span class="time" style="display: none;">#{time}</span>
            <span class="say">#{msg}</span>
        </div>
        """
    else
        console.log "#{if ishist then "(leave) " else ""}#{username.red} #{time.blue}: #{msg}"
        process.stdout.write "\x07" if not disable.notice

addsys = (msg, time) ->
    if usepip
        console.log """
        <div class="msg">
		    <span class="time" style="display: none;">#{time}</span>
		    <span class="sys">#{msg}</span>
	    </div>
        """
    else
        console.log "#{"sys".gray} #{time.blue}: #{msg.gray}"
        process.stdout.write "\x07" if not disable.notice

addimg = (username, msg, time, ishist) ->
    if usepip
        console.log """
        <div class="msg">
		    <span class="username" color="#{col[parseInt(md5(username), 16) % col.length]}">#{if ishist then "(leave) " else ""}#{username}</span>
		    <span class="time" style="display: none;">#{time}</span>
		    <img class="img" src="#{msg}"></img>
	    </div>
        """
    else
        console.log "# #{if ishist then "(leave) " else ""}#{username.red} #{time.blue}: [img]"
        process.stdout.write "\x07" if not disable.notice

class Cmd
    @cache = {}
    @info = {}
    @set = (key, info, val) ->
        @info[key] = info
        @cache[key] = val
    @feed = (str) ->
        for key, val of @cache
            if (str[0 .. key.length - 1] is key and str[key.length] is " ") or (str is key)
                val str[key.length + 1 ..]
                return true
        return false

Cmd.set "/login", "如果需要登录, 使用: /login 用户名 密码", (data) ->
    [username, password, roomname, roompassword] = data.split " "
    socket.emit "login",
        username: username,
        password: password,
    if roomname
        # 事实上这么些有点小问题，如果由于网络原因，join比login先emit到server，会返回加入房间失败
        socket.emit "join",
            roomname: roomname,
            roompassword: roompassword

Cmd.set "/join", "如果需要加入房间, 使用: /join 房间名 房间密码", (data) ->
    [roomname, roompassword] = data.split " "
    socket.emit "join",
        roomname: roomname,
        roompassword: roompassword

Cmd.set "/logout", "如果需要登出, 使用: /logout", ->
    socket.emit "logout"

Cmd.set "/eraseHist", "如果需要清空留言, 使用: /eraseHist", ->
    socket.emit "eraseHist"

Cmd.set "/leave", "如果需要离开房间, 使用: /leave", ->
    socket.emit "leave"

Cmd.set "/lvmsg", "如果需要留言, 使用: /lvmsg 文字", (data) ->
    socket.emit "message",
        type: "text",
        data: data,
        ishist: true,

Cmd.set "/help", "如果需要查看命令, 使用: /help", (data) ->
    if Cmd.info[data]
        addsys Cmd.info[data], ""
    else
        addsys "command not found: /help #{data}", ""

Cmd.set "/manual", "如果需要查看命令列表, 使用: /manual", ->
    addsys val, "" for key, val of Cmd.info

Cmd.set "/info", "如果需要获取信息, 使用: /info [curuser | me | room | leftmsg]", (data) ->
    socket.emit "info", data: data

Cmd.set "/switch", "如果需要修改开关, 使用: /switch [disable | enable] [notice]", (data) ->
    [type, obj] = data.split " "
    if obj is "notice"
        if type is "disable"
            disable.notice = true
        else if type is "enable"
            disable.notice = false
        else
            addsys "command not found: /switch #{data}", ""
    else
        addsys "command not found: /switch #{data}", ""

args = process.argv.splice(2);

if args.length isnt 2
    console.log("usage: node client.js http://{server url} {use pipe?}")
    process.exit(0)

url = args[0]

usepip = (if args[1] is "true" then true else false)

socket = io.connect url

socket.on "sys", (data) ->
    addsys data.data, data.time

socket.on "new message", (data) ->
    addmsg data.username, data.data, data.time, data.ishist

socket.on "new image", (data) ->
    addimg data.username, data.data, data.time, data.ishist

socket.on "disconnect", (data) ->
    process.exit 0

readline.createInterface input: process.stdin, output: process.stdout
    .on "line", (line) ->
        line = line.trim()
        if line[0] is "/"
            if not Cmd.feed line
                addsys "command not found: #{line}", ""
        else
            socket.emit "message",
                type: "text",
                data: line,
                ishist: false,
