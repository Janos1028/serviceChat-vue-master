<template>
  <div class="chat-title">
    <template v-if="currentSession">
      <div class="user-info-area">
        <img class="title-avatar" :src="titleAvatar">

        <div class="text-area">
          <span class="name">
            {{ currentSession.nickname }}
          </span>

          <div class="status-row" v-if="!isVirtualService">
            <span class="status-dot" :class="currentSession.userStateId === 1 ? 'online' : 'offline'"></span>

            <span :class="{ 'online-text': currentSession.userStateId === 1 }">
    {{ currentSession.userStateId === 1 ? '在线' : '离线' }}
  </span>
          </div>
        </div>
      </div>
    </template>
    <div v-else class="title-placeholder">未选择会话</div>
  </div>
</template>

<script>
import {mapState} from 'vuex'
// 引入本地默认头像
import serviceAvatar from '@/assets/客服头像.png'

export default {
  name: 'chattitle',
  data() {
    return {
      serviceAvatar: serviceAvatar
    }
  },
  computed: {
    ...mapState(['currentSession']),

    // 判断是否是虚拟服务
    isVirtualService() {
      return this.currentSession && this.currentSession.username && this.currentSession.username.startsWith('service_');
    },

    // 计算头像：如果是虚拟服务，永远只显示默认头像，不显示真实客服头像
    titleAvatar() {
      if (!this.currentSession) return '';
      if (this.isVirtualService) {
        return this.serviceAvatar;
      }
      return this.currentSession.userProfile;
    }
  }
}
</script>

<style scoped>
.chat-title {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center; /* 居中显示 */
  position: relative;
  padding: 0 20px;
  box-sizing: border-box;
  border-bottom: 1px solid #dcdfe6;
  background-color: #fff;
}

.user-info-area {
  display: flex;
  align-items: center;
  gap: 10px;
}

.title-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  object-fit: cover;
  border: 1px solid #eee;
}

.text-area {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.name {
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.status-row {
  display: flex;
  align-items: center;
  font-size: 11px;
  color: #999;
  margin-top: 2px;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-right: 4px;
}

.online { background-color: #10b981; }
.offline { background-color: #9ca3af; }
.online-text {
  color: #10b981 !important;
}
.title-placeholder {
  font-size: 14px;
  color: #999;
}
</style>
