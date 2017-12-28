$(function () {

// 显示错误消息
let adderr = function (msg) {
    $('#errormessage>.content>.message').text(msg);
    $('#errormessage').modal('show');
};

// 重置sockets
let reset = function () {
    if(window.basesck && window.basesck.disconnect) {
        window.basesck.disconnect();
    }
    window.basesck = null;
    
    if(window.scks) {
        for(let i in window.scks) {
            let sck = window.scks[i];
            if(sck && sck.disconnect) {
                sck.disconnect();
            }
        }
    }
    
    $('#msgcon').empty().append($('<div class="ui top attached tabular menu" id="roomtags"></div>'));
};
    
// 输入面板相关
let seteditor = function () {
    $('.editor').bind('paste', function () {
        // 作者：gipsa liu
        // 链接：https://www.zhihu.com/question/20893119/answer/19452676
        // 来源：知乎
        // 著作权归作者所有。商业转载请联系作者获得授权，非商业转载请注明出处。
        let e = window.event;
        e.preventDefault();
        if(e.clipboardData.items) {
            let ele = e.clipboardData.items;
            for(let i = 0 ; i < ele.length ; ++ i) {
                if(ele[i].kind === 'file' && ele[i].type.indexOf('image/') !== -1) {
                    let fr = new FileReader();
                    fr.onload = function (data) {
                        $(this).append($('<img style="max-width: 100px;" />').attr('src', data.target.result));
                    }.bind(this);
                    fr.readAsDataURL(ele[i].getAsFile());
                } else if(ele[i].kind == 'string' && ele[i].type.indexOf('text/plain') !== -1) {
                    ele[i].getAsString(function (data) {
                        $(this).append($('<pre></pre>').html(data));
                    }.bind(this));
                }
            }
        } else {
            adderr('该浏览器不支持粘贴功能');
        }
        return false;
    });
};

// 读入文件base64
let filereader = function (callback) {
    let fr = new FileReader()
    let $file = $('<input type="file" style="display: none;"></input>')
                 .appendTo($("body"))
                 .change(function () {
                            if(this.files.length) {
                                fr.readAsDataURL(this.files[0])
                            }
                        });
    $file.click()
    fr.onload = function (data) {
        callback(data.target.result);
        $file.remove();
    };
};

// 显示登录表单
$('#loginbutton').click(function () {
    $('#logininput').modal('show');
});

// 登录
$('#loginsubmit').click(function () {
    let username = $('#loginusername').val();
    let password = $('#loginpassword').val();
    $('#loginusername').val('');
    $('#loginpassword').val('');
    reset();
    window.basesck = io();
    window.basesck.username = username;
    window.basesck.password = password;
    window.basesck.on('login suc', function () {
        $('#labelusername').text(username);
        $('#loginwait').css('display', 'none');
        $('#logined').css('display', '');
    });
    window.basesck.on('err', function (data) {
        adderr(data.msg);
    });
    window.basesck.on('disconnect', function () {
        $('#logoutbutton').click();
    });
    window.basesck.emit('login', {
        username: username,
        password: password,
    });
});

// 登出
$('#logoutbutton').click(function () {
    $('#labelusername').text('');
    $('#loginwait').css('display', '');
    $('#logined').css('display', 'none');
    reset();
});

// 加入房间相关
$('#joinbutton').click(function () {
    $('#joininput').modal('show');
});

// 创建消息(@return: jquery element)
let makemsg = function (username, msg, time, isleft, issys) {
    return $(`<div class="ui message ${issys ? 'red' : ''}" style="max-width: 50%; ${isleft ? '' : 'margin-right: 0; margin-left: 50%;'}">
                    <div class="ui tag label time">${time}</div>
                    <div class="ui tag label">${username}</div>
                    <div class="ui message">${msg}</div>
              </div>`);
};

// 创建房间页
let makeroompage = function (roomname, sck) {
    this.cnt = this.cnt || 0;
    ++ this.cnt;
    
    $('#roomtags')
        .append(
            $(`<button class="ui item button" data-tab="${'dt' + this.cnt}" id="rem1${this.cnt}">${roomname}<div class="floating ui red label" id="newmsgcnt${this.cnt}" style="display: none;"></div></button>`)
            .click(function () {
                $('#msgcon>* .active')
                .removeClass('active');
            }));
    
    $('#msgcon').append(
    $(`<div class="ui bottom attached tab segment" data-tab="${'dt' + this.cnt}" id="${'rem2' + this.cnt}">
        <div class="ui container">
            <div class="ui segment">
                <div class="field" id="fld${this.cnt}" style="overflow-y: auto; max-height: 70%;">
                </div>
            </div>
        </div>
        <br />
        <div class="ui container">
            <div class="ui top attached segment editor" id="edi${this.cnt}" contenteditable="true" style="overflow-y: auto; max-height: 20%;"></div>
            <div class="ui bottom attached basic buttons">
                <button class="ui button" id="imgico${this.cnt}"><i class="image icon"></i> 插入图片</button>
                <button class="ui button" id="sendico${this.cnt}"><i class="send icon"></i> 发送</button>
                <button class="ui button" id="eraseico${this.cnt}"><i class="erase icon"></i> 清空消息</button>
                <button class="ui button" id="banico${this.cnt}"><i class="ban icon"></i> 退出当前聊天室</button>
            </div>
        </div>
    </div>`));
    
    // 上传图片按钮
    $(`#imgico${this.cnt}`)
        .click(function () {
            filereader(function (data) {
                $(`#edi${this.cnt}`).append($('<img style="max-width: 100px;" />').attr('src', data));
            }.bind(this));
        }.bind(this));
    
    // 发送按钮
    $(`#sendico${this.cnt}`)
        .click(function () {
            sck.emit('message', {
                msg: $(`#edi${this.cnt}`).html(),
            });
            $(`#edi${this.cnt}`).empty();
        }.bind(this));
    
    // 清空消息按钮
    $(`#eraseico${this.cnt}`)
        .click(function () {
            $(`#fld${this.cnt}`).empty();
        }.bind(this));
    
    // 删除按钮
    $(`#banico${this.cnt}`)
        .click(function () {
            // 删除本页
            $(`#rem1${this.cnt}`).remove(); // 删除按钮
            $(`#rem2${this.cnt}`).remove(); // 删除主体
            // 删除连接
            if(sck && sck.disconnect) {
                sck.disconnect();
            }
            sck = null;
        }.bind(this));
    
    
    seteditor();                        // 设置编辑器
    $('.menu .item').tab();             // 切换选项，每添加一个标签就需要执行一次
    sck.pagecnt = this.cnt;             // 设置页面编号
    $(`#rem1${this.cnt}`).click(function () {
        $(`#newmsgcnt${this.cnt}`).text('').css('display', 'none');
        $(`#fld${this.cnt}`).scrollTop($(`#fld${this.cnt}`)[0].scrollHeight);
    }.bind(this)).click();                         // active page
};

// 加入房间
$('#joinsubmit').click(function () {
    let roomname = $('#roomname').val();
    let roompass = $('#roompass').val();
    $('#roomname').val('');
    $('#roompass').val('');
    let sck = io();
    sck.username = window.basesck.username;
    sck.password = window.basesck.password;
    sck.emit('login', {
        username: sck.username,
        password: sck.password,
    });
    sck.on('login suc', function () {
        sck.emit('join', {
            roomname: roomname,
            roompass: roompass,
        });
    });
    sck.on('err', function (data) {
        adderr(data.msg);
    });
    sck.on('disconnect', function () {
        sck = null;
    });
    sck.on('join suc', function () {
        makeroompage(roomname, sck);
    });
    sck.on('new message', function (data) {
        let username  = data.username;
        let msg = data.msg;
        let time = data.time;
        let cnt = sck.pagecnt;
        if(cnt) {
            if(!$(`#rem1${cnt}`).hasClass('active')) {
                let nsc = parseInt($(`#newmsgcnt${cnt}`).text()) || 0;
                $(`#newmsgcnt${cnt}`).text(`${nsc + 1}`).css('display', '');
            }
            $(`#fld${cnt}`)
                .append(makemsg(username, msg, time, username === sck.username ? false : true, false))
                .scrollTop($(`#fld${cnt}`)[0].scrollHeight);
        }
    });
    sck.on('sys message', function (data) {
        let msg = data.msg;
        let time = data.time;
        let cnt = sck.pagecnt;
        if(cnt) {
            if(!$(`#rem1${cnt}`).hasClass('active')) {
                let nsc = parseInt($(`#newmsgcnt${cnt}`).text()) || 0;
                $(`#newmsgcnt${cnt}`).text(`${nsc + 1}`).css('display', '');
            }
            $(`#fld${cnt}`)
                .append(makemsg('系统消息', msg, time, true, true))
                .scrollTop($(`#fld${cnt}`)[0].scrollHeight);
        }
    });
});

});