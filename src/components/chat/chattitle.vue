<template>
  <div class="chat-title">
    <template v-if="currentSession">
      <div class="user-info-area">
        <img
            class="title-avatar"
            :src="currentSession.userProfile"
            onerror="this.src='http://39.108.169.57/group1/M00/00/00/J2ypOV7wJkyAAv1fAAANuXp4Wt8303.jpg'"
            alt=""
        >
        <div class="text-area">
          <span class="name">{{currentSession.nickname}}</span>
          <div class="status-row">
            <span class="status-dot" :class="currentSession.userStateId === 1 ? 'online' : 'offline'"></span>
            <span>{{ currentSession.userStateId === 1 ? '在线' : '离线' }}</span>
          </div>
        </div>
      </div>

      <div class="action-area">
        <el-button
            v-if="!isPrivateChatActive && currentSession.username !== '群聊'"
            key="start-btn"
            type="primary"
            size="mini"
            round
            :disabled="user.userTypeId == null||user.userTypeId == 1"
            :title="user.userTypeId == null || user.userTypeId == 1 ? '您无权主动开启会话' : '开启会话'"
            @click="startChat"
        >
          开启会话
        </el-button>

        <el-button
            v-else-if="isPrivateChatActive && currentSession.username !== '群聊'"
            key="end-btn"
            type="danger"
            size="mini"
            round
            @click="endChat"
        >
          结束会话
        </el-button>
      </div>
    </template>

    <div v-else class="title-placeholder">
      未选择会话
    </div>
  </div>
</template>

<script>
import {mapState, mapActions} from 'vuex'

export default {
  name: 'chattitle',
  computed: {
    ...mapState(['currentSession', 'isPrivateChatActive', 'currentUser']),

    user() {
      // 既然您确认逻辑是正确的，这里保持原样即可
      return this.currentUser || JSON.parse(window.sessionStorage.getItem('user')) || {};
    }
  },
  methods: {
    ...mapActions(['startPrivateChat', 'endPrivateChat']),

    startChat() {
      // 保持您原本正确的逻辑
      if (this.user.userTypeId == null||this.user.userTypeId == 1) {
        this.$message.warning('您无权主动开启会话');
        return;
      }
      this.startPrivateChat(this.currentSession).then(success => {
        if (!success) {
          this.$message.error('会话开启失败');
        }
      });
    },

    endChat() {
      this.$confirm('确定要结束当前会话吗?', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        this.endPrivateChat();
      }).catch(() => {});
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
  justify-content: center;
  position: relative;
  padding: 0 20px;
  box-sizing: border-box;
  border-bottom: 1px solid #dcdfe6;
  background-color: #fff;
}

.title-placeholder {
  font-size: 14px;
  color: #999;
}

.user-info-area { display: flex; align-items: center; gap: 10px; }

.title-avatar {
  width: 36px; height: 36px;
  border-radius: 50%;
  object-fit: cover;
  border: 1px solid #eee;
}

.text-area { display: flex; flex-direction: column; align-items: flex-start; }

.name { font-size: 16px; font-weight: 600; color: #333; }

.status-row { display: flex; align-items: center; font-size: 11px; color: #999; margin-top: 2px; }

.status-dot { width: 8px; height: 8px; border-radius: 50%; margin-right: 4px; }
.online { background-color: #10b981; }
.offline { background-color: #9ca3af; }

.action-area {
  position: absolute;
  right: 20px;
}
</style>
