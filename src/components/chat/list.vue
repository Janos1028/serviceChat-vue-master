<template>
  <div id="list">
    <div v-if="filterKey">
      <p class="section-title">搜索结果</p>
    </div>

    <div v-else class="list-header">
      <template v-if="!isBatchMode">
        <p class="section-title">会话列表</p>
        <el-tooltip content="批量管理" placement="right"
                    v-if="users.length > 0 && currentUser && currentUser.userTypeId === 1">
          <i class="el-icon-s-operation manage-btn" @click="enterBatchMode"></i>
        </el-tooltip>
      </template>

      <template v-else>
        <div class="batch-toolbar">
          <el-checkbox
              :indeterminate="isIndeterminate"
              v-model="checkAll"
              @change="handleCheckAllChange"
              class="check-all-box"
          >全选
          </el-checkbox>

          <div class="batch-btns">
            <el-button
                type="text"
                size="mini"
                class="danger-text"
                :disabled="selectedUsers.length === 0"
                @click="confirmBatchDelete"
            >
              删除({{ selectedUsers.length }})
            </el-button>
            <el-button type="text" size="mini" @click="exitBatchMode">完成</el-button>
          </div>
        </div>
      </template>
    </div>

    <ul v-if="sortedUserList && sortedUserList.length" class="user-ul">
      <li
          v-for="item in sortedUserList"
          :class="{ active: currentSession && item.username === currentSession.username }"
          @click="changeCurrentSession(item)"
          :key="item.id"
      >
        <div v-if="isBatchMode" class="checkbox-wrapper" @click.stop>
          <el-checkbox
              :label="item.username"
              v-model="selectedUsers"
              class="simple-checkbox"
          ></el-checkbox>
        </div>

        <div class="avatar-wrapper">
          <img class="avatar" :src="item.userProfile" :alt="item.nickname">
          <span class="status-dot" :class="item.userStateId === 1 ? 'online' : 'offline'"></span>
        </div>

        <div class="text-wrapper">
          <p class="name">
            {{ item.nickname }}
            <span v-if="item.userTypeId === 1" class="support-chat-title-label">支撑人员</span>
          </p>
          <span
              class="status-text"
              :class="{ 'online-text': item.userStateId === 1 }"
          >
            {{ item.userStateId === 1 ? '[在线]' : '[离线]' }}
          </span>
        </div>

        <div class="badge-wrapper"
             v-if="!isBatchMode && currentUser && isDot[currentUser.username + '#' + item.username]">
          <span class="new-msg-badge"></span>
        </div>
      </li>
    </ul>

    <div v-else class="empty-list">
      暂无活跃会话
    </div>
  </div>
</template>

<script>
import {mapState} from 'vuex'
import {MessageBox} from 'element-ui';

export default {
  name: 'list',
  data() {
    return {
      isBatchMode: false,
      checkAll: false,
      selectedUsers: [],
    }
  },
  computed: {
    ...mapState([
      'users',
      'currentSession',
      'isDot',
      'currentUser',
      'filterKey'
    ]),
    sortedUserList() {
      if (!this.users) return [];
      let list = [...this.users];

      // 搜索过滤
      if (this.filterKey) {
        list = list.filter(user =>
            (user.nickname && user.nickname.includes(this.filterKey)) ||
            (user.username && user.username.includes(this.filterKey))
        );
      }

      // 排序
      list.sort((a, b) => {
        const timeA = a.lastMessageTime ? new Date(a.lastMessageTime).getTime() : 0;
        const timeB = b.lastMessageTime ? new Date(b.lastMessageTime).getTime() : 0;
        return timeB - timeA;
      });
      return list;
    },
    isIndeterminate() {
      return this.selectedUsers.length > 0 && this.selectedUsers.length < this.sortedUserList.length;
    }
  },
  watch: {
    selectedUsers(val) {
      this.checkAll = val.length === this.sortedUserList.length && this.sortedUserList.length > 0;
    }
  },
  methods: {
    changeCurrentSession(currentSession) {
      // 批量模式：点击行 = 选中/取消
      if (this.isBatchMode) {
        const index = this.selectedUsers.indexOf(currentSession.username);
        if (index > -1) {
          this.selectedUsers.splice(index, 1);
        } else {
          this.selectedUsers.push(currentSession.username);
        }
        return;
      }
      // 正常模式：切换聊天
      this.$store.commit('changeCurrentSession', currentSession);
    },

    enterBatchMode() {
      this.isBatchMode = true;
      this.selectedUsers = [];
      this.checkAll = false;
    },

    exitBatchMode() {
      this.isBatchMode = false;
      this.selectedUsers = [];
    },

    handleCheckAllChange(val) {
      this.selectedUsers = val ? this.sortedUserList.map(u => u.username) : [];
    },

    confirmBatchDelete() {
      if (this.selectedUsers.length === 0) return;

      MessageBox.confirm(
          `确定要移除这 ${this.selectedUsers.length} 个会话吗？\n(这不会删除历史记录，新消息到来时会自动恢复)`,
          '批量移除',
          {
            confirmButtonText: '确定移除',
            cancelButtonText: '取消',
            type: 'warning',
            center: true
          }
      ).then(() => {
        this.$store.commit('BATCH_DELETE_SESSIONS', this.selectedUsers);
        this.$message.success('已移除');
        this.exitBatchMode();
      }).catch(() => {
      });
    }
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

.manage-btn {
  font-size: 16px;
  color: #909399;
  cursor: pointer;
  padding: 5px;
  transition: color 0.3s;
}

.manage-btn:hover {
  color: #409EFF;
}

/* 批量工具栏 */
.batch-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  padding-left: 5px;
}

.danger-text {
  color: #F56C6C;
}

.danger-text:hover {
  color: #f78989;
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

.support-chat-title-label {
  font-size: 10px;
  color: #909399;
  background-color: #f4f4f5;
  border: 1px solid #e9e9eb;
  border-radius: 4px;
  padding: 1px 5px;
  margin-left: 6px;
  font-weight: normal;
  vertical-align: middle;
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
