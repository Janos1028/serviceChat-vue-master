<template>
  <div id="usertext" :class="{ 'is-disabled': !isChatActive }">
    <div v-if="currentSession" class="input-mode">

      <div class="chat-toolbar">

        <div class="toolbar-left">
<!--          <div class="tool-btn"
               v-popover:emojiPopover
               title="插入表情">
            <svg class="icon emoji-icon" viewBox="0 0 1024 1024" width="24" height="24"><path d="M512 85.333333c235.648 0 426.666667 191.018667 426.666667 426.666667s-191.018667 426.666667-426.666667 426.666667S85.333333 747.648 85.333333 512 276.352 85.333333 512 85.333333z m0 64C311.808 149.333333 149.333333 311.808 149.333333 512s162.474667 362.666667 362.666667 362.666667 362.666667-162.474667 362.666667-362.666667S712.192 149.333333 512 149.333333z m-106.666667 234.666667a42.666667 42.666667 0 1 1 0 85.333333 42.666667 42.666667 0 0 1 0-85.333333z m213.333334 0a42.666667 42.666667 0 1 1 0 85.333333 42.666667 42.666667 0 0 1 0-85.333333z m-106.666667 213.333333c86.4 0 161.706667 52.266667 195.84 128H290.816c34.133333-75.733333 109.44-128 195.84-128z" p-id="2567"></path></svg>
          </div>-->

          <el-upload
              class="upload-wrapper"
              action="/api/user/file"
              :show-file-list="false"
              :on-success="handleImgSuccess"
              :before-upload="beforeImgUpload"
              :disabled="!isChatActive"
          >
            <div class="tool-btn" title="发送图片">
              <i class="el-icon-picture-outline icon"></i>
            </div>
          </el-upload>

          <el-upload
              class="upload-wrapper"
              action="/api/user/file"
              :show-file-list="false"
              :on-success="handleFileSuccess"
              :disabled="!isChatActive"
          >
            <div class="tool-btn" title="发送文件">
              <i class="el-icon-folder-add icon"></i>
            </div>
          </el-upload>
        </div>

        <div v-if="currentUser && currentUser.userTypeId === 1" class="action-btn-group">

          <el-button
              type="danger"
              size="mini"
              round
              plain
              @click="forceEndChat"
              :disabled="!isChatActive"
              style="margin-right: 8px;"
          >
            强制结束
          </el-button>
          <el-button
              type="primary"
              size="mini"
              round
              plain
              title="转接会话"
              @click="openTransferDialog"
              :disabled="!isChatActive"
              style="margin-right: 8px;"
          >
            转接
          </el-button>

          <el-button
              type="warning"
              size="mini"
              round
              plain
              @click="endChat"
              :disabled="!isChatActive"
          >
            结束服务
          </el-button>
        </div>

<!--
        这是emoji相关的代码，由于需要修改数据库表的配置，暂时去掉
          <el-popover
            ref="emojiPopover"
            placement="top-start"
            width="320"
            trigger="click"
            v-model="showEmoji"
            :disabled="!isChatActive"
            popper-class="emoji-popper">
          <div class="emoji-list">
            <div class="emoji-item" v-for="(item, i) in emotions" :key="i" @click="addEmotion(item.char)">
              {{ item.char }}
            </div>
          </div>
        </el-popover>-->
      </div>

      <div class="textarea-wrapper">
        <textarea
            class="chat-textarea"
            :placeholder="placeholderText"
            v-model="content"
            :disabled="!isChatActive"
            @keydown="handleKey">
        </textarea>
      </div>


      <el-dialog
          title="转接服务"
          :visible.sync="transferDialogVisible"
          :width="dialogWidth"
          :append-to-body="true"
          :close-on-click-modal="false"
          custom-class="centered-dialog">

        <div class="transfer-content">
          <div class="transfer-tip">
            <i class="el-icon-warning-outline"></i>
            <span>转接后您将退出当前会话，由新团队接手。</span>
          </div>

          <p class="label">请选择目标服务团队：</p>
          <el-select
              v-model="selectedTransferServiceId"
              placeholder="请选择服务类型"
              style="width: 100%;"
              :loading="transferLoading">
            <el-option
                v-for="item in transferServiceList"
                :key="item.id"
                :label="item.name"
                :value="item.id">
            </el-option>
          </el-select>
        </div>

        <span slot="footer" class="dialog-footer">
          <el-button @click="transferDialogVisible = false" size="small">取 消</el-button>
          <el-button type="primary" @click="confirmTransfer" :loading="transferLoading" size="small">确认转接</el-button>
        </span>
      </el-dialog>

      <div class="chat-footer">
        <span class="tip-text" v-if="isChatActive">按 Enter 发送</span>
        <el-button
            type="primary"
            size="small"
            class="send-btn"
            :disabled="!isChatActive"
            @click="addMessageByClick"
        >
          发送
        </el-button>
      </div>
    </div>

  </div>
</template>

<script>
import { mapState } from 'vuex'
import emotions from '../../utils/emoji.json'
import {
  reqClosePrivateChat,
  reqTransferChat,
  reqGetSupportServiceCategories,
  reqRequestClosePrivateChat, reqForceClosePrivateChat
} from "../../utils/api";

export default {
  name: 'usertext',
  data() {
    return {
      content: '',
      emotions: emotions,
      showEmoji: false,
      transferDialogVisible: false,
      transferLoading: false,
      transferServiceList: [],
      selectedTransferServiceId: null,
      currentUser: JSON.parse(window.sessionStorage.getItem('user') || '{}'),
      screenWidth: document.body.clientWidth
    }
  },
  computed: {
    ...mapState(['sessions', 'currentSession']),
    isChatActive() {
      return this.currentSession && this.currentSession.conversationId;
    },
    dialogWidth() {
      return this.screenWidth < 768 ? '80%' : '400px';
    },
    placeholderText() {
      if (this.isChatActive) {
        return ''; // 活跃状态下留空，因为底部有提示
      } else {
        if (this.currentUser && this.currentUser.userTypeId === 1) {
          return '当前会话未开启或已结束，无法发送消息';
        } else {
          return '请点击上方聊天页面中的【人工服务】开启会话';
        }
      }
    }
  },
  mounted() {
    window.addEventListener('resize', this.handleResize);
  },
  beforeDestroy() {
    window.removeEventListener('resize', this.handleResize);
  },
  methods: {
    handleResize() {
      this.screenWidth = document.body.clientWidth;
    },
    addMessageByClick() {
      if (!this.isChatActive) return;
      if (!this.content || this.content.match(/^[ ]*$/)) {
        this.$message({showClose: true, message: '不能发送空白信息', type: 'warning'});
        return;
      }
      this.sendMessage(this.content, 1);
    },
    handleKey(e) {
      if (!this.isChatActive) return;

      // 如果按下了 Enter 键
      if (e.keyCode === 13) {
        if (e.shiftKey) {
          // 如果同时按住了 Shift -> 允许默认行为 (换行)
          // 不做任何操作，浏览器会自动插入 \n
        } else {
          // 如果只按了 Enter -> 发送消息
          e.preventDefault(); // 阻止默认的换行行为

          if (this.content.length && !this.content.match(/^[ ]*$/)) {
            this.sendMessage(this.content, 1);
          } else {
            this.$message({showClose: true, message: '不能发送空白信息', type: 'warning'});
          }
        }
      }
    },

    sendMessage(content, type) {
      // 无论我是普通用户(发给客服ID) 还是 客服(发给用户ID)
      // currentSession.id 现在存储的都是“对方的真实ID”
      let targetId = this.currentSession.id;

      // 安全校验
      if (!targetId) {
        this.$message.error("无法确定消息接收对象，请刷新重试");
        return;
      }

      let msgObj = {
        to: targetId.toString(), // 直接发送 ID 字符串
        content: content,
        messageTypeId: type,
        conversationId: this.currentSession.conversationId,
        serviceDomainId: this.currentSession.serviceDomainId,
      }


      // 发送
      if (this.$store.state.stomp && this.$store.state.stomp.connected) {
        this.$store.state.stomp.send('/app/ws/chat', {}, JSON.stringify(msgObj));
      } else {
        this.$message.error("连接已断开，请刷新页面");
      }

      this.content = '';
      this.showEmoji = false;
    },
    addEmotion(item) {
      this.content += item;
      this.showEmoji = false;
    },
    handleImgSuccess(res, file) {
      if (res.status === 200) {
        this.sendMessage(res.obj, 2);
      } else {
        this.$message.error(res.msg);
      }
    },
    beforeImgUpload(file) {
      const isLt2M = file.size / 1024 / 1024 < 10;
      if (!isLt2M) {
        this.$message.error('上传图片大小不能超过 10MB!');
      }
      return isLt2M;
    },
    handleFileSuccess(res, file) {
      if (res.status === 200) {
        this.sendMessage(res.obj, 3);
      } else {
        this.$message.error(res.msg);
      }
    },

    openTransferDialog() {
      // 优先取 currentSession 的 domainId，没有则取当前客服的
      let domainId = this.currentSession.serviceDomainId;
      if (!domainId && this.currentUser) {
        domainId = this.currentUser.serviceDomainId;
      }

      if (!domainId) {
        this.$message.error("无法获取当前服务域信息");
        return;
      }

      this.transferLoading = true;
      this.transferServiceList = [];
      this.selectedTransferServiceId = null;
      this.transferDialogVisible = true;

      reqGetSupportServiceCategories(domainId).then(resp => {
        this.transferLoading = false;
        let list = (resp && (resp.obj || resp)) || [];
        this.transferServiceList = list;

        if (this.transferServiceList.length === 0) {
          this.$message.warning("当前域下暂无其他可转接的服务团队");
        }
      }).catch(err => {
        this.transferLoading = false;
        this.$message.error("获取服务列表失败");
      });
    },

    // 确认转接
    confirmTransfer() {
      if (!this.selectedTransferServiceId) {
        this.$message.warning("请选择要转接的服务团队");
        return;
      }

      this.transferLoading = true;
      let conversationId = this.currentSession.conversationId;
      let domainId = this.currentSession.serviceDomainId || this.currentUser.serviceDomainId;
      let params = {
        conversationId: conversationId,
        newServiceId: this.selectedTransferServiceId,
        domainId: domainId,
        isActive: 0
      }
      reqTransferChat(params).then(resp => {
        this.transferLoading = false;
        if (resp && resp.status === 200) {
          this.transferDialogVisible = false;

          // 转接成功后，清理当前会话状态
          this.$store.commit('SET_CHAT_ACTIVE', {
            conversationId: null,
            isActive: false,
            userId: this.currentSession.id
          });
        } else {
          this.$message.error(resp.msg || "转接失败");
        }
      }).catch(err => {
        this.transferLoading = false;
      });
    },

    endChat() {
      // 【修改】不再依赖 activeSessions，直接取属性
      let cid = this.currentSession.conversationId;

      if (!cid) {
        this.$message.warning("当前没有正在进行的人工会话");
        return;
      }

      this.$confirm('确定要结束本次服务吗?', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        let isActive = 3;
        let params = {
          conversationId: this.currentSession.conversationId,
          isActive: isActive
        }
        reqRequestClosePrivateChat(params);
        // 注意：后续状态清理会在 store 的 actions.endPrivateChat 里自动完成
      }).catch(() => {
      });
    },

    forceEndChat() {
        let cid = this.currentSession.conversationId;

        if (!cid) {
          this.$message.warning("当前没有正在进行的人工会话");
          return;
        }

        this.$confirm('此操作将直接关闭当前会话，不需要用户确认。是否继续?', '提示', {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        }).then(() => {
          let isActive = 4;
          let params = {
            conversationId: cid,
            isActive: isActive
          }
          reqForceClosePrivateChat(params);
        })
      }
  }
}
</script>

<style lang="scss">
/* 表情弹窗样式 */
.emoji-popper {
  padding: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important;
  border-radius: 8px !important;
  .emoji-list {
    display: flex;
    flex-wrap: wrap;
    max-height: 250px;
    overflow-y: auto;
    gap: 4px; /* 表情间距 */
  }
  .emoji-item {
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    font-size: 20px;
    border-radius: 4px;
    transition: background-color 0.2s;
    &:hover {
      background-color: #f0f2f5;
    }
  }
}
</style>
<style>
.centered-dialog {
  display: flex;
  flex-direction: column;
  margin: 0 !important;
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  max-height: 90vh;
  max-width: 100vw;
  overflow: hidden;
}

.centered-dialog .el-dialog__body {
  overflow-y: auto;
  max-height: calc(90vh - 120px);
}
</style>
<style lang="scss" scoped>
#usertext {
  width: 100%;
  height: 100%;
  /* 移除边框，改用轻微的顶部阴影分隔 */
  box-shadow: 0 -1px 0 rgba(0,0,0,0.06);
  background-color: #fff;
  display: flex;
  flex-direction: column;
  position: relative;
  transition: all 0.3s;

  /* 禁用状态外观 */
  &.is-disabled {
    background-color: #f7f8fa;
    .chat-toolbar, .chat-footer {
      background-color: #f7f8fa;
    }
    .tool-btn {
      cursor: not-allowed;
      opacity: 0.6;
      &:hover { background-color: transparent; }
    }
  }

  .input-mode {
    display: flex;
    flex-direction: column;
    height: 100%;
  }

  /* --- 工具栏优化 --- */
  .chat-toolbar {
    height: 44px;
    padding: 0 16px;
    display: flex;
    align-items: center;
    flex-shrink: 0;
    /*border-bottom: 1px solid #f0f0f0;  分割线*/
  }

  .toolbar-left {
    display: flex;
    align-items: center;
    gap: 8px; /* 图标之间的间距 */
  }

  /* 上传组件 wrapper */
  .upload-wrapper {
    display: flex;
    align-items: center;
  }

  /* 核心：美化后的图标按钮 */
  .tool-btn {
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s;
    color: #606266;

    &:hover {
      background-color: #f0f2f5; /* 悬浮时的浅灰背景 */
      color: #333;
    }

    /* 图标尺寸统一 */
    .icon {
      font-size: 20px;
    }

    /* 专门修正 SVG 图标的颜色 */
    .emoji-icon {
      fill: currentColor;
      width: 20px;
      height: 20px;
    }
  }

  /* 结束按钮 */
  .end-btn {
    margin-left: auto;
    padding: 6px 12px;
  }
  .action-btn-group {
    margin-left: auto; /* 将按钮推到最右侧 */
    display: flex;
    align-items: center;
  }
  .transfer-content {
    padding: 0 20px;
  }
  .transfer-tip {
    display: flex;
    align-items: center;
    background: #fdf6ec;
    color: #e6a23c !important;
    padding: 8px 10px;
    border-radius: 4px;
    font-size: 12px;
    margin-bottom: 15px;

    i {
      margin-right: 5px;
      font-size: 14px;
    }
  }
  .label {
    margin-bottom: 8px;
    font-size: 14px;
    color: #606266;
  }
  /* --- 文本输入区 --- */
  .textarea-wrapper {
    flex: 1;
    padding: 2px 16px 0 16px;
  }

  .chat-textarea {
    width: 100%;
    height: 100%;
    border: none;
    outline: none;
    resize: none;
    font-size: 14px;
    font-family: inherit;
    background: transparent;
    color: #333;
    line-height: 1.6;

    &::placeholder {
      color: #999;
      font-size: 13px;
    }

    &:disabled {
      cursor: not-allowed;
    }
  }

  /* --- 底部区域 --- */
  .chat-footer {
    height: 48px;
    display: flex;
    justify-content: flex-end;
    align-items: center;
    padding: 0 16px;
    /* ✅ 新增：核心修复代码！防止被中间的输入框挤没了 */
    flex-shrink: 0;

    /* ✅ 建议新增：给个背景色，确保层级正确 */
    background-color: #fff;
  }

  .tip-text {
    font-size: 12px;
    color: #999;
    margin-right: 12px;
    user-select: none;
  }

  .send-btn {
    padding: 8px 24px;
    font-size: 14px;
    border-radius: 4px; /* 稍微圆一点 */
    box-shadow: 0 2px 4px rgba(0,0,0,0.05);

    &.is-disabled {
      background-color: #e4e7ed;
      border-color: #e4e7ed;
      color: #c0c4cc;
      box-shadow: none;
    }
  }
}
</style>
