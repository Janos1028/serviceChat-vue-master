<template>
  <div id="message" v-scroll-bottom="sessions">
    <div v-if="currentSession && sessions">
      <div class="chat-wrapper">
        <div v-for="(entry, index) in sessions[user.username+'#'+currentSession.username]" :key="index" class="message-row">

          <div v-if="entry.messageTypeId === 4 || entry.messageTypeId === 5" class="system-message-container">
            <div class="system-text">
              <span class="line"></span>
              <span class="content">{{ entry.messageTypeId === 4 ? '会话已开启' : '会话已结束' }}</span>
              <span class="line"></span>
            </div>
            <div class="system-time">
              {{ entry.date | fullTime }}
            </div>
          </div>

          <div v-else class="message-group" :class="{ self: entry.self }">
            <img v-if="!entry.self" class="avatar" :src="currentSession.userProfile" onerror="this.src='http://39.108.169.57/group1/M00/00/00/J2ypOV7wJkyAAv1fAAANuXp4Wt8303.jpg'">
            <div class="content-box">
              <span v-if="!entry.self" class="sender-name">{{currentSession.nickname}}</span>
              <div class="bubble">
                <p v-if="entry.messageTypeId === 1 || !entry.messageTypeId" class="text">{{ entry.content }}</p>
                <el-image
                    v-else-if="entry.messageTypeId === 2"
                    class="chat-img"
                    :src="entry.content"
                    :preview-src-list="[entry.content]"
                >
                </el-image>
                <div v-else-if="entry.messageTypeId === 3" class="file-card">
                  <div class="file-info">
                    <i class="el-icon-document file-icon"></i>
                    <span class="file-text">收到一个文件</span>
                  </div>
                  <a :href="entry.content" target="_blank" class="download-link">点击下载 / 预览</a>
                </div>
              </div>
              <span class="time-tip">{{ entry.date | time }}</span>
            </div>
            <img v-if="entry.self" class="avatar self-avatar" :src="user.userProfile" onerror="this.src='http://39.108.169.57/group1/M00/00/00/J2ypOV7wJkyAAv1fAAANuXp4Wt8303.jpg'">
          </div>

        </div>
      </div>
    </div>

    <div v-else class="empty-state">
      <div class="logo-box"><i class="el-icon-chat-dot-round"></i></div>
      <h2>你好, {{user.nickname}}</h2>
      <p>选择左侧的好友开始聊天</p>
    </div>
  </div>
</template>

<script>
import {mapState} from 'vuex'

export default {
  name: 'message',
  data() {
    return {
      user: JSON.parse(window.sessionStorage.getItem('user'))
    }
  },
  computed: mapState([
    'sessions',
    'currentSession'
  ]),
  filters: {
    time(date) {
      if (date) {
        if(typeof date === 'string') date = new Date(date);
        let hours = date.getHours();
        let minutes = date.getMinutes();
        return `${hours < 10 ? '0' + hours : hours}:${minutes < 10 ? '0' + minutes : minutes}`;
      }
      return '';
    },
    fullTime(date) {
      if (!date) return '';
      if(typeof date === 'string') date = new Date(date);
      let y = date.getFullYear();
      let m = date.getMonth() + 1;
      let d = date.getDate();
      let hh = date.getHours();
      let mm = date.getMinutes();
      let ss = date.getSeconds();
      return `${y}年${m<10?'0'+m:m}月${d<10?'0'+d:d}日 ${hh<10?'0'+hh:hh}:${mm<10?'0'+mm:mm}:${ss<10?'0'+ss:ss}`;
    }
  },
  directives: {
    'scroll-bottom': {
      inserted: function (el) {
        setTimeout(() => { el.scrollTop = el.scrollHeight; }, 100);
      },
      componentUpdated: function (el) {
        setTimeout(() => { el.scrollTop = el.scrollHeight; }, 100);
      }
    }
  }
}
</script>

<style scoped>
#message {
  /* 【核心修改1】间距调整 */
  padding: 10px 0 10px 0; /* 顶部减少到10px，底部增加到50px(留出空隙) */
  height: 100%;
  overflow-y: auto;
  background-color: #f5f7fa;
  box-sizing: border-box; /* 确保 padding 不会撑破高度 */
}

#message::-webkit-scrollbar { width: 6px; }
#message::-webkit-scrollbar-thumb { background-color: rgba(144, 147, 153, 0.3); border-radius: 10px; }

.chat-wrapper { padding: 0 20px; }
.message-row { margin-bottom: 20px; }

/* 系统消息 */
.system-message-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  /* 【核心修改2】减少系统消息上下的 margin，让顶部更紧凑 */
  margin: 10px 0;
  width: 100%;
}

.system-text {
  font-size: 13px;
  color: #909399;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 15px;
  width: 100%;
  max-width: 85%;
}

.line {
  flex: 1;
  height: 1px;
  background-color: #e0e0e0;
  min-width: 10px;
}

.content { white-space: nowrap; }

.system-time {
  font-size: 12px;
  color: #c0c4cc;
  margin-top: 6px;
}

/* 消息气泡部分保持不变 */
.message-group { display: flex; align-items: flex-start; gap: 10px; }
.message-group.self { justify-content: flex-end; }
.avatar { width: 38px; height: 38px; border-radius: 6px; object-fit: cover; flex-shrink: 0; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
.content-box { display: flex; flex-direction: column; max-width: 70%; }
.sender-name { font-size: 12px; color: #909399; margin-bottom: 4px; margin-left: 2px; }
.bubble { padding: 10px 14px; border-radius: 6px; font-size: 15px; line-height: 1.5; position: relative; word-break: break-all; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
.text { margin: 0; }
.time-tip { font-size: 11px; color: #c0c4cc; margin-top: 4px; }
.message-group:not(.self) .bubble { background-color: #ffffff; color: #303133; border: 1px solid #e4e7ed; }
.message-group:not(.self) .bubble::before { content: ''; position: absolute; left: -6px; top: 14px; width: 0; height: 0; border-top: 6px solid transparent; border-bottom: 6px solid transparent; border-right: 6px solid #ffffff; }
.message-group.self .bubble { background-color: #b1e3ff; color: #303133; }
.message-group.self .time-tip { text-align: right; margin-right: 2px; }
.message-group.self .content-box { align-items: flex-end; }
.message-group.self .bubble::after { content: ''; position: absolute; right: -6px; top: 14px; width: 0; height: 0; border-top: 6px solid transparent; border-bottom: 6px solid transparent; border-left: 6px solid #b1e3ff; }
.chat-img { max-width: 200px; max-height: 200px; border-radius: 4px; cursor: pointer; display: block; }
.file-card { display: flex; flex-direction: column; align-items: flex-start; min-width: 150px; }
.file-info { display: flex; align-items: center; margin-bottom: 8px; }
.file-icon { font-size: 32px; color: #606266; margin-right: 10px; }
.file-text { font-size: 14px; font-weight: bold; }
.download-link { font-size: 12px; color: #409EFF; text-decoration: none; border-top: 1px solid rgba(0,0,0,0.1); width: 100%; padding-top: 5px; margin-top: 5px; display: block; text-align: center; }
.message-group.self .download-link { color: #505050; border-top: 1px solid rgba(0,0,0,0.1); }
.empty-state { height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #909399; }
.logo-box i { font-size: 60px; color: #e4e7ed; margin-bottom: 10px; }
</style>
