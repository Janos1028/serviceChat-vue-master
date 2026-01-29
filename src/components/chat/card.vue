<template>
  <div id="card">
    <div class="user-info-box">
      <div class="avatar-container">
        <img class="avatar" :src="user.userProfile || defaultAvatar" :alt="user.nickname">
        <span class="status-dot" :class="statusClass"></span>
      </div>

      <div class="meta">
        <p class="name">{{this.user.nickName}}</p>

        <el-dropdown
            v-if="user.userTypeId === 1"
            trigger="click"
            @command="handleStatusCommand">
          <span class="role-tag status-cursor" :class="textClass">
            {{ statusText }}
            <i class="el-icon-caret-bottom" style="font-size: 12px; margin-left: 2px;"></i>
          </span>
          <el-dropdown-menu slot="dropdown">
            <el-dropdown-item :command="1">
              <span class="dot-inline status-online"></span> 在线
            </el-dropdown-item>
            <el-dropdown-item :command="3">
              <span class="dot-inline status-busy"></span> 暂时离开
            </el-dropdown-item>
          </el-dropdown-menu>
        </el-dropdown>

        <span v-else class="role-tag" :class="textClass">
          {{ statusText }}
        </span>
      </div>

      <div class="logout-btn" @click="logout" title="退出登录">
        <i class="el-icon-switch-button"></i>
      </div>
    </div>

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
import { reqUserLogout, reqChangeUserState, reqGetCard } from "@/utils/api";
import defaultAvatar from "@/assets/default.png";

export default {
  name: 'card',
  data () {
    return {
      // 1. 【修改】初始化为空对象，不再从 sessionStorage 获取
      user: {},
      defaultAvatar: defaultAvatar,
    }
  },
  computed: {
    // 2. 【修复】所有 this.userStateId 必须改成 this.user.userStateId
    statusClass() {
      if (this.user.userStateId === 1) return 'status-online';
      if (this.user.userStateId === 3) return 'status-busy';
      return 'status-offline';
    },
    textClass() {
      if (this.user.userStateId === 1) return 'text-online';
      if (this.user.userStateId === 3) return 'text-busy';
      return 'text-offline';
    },
    statusText() {
      if (this.user.userStateId === 1) return '在线';
      if (this.user.userStateId === 3) return '暂时离开';
      return '离线';
    }
  },
  mounted() {
    this.initUserCard();
  },
  methods: {
    handleStatusCommand(command) {
      // 【修复】引用路径修正
      if (this.user.userStateId === command) return;

      reqChangeUserState(command).then(resp => {
        if (resp && resp.status === 200) {
          // 更新当前视图数据
          this.user.userStateId = command;

          this.$message.success("状态更新成功");

          // 如果您希望刷新页面后还能保持这个状态，
          // 虽然初始化不读 session，但建议还是存一下，或者完全依赖后端（已实现）
        }
      });
    },
    initUserCard() {
      reqGetCard().then(resp => {
        if (resp) {
          // 3. 【确认】后端返回的数据直接赋值给 user
          // resp 结构是 User 对象，包含 userStateId, nickname, userProfile 等
          this.user = resp.obj;
          console.log("卡片数据已同步，当前状态ID:", this.user.userStateId);
        }
      })
    },
    logout() {
      reqUserLogout().then(resp => {
        if (resp) {
          window.sessionStorage.removeItem("user");
          window.sessionStorage.removeItem("state");
          window.localStorage.removeItem("user");
          if (this.$store.state.stomp) {
            this.$store.state.stomp.disconnect();
          }
          this.$router.replace("/");
        }
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
  border: 2px solid #dcdfe6;
  box-sizing: border-box;
  background-color: #fff;
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

/* 状态颜色定义 */
.status-online { background-color: #10b981; } /* 绿色 */
.status-busy { background-color: #e6a23c; }   /* 黄色 (Element Warning Color) */
.status-offline { background-color: #ef4444; } /* 红色 */

/* 下拉菜单中的小圆点 */
.dot-inline {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-right: 5px;
}

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
  max-width: 100px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.role-tag {
  font-size: 12px;
  font-weight: 500;
  display: flex;
  align-items: center;
}

/* 增加鼠标手势，提示可点击 */
.status-cursor {
  cursor: pointer;
  user-select: none;
  padding: 2px 4px;
  margin-left: -4px; /* 微调对齐 */
  border-radius: 4px;
  transition: background-color 0.2s;
}

.status-cursor:hover {
  background-color: #f3f4f6;
}

.text-online { color: #10b981; }
.text-busy { color: #e6a23c; }
.text-offline { color: #ef4444; }

/* 退出按钮样式 */
.logout-btn {
  margin-left: auto;
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
  background-color: #fee2e2;
  color: #ef4444;
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
