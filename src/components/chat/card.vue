<template>
  <div id="card">
    <!-- 用户信息区 -->
    <div class="user-info-box">
      <div class="avatar-container">
        <img class="avatar" :src="user.userProfile" :alt="user.nickname">
        <!-- 状态圆点 -->
        <span class="status-dot" :class="isOnline ? 'status-online' : 'status-offline'"></span>
      </div>

      <div class="meta">
        <p class="name">{{user.nickname}}</p>
        <span class="role-tag" :class="isOnline ? 'text-online' : 'text-offline'">
           {{ isOnline ? '在线' : '离线' }}
         </span>
      </div>

      <!-- 新增：退出登录按钮 (靠右显示) -->
      <div class="logout-btn" @click="logout" title="退出登录">
        <i class="el-icon-switch-button"></i>
      </div>
    </div>

    <!-- 搜索框 -->
    <div class="search-bar">
      <i class="el-icon-search"></i>
      <input
          type="text"
          placeholder="搜索联系人..."
          v-model="$store.state.filterKey"
      >
    </div>
  </div>
</template>

<script>
export default {
  name: 'card',
  data () {
    return {
      user: JSON.parse(window.sessionStorage.getItem('user')),
      isOnline: true
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

        // 2. 清除 SessionStorage 中的用户信息
        window.sessionStorage.removeItem("user");
        window.localStorage.removeItem('user');

        // 3. 跳转回登录页面
        this.$router.replace('/');

        // 提示消息
        this.$message.success('已安全退出');
      }).catch(() => {
        // 取消操作，不做任何事
      });
    }
  }
}
</script>

<style scoped>
#card {
  padding: 20px 15px;
  background-color: transparent;
}

/* 用户信息卡片外框 */
.user-info-box {
  display: flex;
  align-items: center;
  margin-bottom: 20px;
  background-color: #ffffff;
  padding: 12px;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
  box-shadow: 0 1px 2px rgba(0,0,0,0.05);
  transition: all 0.3s ease;
}

.user-info-box:hover {
  box-shadow: 0 4px 6px rgba(0,0,0,0.08);
  border-color: #d1d5db;
}

.avatar-container {
  position: relative;
  width: 44px;
  height: 44px;
  margin-right: 12px;
}

.avatar {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid #dcdfe6; /* 边框加粗到2px，颜色加深 */
  box-sizing: border-box; /* 确保边框算在宽高内 */
  background-color: #fff; /* 防止透明头像背景透色 */
}

.status-dot {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 2px solid #ffffff;
}

.status-online { background-color: #10b981; }
.status-offline { background-color: #ef4444; }

.meta {
  display: flex;
  flex-direction: column;
}

.name {
  font-size: 15px;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
  margin-bottom: 2px;
  /* 限制名字长度，防止挤压按钮 */
  max-width: 100px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.role-tag {
  font-size: 12px;
  font-weight: 500;
}

.text-online { color: #10b981; }
.text-offline { color: #ef4444; }

/* 退出按钮样式 */
.logout-btn {
  margin-left: auto; /* 自动靠右 */
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  cursor: pointer;
  color: #9ca3af;
  transition: all 0.2s;
}

.logout-btn:hover {
  background-color: #fee2e2; /* 浅红背景 */
  color: #ef4444; /* 红色图标 */
}

.logout-btn i {
  font-size: 18px;
}

/* 搜索框 */
.search-bar {
  display: flex;
  align-items: center;
  background-color: #ffffff;
  border-radius: 8px;
  padding: 8px 12px;
  border: 1px solid transparent;
  box-shadow: 0 1px 2px rgba(0,0,0,0.05);
  transition: all 0.3s;
}

.search-bar:focus-within {
  border-color: #4f46e5;
  box-shadow: 0 0 0 2px rgba(79, 70, 229, 0.1);
}

.search-bar i {
  color: #9ca3af;
  font-size: 14px;
  margin-right: 8px;
}

.search-bar input {
  border: none;
  background: transparent;
  outline: none;
  font-size: 14px;
  color: #374151;
  width: 100%;
}
</style>
