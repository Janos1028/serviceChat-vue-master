import Vue from 'vue'
import VueRouter from 'vue-router'
import Login from '../views/chat/Login'
import ChatRoom from '../views/chat/ChatRoom'
import AdminLogin from '../views/admin/AdminLogin'
import Home from '../views/admin/Home'
import UserInfo from '../views/admin/UserInfo'
import GroupChatRecord from '../views/admin/GroupChatRecord'
import PrivateChatRecord from '../views/admin/PrivateChatRecord'

Vue.use(VueRouter)

// 逻辑：如果 sessionStorage 为空（如关闭浏览器后重开），但 localStorage 有值，则恢复数据
// 注意：放在这里是因为 router 在 main.js 中比 store 先引入，能保证 Store 初始化时能读到数据
if (!window.sessionStorage.getItem("user") && window.localStorage.getItem("user")) {
  window.sessionStorage.setItem("user", window.localStorage.getItem("user"));
}

const routes = [
  {
    path: '/',
    name: 'Login',
    component: Login,
    hidden: true
  },
  {
    path: '/chatroom',
    name: 'ChatRoom',
    component: ChatRoom,
    hidden: true
  },
  {
    path: '/adminlogin',
    name: 'AdminLogin',
    component: AdminLogin,
    hidden: true
  },
  {
    path: '/home',
    name: 'Home',
    component: Home,
    hidden: true
  },
  {
    path: '/home',
    name: '用户管理',
    component: Home,
    iconCls: "fa fa-user",
    children: [{
      path: '/userinfo',
      name: '用户信息管理',
      component: UserInfo,
    }]
  },
  {
    path: '/home',
    name: '聊天记录管理',
    iconCls: 'fa fa-book',
    component: Home,
    children: [
      {
        path: '/groupChatRecord',
        name: '群聊记录管理',
        component: GroupChatRecord
      },
      {
        path: '/privateChatRecord',
        name: '私聊记录管理',
        component: PrivateChatRecord
      }
    ]
  }
]

//解决重复访问路由地址报错
const originalPush = VueRouter.prototype.push;
VueRouter.prototype.push = function push(location) {
  return originalPush.call(this, location).catch(err => err)
};

const router = new VueRouter({
  routes
})

// --- 【核心修改】添加全局前置守卫 ---
// 2. 【核心修改】路由守卫：增加“已登录自动跳转”逻辑
router.beforeEach((to, from, next) => {
  // 获取用户 Token 状态
  let user = window.sessionStorage.getItem("user");
  // 简单判断 user 是否有效
  let isAuthenticated = user && user !== 'null' && user !== 'undefined';

  if (to.path === '/') {
    // --- 【修改点】如果是去登录页 ---
    if (isAuthenticated) {
      // 如果已经登录了，别让他看登录页，直接扔进聊天室
      next('/chatroom');
    } else {
      // 没登录，才允许看登录页
      next();
    }
  }
  else if (to.path === '/adminlogin') {
    // 管理员登录页通常也需要类似判断，或者直接放行
    next();
  }
  else {
    // --- 去其他受保护页面 (如 /chatroom) ---
    if (isAuthenticated) {
      next(); // 有 Token，放行
    } else {
      // 没 Token，强制回登录页
      next('/?redirect=' + to.path);
    }
  }
})

export default router
