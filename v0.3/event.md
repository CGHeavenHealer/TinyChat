## 事件

### v0.3

#### 服务端

##### 可能会收到的

```
join - 有新用户申请加入房间
newmsg - 有新消息
newimg - 有新图片
getinfo - 有新的取得信息请求
leavemsg - 有新的留言
leaveimg - 有新的留图
clearleave - 有清空留言请求
showleave - 有查询留言请求
leave - 有用户离开房间
disconnect - 有用户掉线（同离开房间）
```

##### 可能会发出的

```
successlogin － 某用户成功登录
successlogout - 某用户成功登出
joinedfailed - 某用户登录失败
sysmsg - 发出新系统消息
newmsgsent - 发出新消息
newimgsent - 发出新图片
disconnect - 客户端无法连接
```

#### 客户端

##### 可能会收到的

```
successlogin － 成功登录
successlogout - 成功登出
joinedfailed - 登录失败
sysmsg - 新系统消息
newmsgsent - 新消息
newimgsent - 新图片
disconnect - 无法连接
```

##### 可能会发出的

```
join - 申请加入房间
newmsg - 发送新消息
newimg - 发送新图片
getinfo - 发送取得信息请求
leavemsg - 发送新的留言
leaveimg - 发送新的留图
clearleave - 发送清空留言请求
showleave - 发送查询留言请求
leave - 发送离开房间消息
```