<template>
  <div id="list">
    <div v-if="filterKey">
      <p class="section-title">搜索结果</p>
    </div>
    <div v-else>
      <p class="section-title">会话列表</p>
    </div>

    <ul v-if="sortedUserList && sortedUserList.length">
      <li
          v-for="item in sortedUserList"
          :class="{ active: currentSession && item.username === currentSession.username }"
          @click="changeCurrentSession(item)"
          :key="item.id"
      >
        <div class="avatar-wrapper">
          <img class="avatar" :src="item.userProfile" :alt="item.nickname">
          <span class="status-dot" :class="item.userStateId === 1 ? 'online' : 'offline'"></span>
        </div>

        <div class="text-wrapper">
          <p class="name">{{item.nickname}}</p>
          <span
              class="status-text"
              :class="{ 'online-text': item.userStateId === 1 }"
          >
            {{ item.userStateId === 1 ? '[在线]' : '[离线]' }}
          </span>
        </div>

        <div class="badge-wrapper" v-if="currentUser && isDot[currentUser.username + '#' + item.username]">
          <span class="new-msg-badge"></span>
        </div>
      </li>
    </ul>

    <div v-else class="empty-list">
      {{ filterKey ? '无搜索结果' : '暂无联系人' }}
    </div>
  </div>
</template>

<script>
import {mapState} from 'vuex'

export default {
  name: 'list',
  data() {
    return {
      // data 中不再需要 user，统一使用 Vuex 的 currentUser
    }
  },
  computed: {
    // 【修改点 1】引入 sessions (用于获取消息时间) 和 currentUser
    ...mapState([
      'users',
      'currentSession',
      'isDot',
      'filterKey',
      'sessions',
      'currentUser'
    ]),

    sortedUserList() {
      // 1. 搜索过滤
      let list = [];
      if (this.filterKey) {
        const key = this.filterKey.toLowerCase();
        list = this.users.filter(user => {
          const nickname = user.nickname ? user.nickname.toLowerCase() : '';
          return nickname.includes(key);
        });
      } else {
        list = [...this.users];
      }

      // 2. 【核心修改】排序逻辑：仅按最新消息时间倒序
      return list.sort((a, b) => {
        // 获取当前用户信息，用于拼接 Key
        const user = this.currentUser || JSON.parse(window.sessionStorage.getItem('user'));
        if (!user) return 0;

        const keyA = user.username + '#' + a.username;
        const keyB = user.username + '#' + b.username;

        let timeA = 0;
        let timeB = 0;

        // 获取 A 的最后一条消息时间
        if (this.sessions[keyA] && this.sessions[keyA].length > 0) {
          const lastMsg = this.sessions[keyA][this.sessions[keyA].length - 1];
          timeA = new Date(lastMsg.date).getTime();
        }

        // 获取 B 的最后一条消息时间
        if (this.sessions[keyB] && this.sessions[keyB].length > 0) {
          const lastMsg = this.sessions[keyB][this.sessions[keyB].length - 1];
          timeB = new Date(lastMsg.date).getTime();
        }

        // 仅按时间降序排列：时间越大（越新）越靠前
        // 如果都没有消息 (0 - 0)，则保持原顺序
        return timeB - timeA;
      });
    }
  },
  methods: {
    changeCurrentSession(currentSession) {
      this.$store.commit('changeCurrentSession', currentSession);
      if (currentSession.username !== '群聊') {
        this.$store.dispatch('loadPrivateHistory', currentSession);
      }
    }
  }
}
</script>

<style scoped>
#list {
  padding: 10px;
  box-sizing: border-box;
}
.section-title {
  font-size: 12px;
  color: #6b7280;
  margin: 10px 0 10px 5px;
  font-weight: 600;
}
ul { padding: 0; margin: 0; }

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
  box-sizing: border-box;
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
  box-shadow: 0 0 2px rgba(0,0,0,0.1);
}

.online { background-color: #10b981; }
.offline { background-color: #9ca3af; }

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
li.active .name { color: #08429f; }

.status-text { font-size: 11px; color: #9ca3af; margin-top: 2px; }

/* 保持之前的样式修改 */
.online-text {
  color: #10b981 !important;
}

.empty-list {
  text-align: center;
  color: #9ca3af;
  font-size: 13px;
  margin-top: 20px;
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

@keyframes pulse {
  0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(245, 108, 108, 0.7); }
  70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(245, 108, 108, 0); }
  100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(245, 108, 108, 0); }
}
</style>
