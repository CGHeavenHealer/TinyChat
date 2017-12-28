socket = io()
colors = [
    "#e21400", "#91580f", "#f8a700", "#f78b00",
    "#58dc00", "#287b00", "#a8f07a", "#4ae8c4",
    "#3b88eb", "#3824aa", "#a700ff", "#d300e7",
]
$window = $ window
$message = $ ".message"
$inputbox = $ ".inputbox"
disable = 
    time: false
    notice: true
manual = {}


# 读取base64编码
filereader = (callback, fr = null, $file = null) -> 
    fr = new FileReader()
    $file = $ "<input></input>"
             .attr "type", "file"
             .css "display", "none"
             .appendTo $ "body"
             .change -> fr.readAsDataURL(this.files[0]) if this.files.length
    $file.click()
    fr.onload = (data) ->
        callback data.target.result
        $file.remove()

newnotice = (title, body) ->
    new Notification title, body: body, noscreen: true if disable.notice

addmsg = (username, msg, time, ishist) ->
    $ "<div></div>"
        .addClass "msg"
        .append($ "<span></span>"
                    .addClass "username"
                    .text "#{if ishist then "(leave)" else ""} #{username}"
                    .css "color", colors[parseInt($.md5(username), 16) % colors.length])
        .append($ "<span></span>"
                    .addClass "time"
                    .text time
                    .css "display", if disable.time then "none" else "")
        .append($ "<span></span>"
                    .addClass"say"
                    .text msg)
        .hide()
        .fadeIn "normal", -> $message[0].scrollTop = $message[0].scrollHeight
        .appendTo $message
    newnotice "通知", "新消息"

addsys = (msg, time) ->
    $ "<div></div>"
        .append($ "<span></span>"
                    .addClass "time"
                    .text time
                    .css "display", if disable.time then "none" else "")
        .addClass "sys"
        .append($ "<span></span>"
                    .text msg)
        .hide()
        .fadeIn "normal", -> $message[0].scrollTop = $message[0].scrollHeight
        .appendTo $message
    newnotice "通知", "新系统消息"


addimg = (username, msg, time, ishist) ->
    $ "<div></div>"
        .append($ "<span></span>"
                    .addClass "username"
                    .text "#{if ishist then "(leave)" else ""} #{username}"
                    .css "color", colors[parseInt($.md5(username), 16) % colors.length])
        .append($ "<span></span>"
                    .addClass "time"
                    .text time
                    .css "display", if disable.time then "none" else "")
        .append($ "<img></img>"
                    .addClass "img"
                    .attr "src", msg)
        .hide()
        .fadeIn "normal", -> $message[0].scrollTop = $message[0].scrollHeight
        .appendTo $message
    newnotice "通知", "新图片"

socket.on "sys", (data) ->
    addsys data.data, data.time

socket.on "new message", (data) ->
    addmsg data.username, data.data, data.time, data.ishist

socket.on "new image", (data) ->
    addimg data.username, data.data, data.time, data.ishist

socket.on "disconnect", (data) ->
    $("body").empty()
    socket = null

class Cmd
    @cache = {}
    @info = {}
    @nodefault = {}
    @set = (key, info, val) ->
        @info[key] = info
        @cache[key] = val
    @feed = (str) ->
        for key, val of @cache
            if (str[0 .. key.length - 1] is key and str[key.length] is " ") or (str is key)
                val str[key.length + 1 ..]
                return true
        return false
    @nodef = (str) ->
        for key, val of @cache
            if (str[0 .. key.length - 1] is key and str[key.length] is " ") and @nodefault[key]
                return true
            else if (str is key) and @nodefault[key]
                return true
        return false

$window.keydown (ent) ->
    $inputbox.focus()
    if ent.which is 13
        str = $inputbox.val()
        if str[0] is "/"
            if Cmd.feed str
                if not Cmd.nodef str
                    $inputbox.val ""
                    $inputbox.blur()
            else 
                addsys "command not found: #{str}", ""
        else
            socket.emit "message",
                        type: "text",
                        data: str,
                        ishist: false,
            $inputbox.val ""
            $inputbox.blur()

Cmd.set "/img", "如果需要发送图片, 使用: /img", ->
    filereader (data) ->
        socket.emit "message",
                    type: "image",
                    data: data,
                    ishist: false,

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
    $message.empty()
    socket.emit "leave"

Cmd.set "/lvmsg", "如果需要留言, 使用: /lvmsg 文字", (data) ->
    socket.emit "message",
                type: "text",
                data: data,
                ishist: true,

Cmd.set "/lvimg", "如果需要留图, 使用: /lvimg", ->
    filereader (data) ->
        socket.emit "message",
                    type: "image",
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

Cmd.set "/clear", "如果需要清空消息, 使用: /clear [sys | all]", (data) ->
    switch data
        when "sys"
            $(".message>*").filter(".sys").fadeOut "normal", -> $(this).remove()
        when "all"
            $(".message>*").fadeOut "normal", -> $(this).remove()
        else
            addsys "command not found: /clear #{data}", ""

Cmd.set "/switch", "如果需要修改开关, 使用: /switch [disable | enable] [time | notice]", (data) ->
    [type, obj] = data.split " "
    if obj is "time"
        if type is "disable"
            disable.time = true
            $(".time").fadeOut()
        else if type is "enable"
            disable.time = false
            $(".time").fadeIn()
        else
            addsys "command not found: /switch #{data}", ""
    else if obj is "notice"
        if type is "disable"
            disable.notice = true
        else if type is "enable"
            disable.notice = false
        else
            addsys "command not found: /switch #{data}", ""
    else
        addsys "command not found: /switch #{data}", ""

Cmd.set "/emoji", "如果需要添加表情, 使用: /emoji 表情名拼音{xiaoku: 😂 | lenghan: 😓 | shuijiao: 😪 | ku: 😢 | gaoxing: 😊}", (data) ->
    Cmd.nodefault["/emoji"] = true
    dt = xiaoku: "😂", lenghan: "😓", shuijiao: "😪", ku: "😢", gaoxing: "😊"
    if dt[data]
        $inputbox.val dt[data]
    else
        addsys "command not found: /emoji #{data}", ""

# 申请通知权限
Notification.requestPermission()