/** 
 * @description 用于记录某用户在某房间收到的消息
 */

var io = require('socket.io-client');
var fs = require('fs');
var md5 = require('md5');
var args = process.argv.splice(2);
var colors = [
	'#e21400', '#91580f', '#f8a700', '#f78b00',
	'#58dc00', '#287b00', '#a8f07a', '#4ae8c4',
	'#3b88eb', '#3824aa', '#a700ff', '#d300e7',
];

if(args.length !== 6) {
	console.log('usage: node record.js http://{server url} {username} {password} {room name} {room password} {record file name}');
	process.exit(0);
}

var url = args[0];
var username = args[1];
var password = args[2];
var roomname = args[3];
var roompass = args[4];
var filename = args[5];

if(fs.existsSync(filename)) {
	console.log(`already has ${filename}`);
	process.exit(0);
}

fs.writeFileSync(filename, '');

console.log(`connecting to ${url}`);

var socket = io.connect(args[0]);

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
	socket.on('sysmsg', function (data) {
		addsys(data.msg, data.time);
	});
	socket.on('newmsgsent', function (data) {
		addmsg(data.username, data.msg, data.time);
	});
	socket.on('newimgsent', function (data) {
		addimg(data.username, data.msg, data.time);
	});
	socket.on('disconnect', function (data) {
		process.exit(0);
	});
} while(0);

// tool函数
do {
	var filewritesync = function (data) {
		if(!fs.existsSync(filename)) {
			console.log(`${filename} disappeared`);
			process.exit(0);
		}
		fs.appendFileSync(filename, data);
	};

	var addmsg = function (username, msg, time) {
		msg = msg.replace(/[<>&"]/g,function(c){return {'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;'}[c];});
		filewritesync(
	`<div class="msg">
		<span class="username" color="${colors[parseInt(md5(username), 16) % colors.length]}">${username}</span>
		<span class="time" style="display: none;">${time}</span>
		<span class="say">${msg}</span>
	</div>
	`);
	};

	var addsys = function (msg, time) {
		msg = msg.replace(/[<>&"]/g,function(c){return {'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;'}[c];});
		filewritesync(
	`<div class="msg">
		<span class="time" style="display: none;">${time}</span>
		<span class="sys">${msg}</span>
	</div>
	`);
	};

	var addimg = function (username, msg, time) {
		filewritesync(
	`<div class="msg">
		<span class="username" color="${colors[parseInt(md5(username), 16) % colors.length]}">${username}</span>
		<span class="time" style="display: none;">${time}</span>
		<img class="img" src="${msg}"></img>
	</div>
	`);
	};
} while(0);