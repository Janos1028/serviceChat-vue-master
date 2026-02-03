<template>
  <div id="list">
    <div v-if="filterKey">
      <p class="section-title">搜索结果</p>
    </div>

    <div v-else class="list-header">
        <p class="section-title">会话列表</p>
    </div>


    <ul v-if="sortedUserList && sortedUserList.length" class="user-ul">
      <li
          v-for="item in sortedUserList"
          :key="item.id"
          class="user-item"
          :class="{ active: currentSession && currentSession.username === item.username }"
          @click="changeCurrentSession(item)"
      >

        <div class="avatar-wrapper" :class="{ 'offline': currentUser.userTypeId === 1 && item.userStateId === 0 }">
          <img class="avatar" :src="item.userProfile || defaultAvatar" :alt="item.nickname">
          <span v-if="currentUser.userTypeId === 1" class="status-dot" :class="{ 'online': item.userStateId === 1 }"></span>
        </div>

        <div class="text-wrapper">
          <p class="name">{{ item.nickname }}</p>

          <p v-if="currentUser.userTypeId === 1" class="status-text" :class="{ 'online-text': item.userStateId === 1 }">
            {{  item.userStateId === 1 ? '在线' : '离线' }}
          </p>
        </div>

        <div class="badge-wrapper">
          <span class="new-msg-badge" v-if="isDot[currentUser.username + '#' + item.username]"></span>
        </div>
      </li>
    </ul>

    <div v-else class="empty-list">
      暂无会话
    </div>
  </div>
</template>

<script>
import {mapState} from 'vuex'
import defaultAvatar from '@/assets/default.png'
export default {
  name: 'list',
  data() {
    return {
      defaultAvatar: defaultAvatar,
      currentUser: JSON.parse(window.sessionStorage.getItem('user') || '{}')
    }
  },
  computed: {
    ...mapState(['sessions', 'users', 'currentSession', 'isDot', 'filterKey']),

    sortedUserList() {
      // 1. 搜索过滤
      let list = this.users;
      if (this.filterKey) {
        list = list.filter(user => user.nickname.includes(this.filterKey));
      }

      // 2. 排序
      return list.slice().sort((a, b) => {
        // 如果是普通用户，优先展示服务域 (isReceptionist 为 true)
        if (this.currentUser.userTypeId !== 1) {
          if (a.isReceptionist && !b.isReceptionist) return -1;
          if (!a.isReceptionist && b.isReceptionist) return 1;
        }

        // 规则B: 按最后一条消息时间降序
        let keyA = this.currentUser.username + '#' + a.username;
        let keyB = this.currentUser.username + '#' + b.username;
        let msgsA = this.sessions[keyA];
        let msgsB = this.sessions[keyB];

        let timeA = (msgsA && msgsA.length > 0) ? new Date(msgsA[msgsA.length - 1].date).getTime() : 0;
        let timeB = (msgsB && msgsB.length > 0) ? new Date(msgsB[msgsB.length - 1].date).getTime() : 0;

        if (timeA === 0 && a.lastMessageTime) {
          timeA = new Date(a.lastMessageTime).getTime();
        }
        if (timeB === 0 && b.lastMessageTime) {
          timeB = new Date(b.lastMessageTime).getTime();
        }

        if (timeA > 0 || timeB > 0) {
          return timeB - timeA; // 降序排列：时间大的在前
        }

        // 规则C: 在线的排在前面
        return b.userStateId - a.userStateId;
      });
    },

  },
  methods: {
    changeCurrentSession(currentSession) {
      if (this.isBatchMode) {
        currentSession.checked = !currentSession.checked;
        this.handleItemCheckChange();
        return;
      }
      this.$store.commit('changeCurrentSession', currentSession);
    },

    handleItemCheckChange() { let checkedCount = this.users.filter(u => u.checked).length; this.checkAll = checkedCount === this.users.length && this.users.length > 0; this.isIndeterminate = checkedCount > 0 && checkedCount < this.users.length; },

  }
}
</script>

<style scoped>
/* 1. 容器布局调整 */
#list {
  padding: 10px;
  box-sizing: border-box;
  display: flex; /* 弹性布局 */
  flex-direction: column; /* 垂直排列 */
  height: 100%; /* 占满高度 */
  overflow: hidden; /* 禁止整体滚动 */
}

/* 2. 头部样式 */
.list-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 40px;
  margin-bottom: 5px;
}

.section-title {
  font-size: 12px;
  color: #6b7280;
  margin: 0 0 0 5px;
  font-weight: 600;
}



/* 3. 列表滚动区域 */
.user-ul {
  padding: 0;
  margin: 0;
  flex: 1; /* 占据剩余空间 */
  overflow-y: auto; /* 内部滚动 */
}

/* 4. 列表项样式 (保持您原有的卡片设计) */
li {
  display: flex;
  align-items: center;
  padding: 12px 15px;
  margin-bottom: 12px;
  cursor: pointer;
  border-radius: 12px;
  list-style: none;
  color: #374151;
  background-color: #ffffff;
  border: 1px solid #ebeef5;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
  transition: all 0.2s ease;
  position: relative;
}

li:hover {
  background-color: #f9fafb;
  border-color: #dcdfe6;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

li.active {
  background-color: #ecf5ff;
  border-color: #d2e1fb;
  color: #044eba;
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.15);
}

/* 5. 复选框样式修正 (隐藏 label 文字) */
.checkbox-wrapper {
  margin-right: 12px;
  display: flex;
  align-items: center;
}

/* 【关键】使用 ::v-deep 穿透 Element UI 样式，隐藏 checkbox 旁边的文字 */
::v-deep .simple-checkbox .el-checkbox__label {
  display: none !important;
}

/* === 原有内部样式 === */
.avatar-wrapper {
  position: relative;
  margin-right: 15px;
  display: flex;
  flex-shrink: 0;
}

.avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid #dcdfe6;
  background-color: #fff;
}

.status-dot {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 11px;
  height: 11px;
  border-radius: 50%;
  border: 2px solid #ffffff;
  box-shadow: 0 0 2px rgba(0, 0, 0, 0.1);
}

.online {
  background-color: #10b981;
}

.offline {
  background-color: #9ca3af;
}

.text-wrapper {
  display: flex;
  flex-direction: column;
  justify-content: center;
  overflow: hidden;
  flex-grow: 1;
  padding-right: 10px;
}

.name {
  font-size: 15px;
  font-weight: 600;
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.4;
}

li.active .name {
  color: #08429f;
}

.status-text {
  font-size: 11px;
  color: #9ca3af;
  margin-top: 2px;
}

.online-text {
  color: #10b981 !important;
}

.badge-wrapper {
  margin-left: auto;
  display: flex;
  align-items: center;
  justify-content: center;
}

.new-msg-badge {
  display: block;
  width: 12px;
  height: 12px;
  background-color: #f56c6c;
  border-radius: 50%;
  box-shadow: 0 2px 4px rgba(245, 108, 108, 0.4);
  border: 2px solid #fff;
  animation: pulse 2s infinite;
}

.empty-list {
  text-align: center;
  color: #9ca3af;
  font-size: 13px;
  margin-top: 20px;
}

/* 滚动条 */
.user-ul::-webkit-scrollbar {
  width: 4px;
}

.user-ul::-webkit-scrollbar-thumb {
  background: #e0e0e0;
  border-radius: 4px;
}

@keyframes pulse {
  0% {
    transform: scale(0.95);
    box-shadow: 0 0 0 0 rgba(245, 108, 108, 0.7);
  }
  70% {
    transform: scale(1);
    box-shadow: 0 0 0 6px rgba(245, 108, 108, 0);
  }
  100% {
    transform: scale(0.95);
    box-shadow: 0 0 0 0 rgba(245, 108, 108, 0);
  }
}
</style>
