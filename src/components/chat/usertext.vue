<template>
  <div id="usertext">
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
      <input
          type="file"
          ref="fileInput"
          style="display: none"
          @change="handleFileChange"
      >

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
      <span class="send-tip">按 Ctrl + Enter 发送</span>
      <button
          class="send-btn"
          :class="{'btn-disabled': shouldDisable}"
          :disabled="shouldDisable"
          @click="sendTextMessage"
      >发送(S)</button>
    </div>
  </div>
</template>

<script>
import { mapState } from 'vuex'
import emojisData from '../../utils/emoji.json'
import { reqOssFileUpload } from '../../utils/api' // 确保导入上传接口

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
    ...mapState(['currentSession', 'isPrivateChatActive']),
    shouldDisable() {
      if (!this.currentSession) return true;
      if (this.currentSession.username === '群聊') return false;
      return !this.isPrivateChatActive;
    }
  },
  methods: {
    // 触发文件选择
    triggerFileUpload() {
      if (this.shouldDisable) return;
      this.$refs.fileInput.click();
    },

    // 处理文件选择与上传
    // 处理文件上传
    handleFileChange(e) {
      let file = e.target.files[0];
      if (!file) return;

      // 判断类型: 2=图片, 3=其他文件
      let type = 3;
      if (file.type.match(/image.*/)) {
        type = 2;
      }

      let formData = new FormData();
      formData.append('file', file);
      // 【核心修复】添加后端要求的 module 参数
      // 这里的 'chat' 是存到 OSS 上的文件夹名称，你可以随意指定
      formData.append('module', 'chat');

      // 调用后端上传接口
      reqOssFileUpload(formData).then(resp => {
        // 现在后端返回的是 RespBean，所以 resp.status === 200 判断成立
        if (resp && resp.status === 200) {
          let fileUrl = resp.obj; // 后端把 URL 放在了 obj 字段里
          this.sendWsMessage(fileUrl, type);
        } else {
          this.$message.error(resp.msg || '文件上传失败');
        }
        // 清空以便下次还能选同名文件
        this.$refs.fileInput.value = '';
      });
    },

    // 封装发送逻辑
    sendWsMessage(content, type) {
      let msgObj = {
        to: this.currentSession.username,
        content: content,
        messageTypeId: type // 1:文本, 2:图片, 3:文件
      };

      if (this.currentSession.username === '群聊') {
        // 群聊暂不处理
      } else {
        this.$store.state.stomp.send('/app/ws/chat', {}, JSON.stringify(msgObj));

        // 本地立即上屏
        this.$store.commit('addMessage', {
          content: content,
          createTime: new Date(),
          to: this.currentSession.username,
          notSelf: false,
          messageTypeId: type
        });
      }
    },

    // 原有的发送文本
    sendTextMessage(e) {
      if (this.shouldDisable) return;
      if (e && e.type === 'keyup' && !e.ctrlKey && !e.metaKey) { /*...*/ }
      if (!this.content || this.content.trim().length === 0) return;

      this.sendWsMessage(this.content, 1); // 1 代表文本
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
  /* 【核心修改】移除了 absolute 定位，改为占满父容器 */
  width: 100%;
  height: 100%;
  border-top: 1px solid #d6d6d6;
  background-color: #fff;
  display: flex;
  flex-direction: column;
  position: relative; /* 保持 relative 以便遮罩层定位 */

  .icon {
    fill: #666;
    &:hover { fill: #b1e3ff; }
  }
  .mask-layer {
    position: absolute; top: 0; left: 0; width: 100%; height: 100%;
    background-color: rgba(255, 255, 255, 0.6); z-index: 20;
    display: flex; align-items: center; justify-content: center;
    cursor: not-allowed;
  }
  .mask-text { background-color: #f56c6c; color: white; padding: 5px 10px; border-radius: 4px; font-size: 12px; }
  .btn-disabled { background-color: #e0e0e0 !important; color: #999 !important; border-color: #dcdfe6 !important; cursor: not-allowed !important; }

  .chat-toolbar { height: 40px; padding: 5px 15px; display: flex; align-items: center; position: relative; }
  .tool-item { margin-right: 15px; cursor: pointer; display: flex; align-items: center; }
  .emoji-box { position: absolute; bottom: 40px; left: 10px; width: 300px; height: 200px; background: #fff; box-shadow: 0 0 10px rgba(0,0,0,0.2); border-radius: 4px; padding: 10px; overflow-y: auto; z-index: 100; }
  .emoji-list { display: flex; flex-wrap: wrap; }
  .emoji-item { padding: 5px; cursor: pointer; font-size: 20px; &:hover { background-color: #f0f0f0; border-radius: 4px; } }

  .chat-textarea { flex: 1; width: 100%; border: none; outline: none; resize: none; padding: 0 15px; font-size: 14px; font-family: inherit; background: transparent; }
  .chat-footer { height: 40px; display: flex; justify-content: flex-end; align-items: center; padding-right: 20px; background-color: #fff; }
  .send-tip { font-size: 12px; color: #999; margin-right: 10px; }
  .send-btn { background-color: #f5f5f5; color: #606060; border: 1px solid #e5e5e5; padding: 5px 20px; cursor: pointer; border-radius: 4px; font-size: 14px; transition: all 0.2s; &:hover { background-color: #129611; color: white; border-color: #129611; } }
}
</style>
