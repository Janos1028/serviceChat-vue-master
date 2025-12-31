<template>
  <el-container class="home-container">
    <!-- 侧边栏 -->
    <el-aside width="250px" class="aside-menu">
      <!-- Logo 区域 -->
      <div class="logo-area">
        <div class="logo-wrapper">
          <i class="el-icon-s-platform logo-icon"></i>
          <span class="logo-text">支撑服务平台 Admin</span>
        </div>
      </div>

      <!-- 菜单区域 -->
      <el-menu
          router
          unique-opened
          background-color="transparent"
          text-color="#94a3b8"
          active-text-color="#ffffff"
          class="custom-menu"
          :default-active="$router.currentRoute.path"
      >
        <el-submenu :index="index+''" v-for="(item,index) in routes" v-if="!item.hidden" :key="index">
          <template slot="title">
            <i :class="item.iconCls" class="menu-icon"></i>
            <span class="menu-text">{{item.name}}</span>
          </template>
          <el-menu-item
              :index="child.path"
              v-for="(child,indexj) in item.children"
              :key="indexj"
              class="sub-menu-item"
          >
            <span slot="title">{{child.name}}</span>
          </el-menu-item>
        </el-submenu>
      </el-menu>
    </el-aside>

    <el-container class="main-wrapper">
      <!-- 顶部 Header -->
      <el-header class="home-header">
        <div class="header-left">
          <!-- 面包屑导航 -->
          <el-breadcrumb separator="/" class="breadcrumb">
            <el-breadcrumb-item :to="{ path: '/home' }"><i class="el-icon-s-home" style="margin-right: 4px;"></i>首页</el-breadcrumb-item>
            <el-breadcrumb-item v-if="$router.currentRoute.path!='/home'">{{$router.currentRoute.name}}</el-breadcrumb-item>
          </el-breadcrumb>
        </div>

        <div class="header-right">
          <!-- 顶部工具图标 -->
          <div class="header-actions">
            <div class="action-item" title="消息通知">
              <el-badge is-dot class="item-badge">
                <i class="el-icon-bell"></i>
              </el-badge>
            </div>
            <div class="action-item" title="全屏">
              <i class="el-icon-full-screen"></i>
            </div>
          </div>

          <el-divider direction="vertical" class="header-divider"></el-divider>

          <el-dropdown class="user-dropdown" @command="commandHandler">
            <div class="el-dropdown-link">
              <div class="avatar-container">
                <el-avatar
                    :size="38"
                    :src="user.userProfile"
                    class="user-avatar"
                    icon="el-icon-user-solid"
                ></el-avatar>
                <!-- 在线状态点 -->
                <span class="status-dot"></span>
              </div>

              <div class="user-info">
                <span class="username">{{user.name}}</span>
                <span class="role-badge">系统管理员</span>
              </div>
              <i class="el-icon-arrow-down dropdown-icon"></i>
            </div>

            <el-dropdown-menu slot="dropdown" class="custom-dropdown-menu">
              <el-dropdown-item command="userInfo" icon="el-icon-user">个人中心</el-dropdown-item>
              <el-dropdown-item command="setting" icon="el-icon-setting">系统设置</el-dropdown-item>
              <el-dropdown-item command="logout" divided icon="el-icon-switch-button" class="logout-item">退出登录</el-dropdown-item>
            </el-dropdown-menu>
          </el-dropdown>
        </div>
      </el-header>

      <!-- 主内容区 -->
      <el-main class="home-main">
        <transition name="fade-transform" mode="out-in">
          <!-- 添加 key 确保路由切换时组件完整重载，触发动画 -->
          <router-view class="content-box" :key="$router.currentRoute.path"/>
        </transition>
      </el-main>
    </el-container>
  </el-container>
</template>

<script>
// 引入封装的 API
import { reqAdminLogout } from "../../utils/api";
import { getRequest } from '../../utils/api';
export default {
  name: "Home",
  data(){
    return{
      // 增加默认值防止 sessionStorage 为空时报错
      user: JSON.parse(window.sessionStorage.getItem("admin")) || { name: 'Admin', userProfile: '' }
    }
  },
  computed:{
    routes(){
      return this.$router.options.routes;
    }
  },
  methods:{
    commandHandler(cmd){
      if (cmd=='logout'){
        this.$confirm('确定要退出登录吗?', '提示', {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        }).then(() => {
          // 使用封装的 API 发送请求
          reqAdminLogout().then(() => {
            // 请求成功后清除本地缓存并跳转
            sessionStorage.removeItem("admin");
            localStorage.removeItem("admin");
            this.$router.replace('/adminlogin');
          }).catch(err => {
            // 即使请求失败，通常也应该清除本地缓存强制登出
            console.error(err);
            sessionStorage.removeItem("admin");
            localStorage.removeItem("admin");
            this.$router.replace('/adminlogin');
          });
        }).catch(() => {
          this.$message({
            type: 'info',
            message: '已取消操作'
          });
        });
      } else if (cmd == 'userInfo') {
        // 如需跳转到个人中心
        // this.$router.push('/userinfo');
      }
    }
  }
}
</script>

<style lang="scss" scoped>
/* 全局容器 */
.home-container {
  height: 100vh;
  width: 100%;
  background-color: #f1f5f9; /* Slate-100 背景色，更护眼 */
  overflow: hidden;
}

/* --- 侧边栏样式 --- */
.aside-menu {
  /* 使用深邃的蓝紫色渐变背景 */
  background: linear-gradient(180deg, #1e1b4b 0%, #17153b 100%);
  box-shadow: 4px 0 15px rgba(0, 0, 0, 0.1);
  z-index: 20;
  display: flex;
  flex-direction: column;
  height: 100%;
  border-right: 1px solid rgba(255,255,255,0.05);
}

.logo-area {
  height: 80px; /* 稍微增加高度以容纳更大的 Logo 框 */
  display: flex;
  align-items: center;
  justify-content: center;
  /* 移除底部边框，让卡片悬浮感更强 */
  /* border-bottom: 1px solid rgba(255,255,255,0.08); */
}

/* 修改：将 Logo 区域做成一个漂亮的渐变卡片 */
.logo-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 80%;
  padding: 10px 0;
  /* 靛蓝到紫色的渐变 */
  background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%);
  border-radius: 12px;
  /* 增加柔和的发光阴影 */
  box-shadow: 0 4px 15px rgba(79, 70, 229, 0.4);
  transition: transform 0.3s;
}

.logo-wrapper:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(79, 70, 229, 0.5);
}

.logo-icon {
  font-size: 22px;
  color: #fff; /* 在深色卡片上使用纯白图标 */
  margin-right: 8px;
}

.logo-text {
  font-size: 16px;
  font-weight: 700;
  color: #fff;
  letter-spacing: 1px;
  text-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.custom-menu {
  border-right: none;
  margin-top: 10px;
  padding: 0 12px; /* 菜单整体内缩，为胶囊样式留空间 */
  flex: 1;
}

.menu-icon {
  margin-right: 10px;
  color: inherit;
  width: 20px;
  text-align: center;
  font-size: 16px;
}

.menu-text {
  font-weight: 500;
  font-size: 14px;
}

/* 覆盖 Element 菜单默认样式，实现胶囊悬浮效果 */
::v-deep .el-submenu__title {
  border-radius: 10px;
  margin-bottom: 4px;
  height: 50px;
  line-height: 50px;
}

::v-deep .el-submenu__title:hover {
  background-color: rgba(255, 255, 255, 0.08) !important;
  color: #fff !important;
}

/* 子菜单项样式 */
.sub-menu-item {
  height: 44px;
  line-height: 44px;
  margin-bottom: 4px;
  border-radius: 10px;
  /* 移除原有的背景色，使其融入背景 */
  background-color: transparent !important;
  padding-left: 50px !important; /* 增加缩进 */
}

.sub-menu-item:hover {
  background-color: rgba(255, 255, 255, 0.05) !important;
  color: #fff !important;
}

/* 选中态：靛蓝背景 + 阴影 + 胶囊形状 */
::v-deep .el-menu-item.is-active {
  background: linear-gradient(90deg, #4f46e5 0%, #6366f1 100%) !important;
  color: white !important;
  box-shadow: 0 4px 12px rgba(79, 70, 229, 0.4);
  font-weight: 600;
}

/* 移除之前的竖条指示器，改用整体高亮 */
::v-deep .el-menu-item.is-active::before {
  display: none;
}

/* --- 顶部 Header --- */
.home-header {
  /* 修改：背景色改为与 Logo 区域一致的渐变色 */
  background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 30px;
  box-shadow: 0 4px 16px rgba(79, 70, 229, 0.2); /* 调整阴影颜色以匹配 */
  z-index: 10;
  height: 70px !important;
  position: relative;
  color: #fff; /* 设置全局文字颜色为白 */
}

/* 面包屑 - 调整颜色适配深色背景 */
::v-deep .el-breadcrumb__inner {
  color: rgba(255, 255, 255, 0.8) !important;
}
::v-deep .el-breadcrumb__item:last-child .el-breadcrumb__inner {
  color: #fff !important;
  font-weight: 600;
}
/* 修改面包屑图标颜色 */
.breadcrumb i {
  color: rgba(255, 255, 255, 0.9);
}

/* 头部右侧操作区 */
.header-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.header-actions {
  display: flex;
  align-items: center;
  margin-right: 12px;
}

.action-item {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  cursor: pointer;
  color: rgba(255, 255, 255, 0.8); /* 调整图标颜色 */
  transition: all 0.3s;
}

.action-item:hover {
  background-color: rgba(255, 255, 255, 0.15); /* 调整悬浮背景 */
  color: #fff;
}

.action-item i {
  font-size: 20px;
}

.header-divider {
  height: 24px;
  margin: 0 16px 0 8px;
  background-color: rgba(255, 255, 255, 0.3); /* 调整分割线颜色 */
}

/* 用户下拉 */
.user-dropdown {
  cursor: pointer;
  padding: 6px 10px;
  border-radius: 12px;
  transition: background 0.3s;
  border: 1px solid transparent;
}

.user-dropdown:hover {
  background-color: rgba(255, 255, 255, 0.15); /* 调整悬浮背景 */
  border-color: rgba(255, 255, 255, 0.2);
}

.el-dropdown-link {
  display: flex;
  align-items: center;
  gap: 12px;
}

.avatar-container {
  position: relative;
}

.user-avatar {
  border: 2px solid rgba(255, 255, 255, 0.8);
  box-shadow: 0 2px 8px rgba(0,0,0,0.2);
  background: #f1f5f9;
}

.status-dot {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 10px;
  height: 10px;
  background-color: #10b981; /* 在线绿 */
  border: 2px solid #fff;
  border-radius: 50%;
}

.user-info {
  display: flex;
  flex-direction: column;
  line-height: 1.3;
  margin-right: 4px;
}

.username {
  font-weight: 700;
  font-size: 14px;
  color: #fff; /* 调整文字颜色 */
}

.role-badge {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.8); /* 调整文字颜色 */
  font-weight: 500;
}

.dropdown-icon {
  color: rgba(255, 255, 255, 0.8); /* 调整图标颜色 */
  font-size: 12px;
}

/* --- 主内容区 --- */
.home-main {
  padding: 24px;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow-x: hidden;
  height: 100%;
  /* 新增：明显的内阴影，增加边界深度感 */
  box-shadow: inset 0 3px 12px rgba(0, 0, 0, 0.12);
}

/* 页面切换动画 */
.fade-transform-leave-active,
.fade-transform-enter-active {
  transition: all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1);
}

.fade-transform-enter {
  opacity: 0;
  transform: translateY(20px);
}

.fade-transform-leave-to {
  opacity: 0;
  transform: translateY(-20px);
}

/* 覆盖 Element 下拉菜单样式 */
.logout-item {
  color: #ef4444;
  font-weight: 500;
}
.logout-item:hover {
  background-color: #fef2f2 !important;
  color: #dc2626 !important;
}
</style>
