$(function () {

// 设置变量
do {
	var socket = io();
	var colors = [
		'#e21400', '#91580f', '#f8a700', '#f78b00',
		'#58dc00', '#287b00', '#a8f07a', '#4ae8c4',
		'#3b88eb', '#3824aa', '#a700ff', '#d300e7',
	];
	var $window = $(window);
	var $message = $('.message');
	var $inputbox = $('.inputbox');
	var joined = false;
	var jmpto = {};
	var username, roomname;
	var disabled = true;           // 是否关闭时间显示
	var hasnewmsg = false;		   // 是否有新消息
	var disablednotice = false;	   // 是否关闭新消息提示
} while(0);

// tool函数
do {
	var newnotification = function (title, body) {
		if(disablednotice) return;
		new Notification(title, {
			body: body,
			noscreen: true,
		});
	};

	var addmsg = function (username, msg, time) {
		$('<div></div>').addClass('msg')
		.append($('<span></span>').addClass('username').text(username).css('color', colors[parseInt($.md5(username), 16) % colors.length]))
		.append($('<span></span>').addClass('time').text(time).css('display', disabled ? 'none' : ''))
		.append($('<span></span>').addClass('say').text(msg))
		.hide().fadeIn('normal', function () {
			$message[0].scrollTop = $message[0].scrollHeight;
		}).appendTo($message);
		hasnewmsg = true;
		newnotification('!!!', 'new message');
	};

	var addsys = function (msg, time) {
		$('<div></div>')
		.append($('<span></span>').addClass('time').text(time).css('display', disabled ? 'none' : ''))
		.addClass('sys').append($('<span></span>').text(msg)).hide().fadeIn('normal', function () {
			$message[0].scrollTop = $message[0].scrollHeight;
		}).appendTo($message);
		// 建议关闭
		hasnewmsg = true;
		newnotification('!!!', 'new system message');
	};

	var addimg = function (username, msg, time) {
		$('<div></div>')
		.append($('<span></span>').addClass('username').text(username).css('color', colors[parseInt($.md5(username), 16) % colors.length]))
		.append($('<span></span>').addClass('time').text(time).css('display', disabled ? 'none' : ''))
		.append($('<img></img>').addClass('img').attr('src', msg))
		.hide().fadeIn('normal', function () {
			$message[0].scrollTop = $message[0].scrollHeight;
		}).appendTo($message);
		hasnewmsg = true;
		newnotification('!!!', 'new image');
	};
} while(0);

// 用户输入配置
do {
	jmpto['/clearsys'] = function (help) {
		if(help) return 'to clear system messages, usage /clearsys';
		$('.message>*').filter('.sys').fadeOut('normal', function () {
			$(this).remove();
		});
	};

	jmpto['/clear'] = function (help) {
		if(help) return 'to clear all messages, usage /clear';
		$('.message>*').fadeOut('normal', function () {
			$(this).remove();
		});
	};

	jmpto['/exit'] = function (help) {
		if(help) return 'to exit, usage /exit';
		socket.emit('leave');
	};

	jmpto['/whoami'] = function (help) {
		if(help) return 'to find out who am i, usage /whoami';
		if(joined) {
			addsys(`i am: ${username}`);
		} else {
			addsys('please login first');
		}
	};

	jmpto['/whereami'] = function (help) {
		if(help) return 'to find out where am i, usage /whereami';
		if(joined) {
			addsys(`i am in: ${roomname}`);
		} else {
			addsys('please login first');
		}
	};

	jmpto['/disabletime'] = function (help) {
		if(help) return 'to disable the time display, usage /disabletime';
		$('.time').fadeOut();
		disabled = true;
	};

	jmpto['/enabletime'] = function (help) {
		if(help) return 'to enable the time display, usage /enabletime';
		$('.time').fadeIn();
		disabled = false;
	};

	jmpto['/exec'] = function (help) {
		if(help) return 'to execute a javascript command, usage /exec';
		addsys(`exec return: ${eval(prompt('execute what?'))}`);
	};

	jmpto['/clearnotice'] = function (help) {
		if(help) return 'to clear the notifications, usage /clearnotice';
		hasnewmsg = false;
	};

	jmpto['/img'] = function (help) {
		if(help) return 'to send images, usage /img';
		filereader(function (data) {
			socket.emit('newimg', {
				username: username,
				msg: data,
			});
		});
	};

	jmpto['/manual'] = function (help) {
		if(help) return 'to show the manual of tinychat, usage /manual';
		var notices = [
			'this is a command manual of tinychat',
			'first of all, you need to login',
			'you can ask the administrator to get your user account and room acount',
			`for example, if you have got an account, which has username 'guest' and password '123'`,
			`and you want to join a chat room, which names 'tinychat' and the password of the room is 'abc'`,
			`you can type '/guest/123/tinychat/abc' to join the room`,
			`when you can see 'usage: /{username}/{password}/{roomname}/{roompassword} to login' in the black box of the bottom of the page`,
			`and then, you will join the chatting`,
			`there's also have many commands to use`,
			`for example, if you want to clear the system messages, like this paragraph, you can type '/clearsys' after you login`,
			`for more commands, type '/help' to find out`,
			`the notices maybe very noisy, you can type '/disablednotice' to close it, and type '/enablenotice' to open it`,
		];
		for(var i in notices) {
			addsys(notices[i]);
		}
	};

	jmpto['/currentuserinfo'] = function (help) {
		if(help) return 'to get the informatino of the current users, usage /currentuserinfo';
		socket.emit('getinfo', {
			msg: 'currentuserinfo',
		});
	};

	jmpto['/disablenotice'] = function (help) {
		if(help) return 'to disable the notifications, usage /disablenotice';
		disablednotice = true;
	};

	jmpto['/enablenotice'] = function (help) {
		if(help) return 'to enable the notifications, usage /enablenotice';
		disablednotice = false;
	};

	jmpto['/help'] = function (help) {
		if(help) return 'to find helps, usage /help';
		for(var i in jmpto) {
			addsys(jmpto[i](1), '');
		}
	};

	jmpto['/leavemsg'] = function (help) {
		if(help) return 'to leave a message, usage /leavemsg';
		socket.emit('leavemsg', {
			msg: prompt('input message'),
		});
	};

	jmpto['/leaveimg'] = function (help) {
		if(help) return 'to leave a image, usage /leaveimg';
		filereader(function (data) {
			socket.emit('leaveimg', {
				msg: data,
			});
		});
	};

	jmpto['/clearleave'] = function (help) {
		if(help) return 'to clear your left messages, usage /clearleave';
		socket.emit('clearleave');
	};

	jmpto['/showleave'] = function (help) {
		if(help) return 'to show left things, usage /showleave';
		socket.emit('showleave');
	};

	$window.keydown(function (event) {
		$inputbox.focus();
		if(event.which === 13) { // enter
			if(joined) {
				var val = $inputbox.val();
				if(jmpto[val]) {
					jmpto[val]();
				} else {
					socket.emit('newmsg', {
						msg: val,
					});
					hasnewmsg = false;
				}
			} else {
				var str = $inputbox.val();
				var arr = str.split('\/');
				if(arr.length === 5) {
					username = arr[1];
					roomname = arr[3];
					socket.emit('join', {
						username: arr[1],
						password: $.md5(arr[2]),
						roomname: arr[3],
						roompass: $.md5(arr[4]),
					});
				} else {
					addsys('please check input');
				}
			}
			$inputbox.val('');
		}
	});
} while(0);

// socket消息接收
do {
	socket.on('successlogin', function (data) {
		$inputbox.attr('placeholder', 'Type here...');
		joined = true;
	});
	socket.on('successlogout', function (data) {
		$inputbox.attr('placeholder', 'usage: /{username}/{password}/{roomname}/{roompassword} to login');
		joined = false;
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
		hasnewmsg = false;
		$('body').empty();
		socket = null;
	});
} while(0);
	
// 初始化
do {
	// 设置通知
	setInterval(function() {
		if(!disablednotice && hasnewmsg === true) {
			if (/new/.test(document.title) === false) {
				document.title = '[new message]';
			} else {
				document.title = '[___________]';
			}
		} else {
			document.title = 'TinyChat';
		}
	}, 500);
	
	// 申请通知权限
	Notification.requestPermission();
	
	// 显示公告
	jmpto['/manual']();

	// 打开时间显示
	jmpto['/enabletime']();
} while(0);

});
