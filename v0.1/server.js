// 各种data定义
var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var fs = require('fs');
var md5 = require('md5');
var readline = require('readline');
var moment = require('moment');
moment.locale('zh-cn'); // 设置中国地区时间

/** 
 * @description 在线用户个数
 * @type {number}
 */
var usertotal = 0;

/** 
 * @description 用户配置(username: password)
 * @type {Object}
 */
var usercheck = {};

/** 
 * @description 房间配置(roomname: roompassword)
 * @type {Object}
 */
var roomcheck = {};

/** 
 * @description 新建用户
 * @param {string} username - 用户名
 * @param {string} password - 用户密码
 * @return {bool} 如果成功创建，返回true，否则返回false
 */
var pushuser = function (username, password) {
    var usn = username;
    var pwd = md5(password);
    if(usercheck[usn]) {
        console.log(`push user (${username}, ${password}) error`);
        return false;
    } else {
        usercheck[usn] = pwd;
        console.log(`push user (${username}, ${password}) success`);
        return true;
    }
};

/** 
 * @description 新建房间
 * @param {string} roomname - 房间名
 * @param {string} roompass - 房间密码
 * @return {bool} 如果成功创建，返回true，否则返回false
 */
var pushroom = function (roomname, roompass) {
    var rmn = roomname;
    var pwd = md5(roompass);
    if(roomcheck[rmn]) {
        console.log(`push room (${roomname}, ${roompass}) error`);
        return false;
    } else {
        roomcheck[rmn] = pwd;
        console.log(`push room (${roomname}, ${roompass}) success`);
        return true;
    }
};

/** 
 * @description 初始化
 * @type {method}
 * @return {void}
 */
var init = function () {
    // 初始化账户和房间
    
    pushuser('A', '123');
    pushuser('B', '123');

    pushroom('tinychat', '123456');
};

/** 
 * @description socekt.io.event 加入新用户
 * @type {method}
 * @param {object} data
 * @return {void}
 */
var event_join = function (data) {
    var username = data.username;
    var password = data.password; // md5
    var roomname = data.roomname;
    var roompass = data.roompass; // md5
    // 判断用户信息合法性
    if(usercheck[username] && roomcheck[roomname] && usercheck[username] == password && roomcheck[roomname] == roompass) {
        // 若合法，则设置信息
        this.socket.username = username;
        this.socket.roomname = roomname;
        // 加入房间
        ++ usertotal;
        this.socket.join(roomname);
        this.socket.joined = true;
        // 向房间中所有用户发送加入通知
        io.sockets.in(roomname).emit('userjoined', {
            username: username,
            time: moment().format('YYYY-MM-DD HH:mm:ss'),
        });
        io.sockets.in(roomname).emit('sysmsg', {
            msg: `current user: ${usertotal}`,
            time: moment().format('YYYY-MM-DD HH:mm:ss'),
        }); 
        this.socket.emit('successlogin');
    } else {
        this.socket.emit('sysmsg', {
            msg: 'check your input',
            time: moment().format('YYYY-MM-DD HH:mm:ss'),
        });
    }
};

/** 
 * @description socket.io.event 收到新消息
 * @type {method}
 * @param {object} data
 * @return {void}
 */
var event_newmsg = function (data) {
    if(this.socket.joined) {
        if(data.msg) {
            io.sockets.in(this.socket.roomname).emit('newmsgsent', {
                username: this.socket.username,
                msg: data.msg,
                time: moment().format('YYYY-MM-DD HH:mm:ss'),
            });
        } else {
            this.socket.emit('sysmsg', {
                msg: 'please input something',
                time: moment().format('YYYY-MM-DD HH:mm:ss'),
            });
        }
    } else {
        this.socket.emit('sysmsg', {
            msg: 'please login first',
            time: moment().format('YYYY-MM-DD HH:mm:ss'),
        });
    }
};

/** 
 * @description socket.io.event 收到新图片
 * @type {method}
 * @param {object} data
 * @return {void}
 */
var event_newimg = function (data) {
    if(this.socket.joined) {
        if(data.msg) {
            io.sockets.in(this.socket.roomname).emit('newimgsent', {
                username: this.socket.username,
                msg: data.msg,
                time: moment().format('YYYY-MM-DD HH:mm:ss'),
            });
        } else {
            this.socket.emit('sysmsg', {
                msg: 'please input something',
                time: moment().format('YYYY-MM-DD HH:mm:ss'),
            });
        }
    } else {
        this.socket.emit('sysmsg', {
            msg: 'please login first',
            time: moment().format('YYYY-MM-DD HH:mm:ss'),
        });
    }
};

/**
 * @description socket.io.event 处理用户离开情况
 * @type {method}
 * @param {object} data
 * @return {void}
 */
var event_leave = function (data) {
    if(this.socket.joined) {
        -- usertotal;
        io.sockets.in(this.socket.roomname).emit('userleft', {
            username: this.socket.username,
            time: moment().format('YYYY-MM-DD HH:mm:ss'),
        });
        this.socket.joined = false;
        this.socket.leave(this.socket.roomname);
        this.socket.emit('successlogout');
    }
};

/**
 * @description socket.io.event 处理用户掉线情况（同socket.io.event.leave）
 * @type {method}
 * @param {object} data
 * @return {void}
 */
var event_disconnect = function (data) {
    event_leave.bind(this)();
};

// 各种初始化
init();
readline.createInterface({
    input: process.stdin,
    output:process.stdout,
}).on('line', function (data) {
    data.trim();
    var arr = data.split(' ');
    if(arr[0] === 'exit') {
        process.exit(0);
    } else if(arr[0] === 'pushuser') {
        if(arr[1] && arr[2]) {
            pushuser(arr[1], arr[2]);
        } else {
            console.log('usage: pushuser {username} {password}');
        }
    } else if(arr[0] === 'pushroom') {
        if(arr[1] && arr[2]) {
            pushroom(arr[1], arr[2]);
        } else {
            console.log('usage: pushroom {roomname} {roompassword}');
        }
    } else {
        eval(data);
    }
});
io.on('connection', function (socket) {
    socket.on('join', event_join.bind({socket: socket}));
    socket.on('newmsg', event_newmsg.bind({socket: socket}));
    socket.on('newimg', event_newimg.bind({socket: socket}));
    socket.on('leave', event_leave.bind({socket: socket}));
    socket.on('disconnect', event_disconnect.bind({socket: socket}));
});
app.use('/', express.static(`${__dirname}/TinyChat`));
http.listen(8080, function () {console.log('listening on port 8080');});