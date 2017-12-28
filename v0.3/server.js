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

    /** 
     * @description 是否有管理员权限
     * @type {Object}
     */
    var isadmin = {};
} while(0);

// tool函数
do {
    /** 
     * @description 新建用户
     * @type {method}
     * @param {string} username - 用户名
     * @param {string} password - 用户密码
     * @return {bool} 如果成功创建，返回true，否则返回false
     */
    var pushuser = function (username, password) {
        let usn = username;
        let pwd = md5(password);
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
     * @type {method}
     * @param {string} roomname - 房间名
     * @param {string} roompass - 房间密码
     * @return {bool} 如果成功创建，返回true，否则返回false
     */
    var pushroom = function (roomname, roompass) {
        let rmn = roomname;
        let pwd = md5(roompass);
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
     * @type {method}
     * @param {string} username - 用户名
     * @return {void}
     */
    var getuserconfig = function (username) {
        console.log(`username = ${username}, password = ${usercheck[username]}`);
    };

    /** 
     * @description 显示房间配置
     * @type {method}
     * @param {string} roomname - 房间名
     * @return {void}
     */
    var getroomconfig = function (roomname) {
        console.log(`roomname = ${roomname}, password = ${roomcheck[roomname]}`);
    };

    /** 
     * @description 创建管理员权限
     * @type {method}
     * @param {string} username - 用户名
     */
     var pushadmin = function (username) {
        isadmin[username] = true;
        console.log(`push admin (${username}) success`);
     };

     /** 
     * @description 删除管理员权限
     * @type {method}
     * @param {string} username - 用户名
     */
     var removeadmin = function (username) {
        delete isadmin[username];
        console.log(`remove admin (${username}) success`);
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
        let username = data.username;
        let password = data.password; // md5
        let roomname = data.roomname;
        let roompass = data.roompass; // md5
        let time = moment().format('YYYY-MM-DD HH:mm:ss');
        // 判断用户信息合法性
        if(usercheck[username] && roomcheck[roomname] && usercheck[username] === password && roomcheck[roomname] === roompass) {
            // 若合法，则设置信息
            this.socket.username = username;
            this.socket.roomname = roomname;
            // 加入房间
            ++ usertotal;
            this.socket.join(roomname);
            this.socket.joined = true;
            this.socket.emit('successlogin');
            // 向房间中所有用户发送加入通知
            io.sockets.in(roomname).emit('sysmsg', {
                msg: `${username} joined`,
                time: time,
            });
            io.sockets.in(roomname).emit('sysmsg', {
                msg: `current user total: ${usertotal}`,
                time: time,
            }); 
            if(roomleavethings[roomname]) {
                for(let username in roomleavethings[roomname]) {
                    for(let i in roomleavethings[roomname][username]) {
                        let tmp = roomleavethings[roomname][username][i];
                        if(tmp.type === 'msg') {
                            this.socket.emit('newmsgsent', {
                                username: `(leave message)${username}`,
                                msg: tmp.msg,
                                time: tmp.time,
                            });
                        } else if(tmp.type === 'img') {
                            this.socket.emit('newimgsent', {
                                username: `(leave image)${username}`,
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
        let time = moment().format('YYYY-MM-DD HH:mm:ss');
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
        let time = moment().format('YYYY-MM-DD HH:mm:ss');
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
        let time = moment().format('YYYY-MM-DD HH:mm:ss');
        if(this.socket.joined) {
            if(data.msg) {
                if(data.msg === 'currentuserinfo') {
                    // 获取当前用户信息
                    let msgs = [];
                    for(let i in io.sockets.connected) {
                        let username = io.sockets.connected[i].username;
                        let roomname = io.sockets.connected[i].roomname;
                        let joined = io.sockets.connected[i].joined;
                        if(joined && roomname === this.socket.roomname) {
                            msgs.push(`${username} is in ${roomname}`);
                        }
                    }
                    msgs.push(`total has ${msgs.length} users in ${this.socket.roomname}`);
                    for(let i in msgs) {
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
            let username = this.socket.username;
            let roomname = this.socket.roomname;
            let time = moment().format('YYYY-MM-DD HH:mm:ss');
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
            let username = this.socket.username;
            let roomname = this.socket.roomname;
            let time = moment().format('YYYY-MM-DD HH:mm:ss');
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
            let username = this.socket.username;
            let roomname = this.socket.roomname;
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
            let roomname = this.socket.roomname;
            if(roomleavethings[roomname]) {
                for(let username in roomleavethings[roomname]) {
                    for(let i in roomleavethings[roomname][username]) {
                        let tmp = roomleavethings[roomname][username][i];
                        if(tmp.type === 'msg') {
                            this.socket.emit('newmsgsent', {
                                username: `(leave message)${username}`,
                                msg: tmp.msg,
                                time: tmp.time,
                            });
                        } else if(tmp.type === 'img') {
                            this.socket.emit('newimgsent', {
                                username: `(leave image)${username}`,
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

    /**
     * @description 执行命令
     * @type {method}
     */
    var event_exec = function (data) {
        let time = moment().format('YYYY-MM-DD HH:mm:ss');
        if(this.socket.joined) {
            if(isadmin[this.socket.username] === true) {
                try {
                    this.socket.emit('sysmsg', {
                        msg: `${eval(data.msg)}`,
                        time: time,
                    });
                } catch(e) {
                    this.socket.emit('sysmsg', {
                        msg: new Error(`something went wrong when evaling: ${data.msg}`),
                        time: time,
                    });
                }
            } else {
                this.socket.emit('sysmsg', {
                    msg: 'you are not administrator',
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

    /** *

    /**
     * @description socket.io.event 处理用户离开情况
     * @type {method}
     * @param {object} data
     * @return {void}
     */
    var event_leave = function (data) {
        let time = moment().format('YYYY-MM-DD HH:mm:ss');
        if(this.socket.joined) {
            -- usertotal;
            this.socket.joined = false;
            this.socket.leave(this.socket.roomname);
            this.socket.emit('successlogout');
            io.sockets.in(this.socket.roomname).emit('sysmsg', {
                msg: `${this.socket.username} left`,
                time: time,
            });
            io.sockets.in(this.socket.roomname).emit('sysmsg', {
                msg: `current user total: ${usertotal}`,
                time: time,
            });
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
        // 初始化账户
        pushuser('A', '123');
        pushuser('B', '123');

        // 初始化房间
        pushroom('tinychat', '123456');

        // 初始化管理员
        pushadmin('A');
    } while(0);

    // 服务器配置
    do {
        readline.createInterface({
            input: process.stdin,
            output:process.stdout,
        }).on('line', function (data) {
            data.trim();
            let arr = data.split(' ');
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
                try {
                    eval(data);
                } catch(e) {
                    console.log(new Error(`something went wrong when evaling: ${data}`));
                }
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
            socket.on('exec', event_exec.bind({socket: socket}));
            socket.on('disconnect', event_disconnect.bind({socket: socket}));
        });
        app.use('/', express.static(`${__dirname}/TinyChat`));
        http.listen(8080, function () {console.log('listening on port 8080');});
    } while(0);
} while(0);