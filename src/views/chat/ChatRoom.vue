<template>
  <div class="chat-room-wrapper">
    <div class="room-layout">

      <div
          class="sidebar-mask"
          v-show="isSidebarOpen"
          @click="isSidebarOpen = false"
      ></div>

      <div class="sidebar-container" :class="{ 'sidebar-closed': !isSidebarOpen }">
        <div class="sidebar-header">
          <div class="toggle-btn" @click="toggleSidebar" title="收起侧边栏">
            <i class="el-icon-s-fold"></i>
          </div>
        </div>
        <card></card>
        <div class="list-area">
          <list></list>
        </div>
      </div>

      <div class="main-container">
        <div class="top-header">
          <div
              class="toggle-btn main-toggle"
              v-show="!isSidebarOpen"
              @click="toggleSidebar"
              title="展开侧边栏"
          >
            <i class="el-icon-s-unfold"></i>
          </div>
          <chattitle></chattitle>
        </div>

        <div class="message-area" id="chat-messages" @scroll="onScroll">

          <div v-if="isLoading" class="loading-tip">
            <i class="el-icon-loading"></i> 正在加载历史消息...
          </div>

          <message></message>
        </div>
        <transition name="el-fade-in">
          <div
              v-if="newMsgCount > 0"
              class="new-msg-tip"
              @click="goToBottom"
          >
            <i class="el-icon-arrow-down"></i>
            <span>{{ newMsgCount }} 条新消息</span>
          </div>
        </transition>

        <div class="input-area-wrapper">
          <usertext></usertext>
        </div>
      </div>

    </div>
  </div>
</template>

<script>
import card from '../../components/chat/card'
import list from '../../components/chat/list.vue'
import message from '../../components/chat/message.vue'
import usertext from '../../components/chat/usertext.vue'
import chattitle from "../../components/chat/chattitle"
import {mapState} from "vuex";

export default {
  name: 'ChatRoom',
  data () {
    return {
      isSidebarOpen: window.innerWidth > 768,
      page: 1,
      size: 20,
      isLoading: false,
      isAllLoaded: false,
      isLoadingMore: false,
      newMsgCount: 0,
      savedLastMsg: null,
    }
  },
  computed: {
    ...mapState(['sessions', 'currentUser']),
    currentSession() {
      return this.$store.state.currentSession;
    },
    // 【新增】实时获取当前会话的消息列表
    currentMsgList() {
      if (!this.currentSession || !this.$store.state.currentUser) return [];
      // 调试日志：检查 Key 是否匹配
      let key = this.$store.state.currentUser.username + "#" + this.currentSession.username;
      const msgs = this.$store.state.sessions[key] || [];
      return msgs;
    },
    msgListLength() {
      return this.currentMsgList.length;
    },
  },
  watch: {
    // 1. 切换用户时，重置状态
    currentSession: {
      handler(val, oldVal) {
        // 只有当会话真正切换（或从无到有）时才初始化
        if (val && (!oldVal || val.username !== oldVal.username)) {
          this.page = 1;
          this.isAllLoaded = false;
          this.isLoading = false;
          this.newMsgCount = 0;
          this.savedLastMsg = null;
          this.savedLastMsg = null;
          this.$nextTick(() => {
            this.loadMoreMessages();
          });
        }
      },
      immediate: true
    },

    // 2. 【核心修复】监听消息列表变化
    currentMsgList: {
      handler(newVal, oldVal) {
        // 只有当页码为 1 (刚进入或刷新) 且 确实有数据时，才强制滚到底部
        // 如果页码 > 1 (正在翻页查看历史)，绝对不能滚到底部
        if (!this.isLoadingMore && this.page === 1 && newVal.length > 0) {
          this.scrollToBottom();
        }
      },
      deep: false // 数组引用变化时触发
    },
    msgListLength(newLen, oldLen) {
      if (newLen === 0) return;

      const currentList = this.currentMsgList;
      const currentLastMsg = currentList[newLen - 1];

      // --- 初始化/刷新屏蔽逻辑 ---

      // 如果 savedLastMsg 为空，说明这是刚从后端拉回来的第一页历史记录
      // 此时我们只记录，不滚到底部(由 loadMoreMessages 控制)，也不弹气泡
      if (!this.savedLastMsg) {
        this.savedLastMsg = currentLastMsg;
        return;
      }
      if (this.isLoading) {
        this.savedLastMsg = currentLastMsg;
        return;
      }
      // 如果最后一条没变，说明是翻页加载历史，忽略
      if (this.savedLastMsg === currentLastMsg) {
        return;
      }

      // --- 只有走到这里，才是真正的“新消息” ---
      this.savedLastMsg = currentLastMsg;

      this.$nextTick(() => {
        const msgBox = document.getElementById('chat-messages');
        if (msgBox) {
          const offset = msgBox.scrollHeight - msgBox.scrollTop - msgBox.clientHeight;

          if (currentLastMsg.self) {
            this.scrollToBottom();
            this.newMsgCount = 0;
          } else {
            if (offset > 300) {
              this.newMsgCount++;
            } else {
              this.scrollToBottom();
              this.newMsgCount = 0;
            }
          }
        }
      });
    }
  },
  mounted() {
    window.addEventListener('resize', this.handleResize);
    window.addEventListener('beforeunload', this.handleBeforeUnload);
    if (!this.currentSession) {
      this.scrollToBottom();
    }
  },
  beforeRouteLeave(to, from, next) {
    this.$store.dispatch('disconnect');
    next();
  },
  beforeDestroy() {
    window.removeEventListener('resize', this.handleResize);
    window.removeEventListener('beforeunload', this.handleBeforeUnload);
  },
  methods: {
    toggleSidebar() {
      this.isSidebarOpen = !this.isSidebarOpen;
    },
    handleResize() {
      this.isSidebarOpen = window.innerWidth > 768;
    },
    handleBeforeUnload() {
      let stateToSave = JSON.parse(JSON.stringify(this.$store.state));
      delete stateToSave.sessions;
      delete stateToSave.stomp;
      delete stateToSave.isStompConnected;
      sessionStorage.setItem("state", JSON.stringify(stateToSave));
    },

    // 加载更多历史记录
    async loadMoreMessages() {
      // 1. 严格锁状态，防止并发进入
      if (this.isLoading || this.isAllLoaded) return;
      this.isLoading = true;

      try {
        const msgBox = document.getElementById('chat-messages');
        let scrollHeightBefore = msgBox ? msgBox.scrollHeight : 0;

        // 2. 锁定当前需要请求的页码，防止异步过程中 page 被篡改
        const requestPage = this.page;
        console.log(`[Chat] 正在请求第 ${requestPage} 页数据...`);

        const count = await this.$store.dispatch('loadPrivateHistory', {
          toUser: this.currentSession,
          page: requestPage,
          size: this.size
        });

        if (count < this.size) {
          this.isAllLoaded = true;
        }

        if (count >= 0) {
          // 3. 处理滚动逻辑
          this.$nextTick(() => {
            if (msgBox) {
              if (requestPage === 1) {
                // 初始加载滚到底部
                setTimeout(() => {
                  msgBox.scrollTop = msgBox.scrollHeight;
                }, 100);
              } else {
                // 翻页加载保持位置
                msgBox.scrollTop = msgBox.scrollHeight - scrollHeightBefore;
              }
            }
            // 4. 只有在当前页数据处理完后，才准备下一页
            this.page = requestPage + 1;
          });
        }
      } catch (e) {
        console.error(e);
      } finally {
        this.isLoading = false;
      }
    },

    onScroll(e) {
      const msgBox = e.target;
      const offset = msgBox.scrollHeight - msgBox.scrollTop - msgBox.clientHeight;
      if (offset < 50) {
        this.newMsgCount = 0;
      }

      // 原有的历史加载逻辑
      if (msgBox.scrollTop <= 30 && !this.isLoading && !this.isAllLoaded) {
        this.loadMoreMessages();
      }
    },
    goToBottom() {
      this.newMsgCount = 0;
      this.scrollToBottom();
    },
    scrollToBottom() {
      this.$nextTick(() => {
        const msgBox = document.getElementById('chat-messages');
        if (msgBox) {
          setTimeout(() => {
            msgBox.scrollTo({
              top: msgBox.scrollHeight,
              behavior: 'auto'
            });
          }, 50);
        }
      });
    }
  },

  components:{
    card,
    list,
    message,
    usertext,
    chattitle
  }
}
</script>

<style lang="scss" scoped>
.chat-room-wrapper { width: 100%; height: 100%; background-color: #ffffff; overflow: hidden; }
.room-layout { width: 100%; height: 100%; display: flex; overflow: hidden; }
.sidebar-container { width: 280px; height: 100%; background-color: #f0f4f9; display: flex; flex-direction: column; flex-shrink: 0; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); border-right: 1px solid #e0e0e0; position: relative; z-index: 10; }
.sidebar-closed { width: 0; opacity: 0; overflow: hidden; border-right: none; }
.sidebar-header { padding: 12px 12px 0; display: flex; align-items: center; flex-shrink: 0; }
.list-area { flex: 1; overflow-y: auto; padding: 10px; &::-webkit-scrollbar { width: 4px; } &::-webkit-scrollbar-thumb { background: #ccc; border-radius: 4px; } }
.main-container { flex: 1; height: 100%; display: flex; flex-direction: column; position: relative; min-width: 0; background-color: #fff; }
.top-header { height: 50px; flex-shrink: 0; position: relative; border-bottom: 1px solid #f0f0f0; }

/* 必须开启滚动 */
.message-area {
  flex: 1;
  width: 100%;
  overflow-y: auto;
  position: relative;
  background-color: #f5f7fa;
}

.loading-tip {
  text-align: center;
  font-size: 12px;
  color: #999;
  padding: 10px 0;
}
.new-msg-tip {
  position: absolute; /* 绝对定位 */
  right: 20px;
  /* 这里的 bottom 是相对于 main-container 底部的距离 */
  /* 因为 input-area-wrapper 占了 30% 高度，所以设为 32% 左右正好在输入框上方 */
  bottom: 32%;
  z-index: 999; /* 确保在消息内容之上 */
  background-color: #409EFF;
  color: #fff;
  padding: 6px 14px;
  border-radius: 20px;
  box-shadow: 0 4px 10px rgba(64, 158, 255, 0.3);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  font-weight: 500;
  /* 动画效果 */
  animation: bounceInUp 0.3s cubic-bezier(0.215, 0.61, 0.355, 1);
}

@keyframes bounceInUp {
  0% { opacity: 0; transform: translateY(20px); }
  100% { opacity: 1; transform: translateY(0); }
}
.input-area-wrapper { width: 100%; height: 30%; min-height: 150px; flex-shrink: 0; border-top: 1px solid #f0f0f0; background: #fff; }
.toggle-btn { cursor: pointer; width: 36px; height: 36px; border-radius: 50%; color: #5f6368; display: flex; align-items: center; justify-content: center; transition: background-color 0.2s; }
.toggle-btn:hover { background-color: rgba(0, 0, 0, 0.05); color: #202124; }
.toggle-btn i { font-size: 20px; }
.main-toggle { position: absolute; left: 15px; top: 50%; transform: translateY(-50%); z-index: 100; }
@media screen and (max-width: 768px) {
  .sidebar-mask { display: block; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0, 0, 0, 0.5); z-index: 900; }
  .sidebar-container { position: absolute; left: 0; top: 0; height: 100%; z-index: 1000; box-shadow: 2px 0 8px rgba(0,0,0,0.1); }
  .sidebar-closed { width: 0; transform: translateX(-100%); }
}
</style>
