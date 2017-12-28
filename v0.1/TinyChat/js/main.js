$(function () {	
	var socket = io();
	var colors = [
		'#e21400', '#91580f', '#f8a700', '#f78b00',
		'#58dc00', '#287b00', '#a8f07a', '#4ae8c4',
		'#3b88eb', '#3824aa', '#a700ff', '#d300e7',
	];
	var $window = $(window);
	var $message = $('.message');
	var $inputbox = $('.inputbox');
	var $file = $('.file');
	var joined = false;
	var jmpto = {};
	var username, roomname;
	var disabled = true;
	var fr = new FileReader();

	var addmsg = function (username, msg, time) {
		$('<div></div>').addClass('msg')
		.append($('<span></span>').addClass('username').text(username).css('color', colors[parseInt($.md5(username), 16) % colors.length]))
		.append($('<span></span>').addClass('time').text(time).css('display', disabled ? 'none' : ''))
		.append($('<span></span>').addClass('say').text(msg))
		.hide().fadeIn('normal', function () {
			$message[0].scrollTop = $message[0].scrollHeight;
		}).appendTo($message);
	};

	var addsys = function (msg, time) {
		$('<div></div>')
		.append($('<span></span>').addClass('time').text(time).css('display', disabled ? 'none' : ''))
		.addClass('sys').append($('<span></span>').text(msg)).hide().fadeIn('normal', function () {
			$message[0].scrollTop = $message[0].scrollHeight;
		}).appendTo($message);
	};

	var addimg = function (username, msg, time) {
		$('<div></div>')
		.append($('<span></span>').addClass('username').text(username).css('color', colors[parseInt($.md5(username), 16) % colors.length]))
		.append($('<span></span>').addClass('time').text(time).css('display', disabled ? 'none' : ''))
		.append($('<img></img>').addClass('img').attr('src', msg))
		.hide().fadeIn('normal', function () {
			$message[0].scrollTop = $message[0].scrollHeight;
		}).appendTo($message);
	};

	jmpto['/clearsys'] = function () {
		$('.message>*').filter('.sys').fadeOut('normal', function () {
			$(this).remove();
		});
	};

	jmpto['/clear'] = function () {
		$('.message>*').fadeOut('normal', function () {
			$(this).remove();
		});
	};

	jmpto['/exit'] = function () {
		socket.emit('leave');
	};

	jmpto['/whoami'] = function () {
		if(joined) {
			addsys(`i am: ${username}`);
		} else {
			addsys('please login first');
		}
	};

	jmpto['/whereami'] = function () {
		if(joined) {
			addsys(`i am in: ${roomname}`);
		} else {
			addsys('please login first');
		}
	};

	jmpto['/disabletime'] = function () {
		$('.time').fadeOut();
		disabled = true;
	};

	jmpto['/enabletime'] = function () {
		$('.time').fadeIn();
		disabled = false;
	};

	jmpto['/exec'] = function () {
		addsys(`exec return: ${eval(prompt('execute what?'))}`);
	};

	jmpto['/help'] = function () {
		addsys('to clear system messages, usage /clearsys');
		addsys('to clear all messages, usage /clear');
		addsys('to exit, usage /exit');
		addsys('to find out who am i, usage /whoami');
		addsys('to find out where am i, usage /whereami');
		addsys('to disable the time display, usage /disabletime');
		addsys('to enable the time display, usage /enabletime');
		addsys('to execute a javascript command, usage /exec');
	};

	fr.onload = function (data) {
		socket.emit('newimg', {
			username: username,
			msg: data.target.result,
		});
		$file.val('');
	};

	$file.change(function () {
		if(this.files.length === 0) {
			addsys('please choose atleast one image');
			return;
		}
		fr.readAsDataURL(this.files[0]);
	});

	jmpto['/img'] = function () {
		$file.click();
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

	socket.on('successlogin', function (data) {
		$inputbox.attr('placeholder', 'Type here...');
		joined = true;
	});
	socket.on('successlogout', function (data) {
		$inputbox.attr('placeholder', 'usage: /{username}/{password}/{roomname}/{roompassword} to login');
		joined = false;
	});
	socket.on('userjoined', function (data) {
		addsys(`${data.username} joined`, data.time);
	});
	socket.on('sysmsg', function (data) {
		addsys(data.msg, data.time);
	});
	socket.on('userleft', function (data) {
		addsys(`${data.username} left`, data.time);
	});
	socket.on('newmsgsent', function (data) {
		addmsg(data.username, data.msg, data.time);
	});
	socket.on('newimgsent', function (data) {
		addimg(data.username, data.msg, data.time);
	});
	socket.on('disconnect', function (data) {
		$('body').empty();
		socket = null;
	});
});