# 支撑服务平台前端

## 📖 项目简介
本项目是 **支撑服务平台前端** 的前端部分。
基于 **Vue 2.x** + **Element UI** 构建，实现了用户/管理员登录、即时通讯（私聊/群聊）、消息通知、后台管理等功能。
通讯协议采用 **WebSocket** (SockJS + STOMP) 实现低延迟交互。

## 🛠️ 技术栈
- **核心框架**: Vue.js 2.6.11
- **UI 组件库**: Element UI 2.13.2
- **路由管理**: Vue Router 3.2.0
- **状态管理**: Vuex 3.4.0
- **网络请求**: Axios 0.19.2
- **实时通讯**: SockJS-client, Stompjs (集成在 store 中)
- **CSS 预处理**: Dart Sass (^1.97.1)

## ⚡ 环境准备 (Prerequisites)
由于项目依赖及构建工具版本限制，推荐使用以下环境：

* **Node.js**: 建议 **v14.17.x** (v14 LTS)
    * *注意：Node 16+ 版本可能会导致旧版 `sass-loader` 构建失败。*
* **包管理器**: npm (6.x+) 或 yarn

## 🚀 快速开始 (Quick Start)

### 1. 安装依赖
在项目根目录下运行：
```bash
npm install
# 或者使用淘宝镜像加速
npm install --registry=[https://registry.npmmirror.com](https://registry.npmmirror.com)
如果遇到**Sass**相关报错，通常是Node版本过高，需要降级**Node.js**到v14，或者卸载重装Sass依赖。

## 项目主要目录
src
├── assets          # 静态资源 (图片、Icon、提示音)
├── components      # 公共组件
│   └── chat        # 聊天专用组件 (消息气泡、列表、输入框)
├── router          # 路由配置 (登录、聊天页、后台页)
├── store           # Vuex 状态管理 (WebSocket 连接、消息接收核心逻辑)
├── utils           # 工具类
│   ├── api.js      # Axios 封装与拦截器配置
│   ├── sockjs.js   # WebSocket 客户端
│   └── stomp.js    # STOMP 协议库
├── views           # 页面级组件
│   ├── admin       # 管理员后台 (用户管理、日志查询)
│   └── chat        # 聊天室主界面
├── App.vue         # 根组件
└── main.js         # 入口文件
```

### 2.配置后端运行url

```
.env.development------为本地运行的后端url；

.env.production------为服务器运行的后端url；
```



### 3.配置本地前端运行url

```
vue.congif.js------其中的module.exports进行配置
```

## 打包部署

运行

```bash
run build:prod
```

生成的dist文件，将里面的所有文件及文件夹覆盖到服务器中的**serviceChatWeb**文件夹中。
