var io = require('socket.io-client');
var fs = require('fs');
var md5 = require('md5');
var readline = require('readline');
var colors = require('colors');
var readlineSync = require('readline-sync');

var args = process.argv.splice(2);

if(args.length !== 6) {
	console.log('usage: node client.js http://{server url} username password roomname roompassword [echo?(true|false)]');
	process.exit(0);
}

var url = args[0];
var username = args[1];
var password = args[2];
var roomname = args[3];
var roompass = args[4];
var isecho = args[5] === 'true' ? true : false;

var disablednotice = false;

var jmpto = {};

console.log(`connecting to ${url}`);

var socket = io.connect(url);

do {
    // socket.io 事件
    do {
    	socket.on('connect', function () {
            console.log(`connect to ${url} success`);
            socket.emit('join', {
                username: username,
                password: md5(password),
                roomname: roomname,
                roompass: md5(roompass),
            });
        });
        socket.on('successlogin', function (data) {
            console.log(`login to ${url} success`);
        });
        socket.on('joinedfailed', function (data) {
            console.log('cannot to login');
            process.exit(0);
        });
        if(isecho) {
            socket.on('sysmsg', function (data) {
                addsys(data.msg, data.time);
            });
            socket.on('newmsgsent', function (data) {
                addmsg(data.username, data.msg, data.time);
            });
            socket.on('newimgsent', function (data) {
                addimg(data.username, data.msg, data.time);
            });
        }
        socket.on('disconnect', function (data) {
            process.exit(0);
        });
    } while(0);

    // keyboard 事件
    do {
        readline.createInterface({
            input: process.stdin,
            output:process.stdout,
        }).on('line', function (data) {
            data.trim();
            if(jmpto[data]) {
                jmpto[data]();
            } else if(data.substring(0, 9) === '/leavemsg') {
                socket.emit('leavemsg', {
                    msg: data.substring(10),
                });
            } else if(data.substring(0, 5) === '/exec') {
                socket.emit('exec', {
                    msg: data.substring(6),
                });
            } else {
                socket.emit('newmsg', {
                    username: username,
                    msg: data,
                });
            }
        });
    } while(0);

    // 键盘跳转
    do {
        jmpto['/clear'] = function (help) {
            if(help) return 'to clear all messages, usage /clear';
            console.log('\u001b[2J\u001b[0;0H');
        };

        jmpto['/exit'] = function (help) {
            if(help) return 'to exit, usage /exit';
            socket.emit('leave');
            process.exit(0);
        };

        jmpto['/whoami'] = function (help) {
            if(help) return 'to find out who am i, usage /whoami';
            addsys(`i am: ${username}`);
        };

        jmpto['/whereami'] = function (help) {
            if(help) return 'to find out where am i, usage /whereami';
            addsys(`i am in: ${roomname}`);
        };


        jmpto['/manual'] = function (help) {
            if(help) return 'to show the manual of tinychat, usage /manual';
            let notices = [
                'this is a command manual of tinychat',
                'first of all, you need to login',
                'you can ask the administrator to get your user account and room acount',
                `for example, if you have got an account, which has username 'guest' and password '123'`,
                `and you want to join a chat room, which names 'tinychat' and the password of the room is 'abc'`,
                `you can type '/guest/123/tinychat/abc' to join the room`,
                `when you can see 'usage: /{username}/{password}/{roomname}/{roompassword} to login' in the black box of the bottom of the page`,
                `and then, you will join the chatting`,
                `there's also have many commands to use`,
                // `for example, if you want to clear the system messages, like this paragraph, you can type '/clearsys' after you login`,
                `for more commands, type '/help' to find out`,
                `the notices maybe very noisy, you can type '/disablednotice' to close it, and type '/enablenotice' to open it`,
            ];
            for(let i in notices) {
                addsys(notices[i]);
            }
        };

        jmpto['/currentuserinfo'] = function (help) {
            if(help) return 'to get the informatino of the current users, usage /currentuserinfo';
            socket.emit('getinfo', {
                msg: 'currentuserinfo',
            });
        };

        jmpto['/help'] = function (help) {
            if(help) return 'to find helps, usage /help';
            for(let i in jmpto) {
                addsys(jmpto[i](1), '');
            }
        };

        // 删除此操作方法，直接在读取时使用
        jmpto['/leavemsg'] = function (help) {
            if(help) return 'to leave a message, usage /leavemsg {data}';
            console.log('please input something');
        };

        jmpto['/clearleave'] = function (help) {
            if(help) return 'to clear your left messages, usage /clearleave';
            socket.emit('clearleave');
        };

        jmpto['/showleave'] = function (help) {
            if(help) return 'to show left things, usage /showleave';
            socket.emit('showleave');
        };

        jmpto['/disablenotice'] = function (help) {
            if(help) return 'to disable the notifications, usage /disablenotice';
            disablednotice = true;
        };

        jmpto['/enablenotice'] = function (help) {
            if(help) return 'to enable the notifications, usage /enablenotice';
            disablednotice = false;
        };

        // 删除此操作方法，直接在读取时使用
        jmpto['/exec'] = function (help) {
            if(help) return 'to execute codes in the server, usage /exec';
            console.log('please input something');
        }

    } while(0);

    // tool函数
    do {
        var addmsg = function (username, msg, time) {
            console.log(`${username.red} ${time.blue}: ${msg}`);
            if(!disablednotice) {
                process.stdout.write('\x07')
            }
        };

        var addsys = function (msg, time) {
            console.log(`${'sys'.gray} ${time.blue}: ${msg.gray}`);
            if(!disablednotice) {
                process.stdout.write('\x07')
            }
        };

        var addimg = function (username, msg, time) {
            console.log(`# ${username.red} ${time.blue}: [img]`);
            if(!disablednotice) {
                process.stdout.write('\x07')
            }
        };
    } while(0);

} while(0);