<template>
  <div id="usertext">

    <div class="top-right-actions" v-if="currentSession">
      <el-button
          v-if="!isPrivateChatActive && currentSession.username !== '群聊'"
          type="primary"
          key="start-btn"
          size="mini"
          round
          class="action-btn"
          :disabled="user.userTypeId == null || user.userTypeId == 1"
          :title="user.userTypeId == null || user.userTypeId == 1 ? '您无权主动开启会话' : '开启会话'"
          @click.prevent="startChat"
      >
        开启会话
      </el-button>

      <el-button
          v-else-if="isPrivateChatActive && currentSession.username !== '群聊'"
          key="end-btn"
          type="danger"
          size="mini"
          round
          class="action-btn"
          native-type="button"
          @click.prevent="endChat"
      >
        结束会话
      </el-button>
    </div>

    <div class="mask-layer" v-if="shouldDisable">
      <span class="mask-text">请点击右上角“开启会话”开始聊天</span>
    </div>

    <div class="chat-toolbar">
      <div class="tool-item" @click.stop="toggleEmoji" title="表情">
        <svg class="icon" viewBox="0 0 1024 1024" width="22" height="22"><path d="M512 85.333333C276.352 85.333333 85.333333 276.352 85.333333 512s191.018667 426.666667 426.666667 426.666667 426.666667-191.018667 426.666667-426.666667S747.648 85.333333 512 85.333333z m0 768c-188.48 0-341.333333-152.853333-341.333333-341.333333s152.853333-341.333333 341.333333-341.333333 341.333333 152.853333 341.333333 341.333333-152.853333 341.333333-341.333333 341.333333zM341.333333 426.666667a42.666667 42.666667 0 1 1 0-85.333334 42.666667 42.666667 0 0 1 0 85.333334z m341.333334 0a42.666667 42.666667 0 1 1 0-85.333334 42.666667 42.666667 0 0 1 0 85.333334z m-341.333334 170.666666h341.333334c-19.626667 85.333333-108.373333 149.333333-192 149.333334h-42.666667c-65.706667 0-160.426667-64-180.266667-149.333334z" fill="#666666"></path></svg>
      </div>
      <div class="tool-item" @click="triggerFileUpload" title="发送图片/文件">
        <i class="el-icon-paperclip" style="font-size: 20px; color: #666;"></i>
      </div>
      <input type="file" ref="fileInput" style="display: none" @change="handleFileChange">

      <div class="emoji-box" v-if="showEmoji" @click.stop>
        <div class="emoji-list">
          <span v-for="(item, index) in emojis" :key="index" class="emoji-item" @click="selectEmoji(item.char)">{{ item.char }}</span>
        </div>
      </div>
    </div>

    <textarea
        class="chat-textarea"
        placeholder="请输入内容..."
        v-model="content"
        :disabled="shouldDisable"
        @keyup.enter.exact="sendTextMessage"
        @click="showEmoji = false"
    ></textarea>

    <div class="chat-footer">
      <button
          class="send-btn"
          :class="{'btn-disabled': shouldDisable}"
          :disabled="shouldDisable"
          @click="sendTextMessage"
      >发送</button>
    </div>
  </div>
</template>

<script>
import { mapState, mapActions } from 'vuex' // 【修改】引入 mapActions
import emojisData from '../../utils/emoji.json'
import { reqOssFileUpload } from '../../utils/api'

export default {
  name: 'usertext',
  data() {
    return {
      content: '',
      showEmoji: false,
      emojis: emojisData
    }
  },
  computed: {
    ...mapState(['currentSession', 'isPrivateChatActive', 'currentUser']),

    user() {
      return this.currentUser || JSON.parse(window.sessionStorage.getItem('user')) || {};
    },

    shouldDisable() {
      if (!this.currentSession) return true;
      if (this.currentSession.username === '群聊') return false;
      return !this.isPrivateChatActive;
    }
  },
  methods: {
    // 【新增】引入开启/结束会话的 Action
    ...mapActions(['startPrivateChat', 'endPrivateChat']),

    // 【新增】开启会话逻辑
    startChat() {
      if (this.user.userTypeId == null || this.user.userTypeId == 1) {
        this.$message.warning('您无权主动开启会话');
        return;
      }
      this.startPrivateChat(this.currentSession);
    },

    // 【新增】结束会话逻辑
    endChat() {
      this.$confirm('确定要结束当前会话吗?', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        this.endPrivateChat();
      }).catch(() => {});
    },

    // --- 以下保持原有逻辑 ---
    triggerFileUpload() {
      if (this.shouldDisable) return;
      this.$refs.fileInput.click();
    },
    handleFileChange(e) {
      let file = e.target.files[0];
      if (!file) return;
      let type = 3;
      if (file.type.match(/image.*/)) {
        type = 2;
      }
      let formData = new FormData();
      formData.append('file', file);
      formData.append('module', 'chat');

      reqOssFileUpload(formData).then(resp => {
        if (resp && resp.status === 200) {
          let fileUrl = resp.obj;
          this.sendWsMessage(fileUrl, type);
        } else {
          this.$message.error(resp.msg || '文件上传失败');
        }
        this.$refs.fileInput.value = '';
      });
    },
    sendWsMessage(content, type) {
      let msgObj = {
        to: this.currentSession.username,
        content: content,
        messageTypeId: type
      };
      if (this.currentSession.username === '群聊') {
        // 群聊
      } else {
        this.$store.state.stomp.send('/app/ws/chat', {}, JSON.stringify(msgObj));
        this.$store.commit('addMessage', {
          content: content,
          createTime: new Date(),
          to: this.currentSession.username,
          notSelf: false,
          messageTypeId: type
        });
      }
    },
    sendTextMessage(e) {
      if (this.shouldDisable) return;
      if (e && e.type === 'keyup' && !e.ctrlKey && !e.metaKey) {}
      if (!this.content || this.content.trim().length === 0) return;
      this.sendWsMessage(this.content, 1);
      this.content = '';
      this.showEmoji = false;
    },
    toggleEmoji() { this.showEmoji = !this.showEmoji; },
    selectEmoji(char) { this.content += char; }
  },
  mounted() {
    document.addEventListener('click', (e) => {
      if (this.$el && !this.$el.contains(e.target)) this.showEmoji = false;
    })
  }
}
</script>

<style lang="scss" scoped>
#usertext {
  width: 100%;
  height: 100%;
  border-top: 1px solid #d6d6d6;
  background-color: #fff;
  display: flex;
  flex-direction: column;
  position: relative;

  /* 【新增】右上角按钮样式 */
  .top-right-actions {
    position: absolute;
    top: 15px;   /* 稍微留点空隙，和 toolbar 对齐 */
    right: 15px;
    z-index: 30; /* 【关键】必须比 .mask-layer (20) 大，否则遮罩层出来后按钮就点不了了 */
  }

  /* 调整遮罩层，保持原样即可 */
  .mask-layer {
    position: absolute; top: 0; left: 0; width: 100%; height: 100%;
    background-color: rgba(255, 255, 255, 0.6);
    z-index: 20; /* 这里的 z-index 比按钮小 */
    display: flex; align-items: center; justify-content: center;
    cursor: not-allowed;
  }

  .mask-text { background-color: #f56c6c; color: white; padding: 5px 10px; border-radius: 4px; font-size: 12px; }
  .btn-disabled { background-color: #e0e0e0 !important; color: #999 !important; border-color: #dcdfe6 !important; cursor: not-allowed !important; }

  .icon {
    fill: #666;
    &:hover { fill: #b1e3ff; }
  }

  .chat-toolbar { height: 40px; padding: 5px 15px; display: flex; align-items: center; position: relative; }
  .tool-item { margin-right: 15px; cursor: pointer; display: flex; align-items: center; }
  .emoji-box { position: absolute; bottom: 40px; left: 10px; width: 300px; height: 200px; background: #fff; box-shadow: 0 0 10px rgba(0,0,0,0.2); border-radius: 4px; padding: 10px; overflow-y: auto; z-index: 100; }
  .emoji-list { display: flex; flex-wrap: wrap; }
  .emoji-item { padding: 5px; cursor: pointer; font-size: 20px; &:hover { background-color: #f0f0f0; border-radius: 4px; } }

  .chat-textarea { flex: 1; width: 100%; border: none; outline: none; resize: none; padding: 0 15px; font-size: 14px; font-family: inherit; background: transparent; }
  .chat-footer { height: 40px; display: flex; justify-content: flex-end; align-items: center; padding-right: 20px; background-color: #fff; transform: translateY(-10px);}
  .send-btn { background-color: #f5f5f5; color: #606060; border: 1px solid #e5e5e5; padding: 5px 20px; cursor: pointer; border-radius: 4px; font-size: 14px; transition: all 0.2s; &:hover { background-color: #3988d3; color: white; border-color: #129611; } }
}
</style>
