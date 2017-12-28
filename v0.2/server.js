// 各种data定义
do {
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
     * @description 用户在房间里的留言
     * @type {Object}
     */
    var roomleavethings = {};
} while(0);

// tool函数
do {
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
     * @description 显示用户配置
     * @param {string} username - 用户名
     * @return {void}
     */
    var getuserconfig = function (username) {
        console.log(`username = ${username}, password = ${usercheck[username]}`);
    };

    /** 
     * @description 显示房间配置
     * @param {string} roomname - 房间名
     * @return {void}
     */
    var getroomconfig = function (roomname) {
        console.log(`roomname = ${roomname}, password = ${roomcheck[roomname]}`);
    };
} while(0);

// socket事件
do {
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
        var time = moment().format('YYYY-MM-DD HH:mm:ss');
        // 判断用户信息合法性
        if(usercheck[username] && roomcheck[roomname] && usercheck[username] === password && roomcheck[roomname] === roompass) {
            // 若合法，则设置信息
            this.socket.username = username;
            this.socket.roomname = roomname;
            // 加入房间
            ++ usertotal;
            this.socket.join(roomname);
            this.socket.joined = true;
            // 向房间中所有用户发送加入通知
            io.sockets.in(roomname).emit('sysmsg', {
                msg: `${username} joined`,
                time: time,
            });
            io.sockets.in(roomname).emit('sysmsg', {
                msg: `current user total: ${usertotal}`,
                time: time,
            }); 
            this.socket.emit('successlogin');
            if(roomleavethings[roomname]) {
                for(var usrnm in roomleavethings[roomname]) {
                    for(var i in roomleavethings[roomname][usrnm]) {
                        var tmp = roomleavethings[roomname][usrnm][i];
                        if(tmp.type === 'msg') {
                            this.socket.emit('newmsgsent', {
                                username: `(leave message)${usrnm}`,
                                msg: tmp.msg,
                                time: tmp.time,
                            });
                        } else if(tmp.type === 'img') {
                            this.socket.emit('newimgsent', {
                                username: `(leave image)${usrnm}`,
                                msg: tmp.msg,
                                time: tmp.time,
                            });
                        }
                    }
                }
            }
        } else {
            this.socket.emit('sysmsg', {
                msg: 'check your input',
                time: time,
            });
            this.socket.emit('joinedfailed');
        }
    };

    /** 
     * @description socket.io.event 收到新消息
     * @type {method}
     * @param {object} data
     * @return {void}
     */
    var event_newmsg = function (data) {
        var time = moment().format('YYYY-MM-DD HH:mm:ss');
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
                    time: time,
                });
            }
        } else {
            this.socket.emit('sysmsg', {
                msg: 'please login first',
                time: time,
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
        var time = moment().format('YYYY-MM-DD HH:mm:ss');
        if(this.socket.joined) {
            if(data.msg) {
                io.sockets.in(this.socket.roomname).emit('newimgsent', {
                    username: this.socket.username,
                    msg: data.msg,
                    time: time,
                });
            } else {
                this.socket.emit('sysmsg', {
                    msg: 'please input something',
                    time: time,
                });
            }
        } else {
            this.socket.emit('sysmsg', {
                msg: 'please login first',
                time: time,
            });
        }
    };

    /** 
     * @description socket.io.event 获取信息
     * @type {method}
     * @param {Object} data
     * @return {void}
     */
    var event_getinfo = function (data) {
        var time = moment().format('YYYY-MM-DD HH:mm:ss');
        if(this.socket.joined) {
            if(data.msg) {
                if(data.msg === 'currentuserinfo') {
                    // 获取当前用户信息
                    var msgs = [];
                    for(var i in io.sockets.connected) {
                        var username = io.sockets.connected[i].username;
                        var roomname = io.sockets.connected[i].roomname;
                        var joined = io.sockets.connected[i].joined;
                        if(joined && roomname === this.socket.roomname) {
                            msgs.push(`${username} is in ${roomname}`);
                        }
                    }
                    msgs.push(`total has ${msgs.length} users in ${this.socket.roomname}`);
                    for(var i in msgs) {
                        this.socket.emit('sysmsg', {
                            msg: msgs[i],
                            time: time,
                        });
                    }
                } else {
                    this.socket.emit('sysmsg', {
                        msg: 'please write the right command',
                        time: time,
                    });    
                }
            } else {
                this.socket.emit('sysmsg', {
                    msg: 'please input something',
                    time: time,
                });
            }
        } else {
            this.socket.emit('sysmsg', {
                msg: 'please login first',
                time: time,
            });
        }
    };

    /** 
      * @description 用户留言
      * @type {method}
      */
    var event_leavemsg = function (data) {
        if(this.socket.joined) {
            var username = this.socket.username;
            var roomname = this.socket.roomname;
            var time = moment().format('YYYY-MM-DD HH:mm:ss');
            roomleavethings[roomname] = roomleavethings[roomname] || {};
            roomleavethings[roomname][username] = roomleavethings[roomname][username] || [];
            roomleavethings[roomname][username].push({
                type: 'msg',
                time: time,
                msg: data.msg,
            });
            io.sockets.in(roomname).emit('newmsgsent', {
                username: `(leave image)${username}`,
                time: time,
                msg: data.msg,
            });
        } else {
            this.socket.emit('sysmsg', {
                msg: 'please login first',
                time: time,
            });
        }
    };

    /** 
      * @description 用户留图
      * @type {method}
      */
    var event_leaveimg = function (data) {
        if(this.socket.joined) {
            var username = this.socket.username;
            var roomname = this.socket.roomname;
            var time = moment().format('YYYY-MM-DD HH:mm:ss');
            roomleavethings[roomname] = roomleavethings[roomname] || {};
            roomleavethings[roomname][username] = roomleavethings[roomname][username] || [];
            roomleavethings[roomname][username].push({
                type: 'img',
                time: time,
                msg: data.msg,
            });
            io.sockets.in(roomname).emit('newimgsent', {
                username: `(leave image)${username}`,
                time: time,
                msg: data.msg,
            });
        } else {
            this.socket.emit('sysmsg', {
                msg: 'please login first',
                time: time,
            });
        }
    };

    /** 
      * @description 清空用户留言/图
      * @type {method}
      */
    var event_clearleave = function (data) {
        if(this.socket.joined) {
            var username = this.socket.username;
            var roomname = this.socket.roomname;
            if(roomleavethings[roomname] && roomleavethings[roomname][username]) {
                delete roomleavethings[roomname][username];
            }
        } else {
            this.socket.emit('sysmsg', {
                msg: 'please login first',
                time: moment().format('YYYY-MM-DD HH:mm:ss'),
            });
        }
    };

    /** 
      * @description 查询留言
      * @type {method}
      */
    var event_showleave = function (data) {
        if(this.socket.joined) {
            var roomname = this.socket.roomname;
            if(roomleavethings[roomname]) {
                for(var usrnm in roomleavethings[roomname]) {
                    for(var i in roomleavethings[roomname][usrnm]) {
                        var tmp = roomleavethings[roomname][usrnm][i];
                        if(tmp.type === 'msg') {
                            this.socket.emit('newmsgsent', {
                                username: `(leave message)${usrnm}`,
                                msg: tmp.msg,
                                time: tmp.time,
                            });
                        } else if(tmp.type === 'img') {
                            this.socket.emit('newimgsent', {
                                username: `(leave image)${usrnm}`,
                                msg: tmp.msg,
                                time: tmp.time,
                            });
                        }
                    }
                }
            }
        } else {
            this.socket.emit('sysmsg', {
                msg: 'please login first',
                time: moment().format('YYYY-MM-DD HH:mm:ss'),
            });
        }
    };

    /** *

    /**
     * @description socket.io.event 处理用户离开情况
     * @type {method}
     * @param {object} data
     * @return {void}
     */
    var event_leave = function (data) {
        var time = moment().format('YYYY-MM-DD HH:mm:ss');
        if(this.socket.joined) {
            -- usertotal;
            io.sockets.in(this.socket.roomname).emit('sysmsg', {
                msg: `${this.socket.username} left`,
                time: time,
            });
            io.sockets.in(this.socket.roomname).emit('sysmsg', {
                msg: `current user total: ${usertotal}`,
                time: time,
            });
            this.socket.joined = false;
            this.socket.leave(this.socket.roomname);
            this.socket.emit('successlogout');
        } else {
            this.socket.emit('sysmsg', {
                msg: 'please login first',
                time: time,
            });
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
} while(0);

// 初始化
do {
    // 用户配置
    do {
        初始化账户
        pushuser('A', '123');
        pushuser('B', '123');

        初始化房间
        pushroom('tinychat', '123456');
    } while(0);

    // 服务器配置
    do {
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
            socket.on('getinfo', event_getinfo.bind({socket: socket}));
            socket.on('leavemsg', event_leavemsg.bind({socket: socket}));
            socket.on('leaveimg', event_leaveimg.bind({socket: socket}));
            socket.on('clearleave', event_clearleave.bind({socket: socket}));
            socket.on('leave', event_leave.bind({socket: socket}));
            socket.on('showleave', event_showleave.bind({socket: socket}));
            socket.on('disconnect', event_disconnect.bind({socket: socket}));
        });
        app.use('/', express.static(`${__dirname}/TinyChat`));
        http.listen(8080, function () {console.log('listening on port 8080');});
    } while(0);
} while(0);