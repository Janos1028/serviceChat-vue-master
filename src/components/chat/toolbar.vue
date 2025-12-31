<template>
  <div id="toolbar">
    <!-- 用户头像 -->
    <div class="img-container">
      <img class="img" :src="user.userProfile" :title="user.nickname" />
    </div>

    <!-- 中间图标组 -->
    <div class="icons-wrapper">
      <i class="el-icon-chat-dot-round icon active" title="消息"></i>
      <i class="el-icon-s-custom icon" title="联系人"></i>
      <i class="el-icon-setting icon" title="设置"></i>
    </div>

    <!-- 底部占位符 -->
    <div class="spacer"></div>

    <!-- 底部退出按钮 -->
    <i class="el-icon-switch-button icon logout" title="退出登录" @click="logout"></i>
  </div>
</template>

<script>
export default {
  name: "toolbar",
  computed: {
    user() {
      // 添加防御性检查，防止 currentUser 为 null 时报错
      return this.$store.state.currentUser || { userProfile: '', nickname: '未知用户' };
    }
  },
  methods: {
    logout() {
      this.$confirm('确定要退出登录吗?', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        // 1. 断开 WebSocket 连接
        this.$store.dispatch('disconnect');

        // 2. 清除 SessionStorage
        window.sessionStorage.removeItem("user");
        window.sessionStorage.removeItem("admin");

        window.localStorage.removeItem("user");
        window.localStorage.removeItem("admin");

        // 3. 跳转回登录页
        this.$router.replace('/');

        this.$message({
          type: 'success',
          message: '已退出登录!'
        });
      }).catch(() => {
        // 取消退出
      });
    }
  }
}
</script>

<style scoped>
#toolbar {
  width: 100%;
  height: 100%;
  background-color: #1e1e1e; /* 深色侧边栏背景 */
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px 0;
  box-sizing: border-box;
}

.img-container {
  margin-bottom: 30px;
}

.img {
  width: 40px;
  height: 40px;
  border-radius: 8px; /* 圆角矩形头像 */
  transition: transform 0.2s;
}

.img:hover {
  transform: scale(1.1);
}

.icons-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
}

.icon {
  font-size: 24px;
  color: #9ca3af;
  margin-bottom: 24px;
  cursor: pointer;
  padding: 10px;
  border-radius: 8px;
  transition: all 0.2s;
}

.icon:hover {
  color: #ffffff;
  background-color: rgba(255,255,255,0.1);
}

.icon.active {
  color: #4f46e5; /* 激活色 */
  background-color: rgba(79, 70, 229, 0.1);
}

.spacer {
  flex: 1;
}

.logout {
  color: #ef4444; /* 红色退出按钮 */
  margin-bottom: 10px;
}

.logout:hover {
  color: #f87171;
  background-color: rgba(239, 68, 68, 0.1);
}
</style>
