<template>
  <div class="chat-room-wrapper">
    <div class="room-layout">

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

        <div class="message-area">
          <message></message>
        </div>

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

export default {
  name: 'ChatRoom',
  data () {
    return {
      isSidebarOpen: window.innerWidth > 768
    }
  },
  // 【修改点 1】: 在 mounted 中注册 beforeunload 监听器
  mounted: function() {
    this.$store.dispatch('initData');
    this.$store.dispatch('connect');
    window.addEventListener('resize', this.handleResize);

    // 监听浏览器关闭/刷新事件
    window.addEventListener('beforeunload', this.handleBeforeUnload);
  },

  // 【修改点 2】: 组件销毁前主动断开连接
  beforeDestroy() {
    window.removeEventListener('resize', this.handleResize);
    window.removeEventListener('beforeunload', this.handleBeforeUnload);

    // 主动断开连接，触发后端的 SessionDisconnectEvent
    this.$store.dispatch('disconnect');
  },

  // created 中的监听可以移除了，统一在 mounted/beforeDestroy 管理
  created () {
    // 这里的逻辑已经合并到 handleBeforeUnload 中
  },

  methods: {
    toggleSidebar() {
      this.isSidebarOpen = !this.isSidebarOpen;
    },

    handleResize() {
      if (window.innerWidth <= 768) {
        this.isSidebarOpen = false;
      } else {
        this.isSidebarOpen = true;
      }
    },

    // 【修改点 3】: 处理页面关闭/刷新逻辑
    handleBeforeUnload() {
      // 1. 保存 Vuex 状态到 sessionStorage (防止刷新丢失)
      sessionStorage.setItem("state", JSON.stringify(this.$store.state));

      // 2. 主动断开 WebSocket 连接
      // 这会向后端发送断开帧，后端 WebSocketEventListener 收到后会将用户置为离线
      this.$store.dispatch('disconnect');
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
/* 样式保持不变 */
.chat-room-wrapper {
  width: 100%;
  height: 100%;
  background-color: #ffffff;
  overflow: hidden;
}

.room-layout {
  width: 100%;
  height: 100%;
  display: flex;
  overflow: hidden;
}

.sidebar-container {
  width: 280px;
  height: 100%;
  background-color: #f0f4f9;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border-right: 1px solid #e0e0e0;
  position: relative;
  z-index: 10;
}

.sidebar-closed {
  width: 0;
  opacity: 0;
  overflow: hidden;
  border-right: none;
}

.sidebar-header {
  padding: 12px 12px 0;
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.list-area {
  flex: 1;
  overflow-y: auto;
  padding: 10px;
  &::-webkit-scrollbar { width: 4px; }
  &::-webkit-scrollbar-thumb { background: #ccc; border-radius: 4px; }
}

.main-container {
  flex: 1;
  height: 100%;
  display: flex;
  flex-direction: column;
  position: relative;
  min-width: 0;
  background-color: #fff;
}

.top-header {
  height: 50px;
  flex-shrink: 0;
  position: relative;
  border-bottom: 1px solid #f0f0f0;
}

.message-area {
  flex: 1;
  width: 100%;
  overflow: hidden;
  position: relative;
}

.input-area-wrapper {
  width: 100%;
  height: 30%;
  min-height: 150px;
  flex-shrink: 0;
  border-top: 1px solid #f0f0f0;
  background: #fff;
}

.toggle-btn {
  cursor: pointer;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  color: #5f6368;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.2s;
}

.toggle-btn:hover {
  background-color: rgba(0, 0, 0, 0.05);
  color: #202124;
}

.toggle-btn i { font-size: 20px; }

.main-toggle {
  position: absolute;
  left: 15px;
  top: 50%;
  transform: translateY(-50%);
  z-index: 100;
}

@media screen and (max-width: 768px) {
  .sidebar-container {
    position: absolute;
    left: 0;
    top: 0;
    height: 100%;
    z-index: 1000;
    box-shadow: 2px 0 8px rgba(0,0,0,0.1);
  }

  .sidebar-closed {
    width: 0;
    transform: translateX(-100%);
  }
}
</style>
