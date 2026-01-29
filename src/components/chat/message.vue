<template>
  <div id="message" @scroll="handleScroll">

    <div class="limit-tip" v-if="currentSession">
      <i class="el-icon-info"></i> 系统仅显示最近三天会话的聊天记录
    </div>

    <div v-else-if="isVirtualService && !isChatActive" class="welcome-box">
      <img class="welcome-avatar" :src="serviceAvatar">
      <div class="welcome-text">
        <p class="title">您好，{{ currentSession.nickname }} 为您服务！</p>
        <p class="sub">点击下方按钮，系统将为您分配专属客服</p>
      </div>
      <el-button type="primary" round @click="openServiceDialog(currentSession.serviceDomainId)" :loading="loading">
        开启人工会话
      </el-button>
    </div>

    <div v-if="currentSession && sessionMessages">
      <div class="chat-wrapper">
        <div
            v-for="(entry, index) in sessionMessages"
            :key="getMessageKey(entry, index)"
            class="message-row"
        >

          <div v-if="entry.messageTypeId === 4 || entry.messageTypeId === 5" class="system-message-container">
            <div class="system-text">
              <span class="line"></span>
              <span class="content">{{
                  entry.content || (entry.messageTypeId === 4 ? '会话已开启' : '会话已结束')
                }}</span>
              <span class="line"></span>
            </div>
            <div class="system-time">{{ entry.date | fullTime }}</div>
          </div>

          <div v-else-if="entry.messageTypeId === 6 && currentUser && currentUser.userTypeId !== 1"
               class="system-rating-container">
            <div class="rating-card">
              <div class="rating-header">
                <i class="el-icon-s-flag" style="color: #409EFF; margin-right: 5px;"></i>
                <span>本次服务结束于 {{ entry.date | fullTime }}</span>
              </div>

              <div v-if="entry.score" class="rating-content">
                <p class="rating-label">您的评价：</p>

                <div class="custom-star-row">
                  <i
                      v-for="n in 5"
                      :key="n"
                      class="el-icon-star-on custom-star"
                      :class="{ 'active': n <= entry.score }"
                      style="cursor: default;"
                  ></i>
                  <span class="score-text">{{ entry.score }} 分</span>
                </div>

                <div class="rating-action">
                  <el-button
                      size="mini"
                      type="info"
                      round
                      disabled>
                    已提交
                  </el-button>
                </div>
              </div>

              <div v-else class="rating-content">
                <p class="rating-label">请对本次服务进行评价：</p>

                <div class="custom-star-row">
                  <i
                      v-for="n in 5"
                      :key="n"
                      class="el-icon-star-on custom-star clickable"
                      :class="{ 'active': n <= (tempScores[entry.conversationId || entry.conversation_id] || 0) }"
                      @click="handleManualRate(n, entry.conversationId || entry.conversation_id, entry)"
                  ></i>

                  <span class="score-text">
                    {{ tempScores[entry.conversationId || entry.conversation_id] || 0 }} 分
                  </span>
                </div>

                <div class="rating-action">
                  <el-button
                      size="mini"
                      type="primary"
                      round
                      :disabled="!tempScores[entry.conversationId || entry.conversation_id]"
                      @click="submitHistoryRating(entry)">
                    提交评价
                  </el-button>
                </div>
              </div>

            </div>
          </div>

          <div v-else-if="entry.messageTypeId === 7" class="system-rating-container">
            <div class="rating-card">
              <div class="rating-header">
                <i class="el-icon-question" style="color: #E6A23C; margin-right: 5px;"></i>
                <span>服务确认</span>
              </div>

              <div class="rating-content">
                <p class="rating-label">{{ entry.content }}</p>

                <div v-if="currentUser && currentUser.userTypeId !== 1" class="rating-action" style="display: flex; justify-content: center; gap: 15px;">

                  <el-button
                      :type="entry.state === 3 || entry.state === 2 ? 'success' : 'info'"
                      size="small"
                      round
                      :disabled="entry.state === 3 || entry.state === 4"
                      @click="handleSolved(entry)">
                    已解决
                  </el-button>

                  <el-button
                      :type="entry.state === 4 || entry.state === 2 ? 'danger' : 'info'"
                      size="small"
                      round
                      :disabled="entry.state === 3 || entry.state === 4"
                      @click="handleUnsolved(entry)">
                    未解决
                  </el-button>

                </div>

                <div v-else class="rating-label" style="color: #909399; font-size: 12px; margin-top:10px;">
                  <span v-if="entry.state === 3" style="color: #67C23A;">(用户已确认解决)</span>
                  <span v-else-if="entry.state === 4" style="color: #F56C6C;">(用户反馈未解决)</span>
                  <span v-else>(等待用户确认中...)</span>
                </div>
              </div>
            </div>
          </div>

          <div v-else class="message-group" :class="{ self: entry.self }">
            <img v-if="!entry.self" class="avatar" :src="getDisplayAvatar(entry)" alt="">

            <div class="content-box">
              <span v-if="!entry.self" class="sender-name">{{ getDisplayNickname(entry) }}</span>

              <div class="bubble">
                <p v-if="!entry.messageTypeId || entry.messageTypeId === 1"
                   class="text"
                   v-html="entry.content"
                   @click="handleMessageClick($event)"></p>

                <el-image v-else-if="entry.messageTypeId === 2" class="chat-img" :src="entry.content"
                          :preview-src-list="[entry.content]"></el-image>
                <div v-else-if="entry.messageTypeId === 3" class="file-card">
                  <i class="el-icon-document file-icon"></i>
                  <div>
                    <div class="file-text">文件</div>
                    <a :href="entry.content" target="_blank" class="download-link">点击下载</a></div>
                </div>
              </div>

              <div class="msg-footer">
                <span v-if="entry.self" class="read-status"
                      :class="{ 'read': entry.state === 1 }">{{ entry.state === 1 ? '已读' : '未读' }}</span>
                <span class="time-tip">{{ entry.date | time }}</span>
              </div>
            </div>
            <img v-if="entry.self" class="avatar self-avatar" :src="currentUser.userProfile || defaultAvatar">
          </div>
        </div>
      </div>
    </div>

    <el-dialog
        title="请选择支撑服务类型"
        :visible.sync="serviceDialogVisible"
        :width="dialogWidth"
        custom-class="centered-dialog"
        :append-to-body="true"
        :close-on-click-modal="false"
    >
      <div class="service-select-container">
        <el-radio-group v-model="selectedServiceId" class="service-radio-group">
          <el-radio v-for="item in serviceList" :key="item.id" :label="item.id" border class="service-radio">
            {{ item.name }}
          </el-radio>
        </el-radio-group>
        <div v-if="serviceList.length === 0" class="no-service-tip">
          当前服务域暂无配置支撑服务
        </div>
      </div>
      <span slot="footer" class="dialog-footer">
        <el-button @click="serviceDialogVisible = false">取 消</el-button>
        <el-button type="primary" @click="confirmStartChat" :disabled="!selectedServiceId" :loading="loading">
          开启会话
        </el-button>
      </span>
    </el-dialog>

    <transition name="fade">
      <div v-if="unreadNewMsgCount > 0" class="new-msg-tip" @click="scrollToBottom">
        <i class="el-icon-arrow-down"></i>
        <span>{{ unreadNewMsgCount }}条新消息</span>
      </div>
    </transition>

  </div>
</template>

<script>
import {mapState} from 'vuex'
import serviceAvatar from '@/assets/客服头像.png'
import defaultAvatar from '@/assets/default.png'
import {
  reqGetSupportServiceCategories,
  reqSubmitScore,
  reqClosePrivateChat,
  reqConfirmUnsolved
} from "../../utils/api";

export default {
  name: 'message',
  data() {
    return {
      loading: false,
      serviceAvatar: serviceAvatar,
      serviceDialogVisible: false,
      serviceList: [],
      selectedServiceId: null,
      currentDomainId: null, // 记录当前操作的服务域ID
      screenWidth: document.body.clientWidth,
      tempScores: {},
      isUserScrollingUp: false, // 用户是否往上滚了（不在底部）
      unreadNewMsgCount: 0,      // 累积的未读新消息数
      defaultAvatar: defaultAvatar,
    }
  },
  computed: {
    ...mapState(['sessions', 'currentSession', 'currentUser']),

    dialogWidth() {
      return this.screenWidth < 768 ? '90%' : '400px';
    },

    sessionMessages() {
      if (!this.currentSession || !this.currentUser) return [];
      let key = this.currentUser.username + "#" + this.currentSession.username;
      return this.sessions[key] || [];
    },

    msgCount() {
      return this.sessionMessages ? this.sessionMessages.length : 0;
    },

    isChatActive() {
      return this.currentSession && !!this.currentSession.conversationId;
    },

    isVirtualService() {
      // 判断当前是否是虚拟服务号（以 service_ 开头）
      return this.currentSession && this.currentSession.username && this.currentSession.username.startsWith('service_');
    }
  },

  watch: {
    // 1. 切换聊天对象 -> 强制滚到底部，清空提示
    'currentSession.conversationId': {
      handler() {
        this.unreadNewMsgCount = 0;
        this.isUserScrollingUp = false;
        this.scrollToBottom();
      },
      immediate: true
    },

    // 2. 来新消息了 -> 判断要不要滚
    msgCount(newVal, oldVal) {
      // 如果是刚进页面加载出来的数据(oldVal为0)，直接滚
      if (!oldVal || oldVal === 0) {
        this.scrollToBottom();
        return;
      }

      this.$nextTick(() => {
        // 如果用户目前正“贴在”底部 -> 自动跟滚
        if (!this.isUserScrollingUp) {
          this.scrollToBottom();
        } else {
          // 如果用户在爬楼看历史 -> 不滚，显示提示气泡
          // 只有当消息真正增加时才+1 (防止其他操作触发)
          if (newVal > oldVal) {
            this.unreadNewMsgCount++;
          }
        }
      });
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
    // 用户点击：已解决
    handleSolved(entry) {
      let conversationId = entry.conversationId || entry.conversation_id;
      if (!conversationId) return;

      this.$confirm('确认问题已解决并结束本次服务吗?', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'success'
      }).then(() => {
        reqClosePrivateChat(conversationId, entry.id).then(resp => {
          if (resp && resp.status === 200) {
            this.$set(entry, 'state', 3);
          }
        });
      }).catch(() => {});
    },

    // 用户点击：未解决
    handleUnsolved(entry) {
      let conversationId = entry.conversationId || entry.conversation_id;
      if (!conversationId) return;

      reqConfirmUnsolved(conversationId, entry.id ).then(resp => {
        if (resp && resp.status === 200) {
          this.$set(entry, 'state', 4); // 更新本地视图
        }
      });
    },
    getMessageKey(entry, index) {
      // 1. 如果有数据库ID，直接用
      if (entry.id) return entry.id;

      // 2. 如果是评价卡片，使用 "rating_会话ID" 确保唯一且稳定
      if (entry.messageTypeId === 6 && entry.conversationId) {
        return 'rating_card_' + entry.conversationId;
      }

      // 3. 其他系统消息兜底 (组合键：会话ID_类型_索引)
      let uniqueSuffix = (entry.conversationId || 'sys') + '_' + (entry.messageTypeId || 0) + '_' + index;
      return 'sys_' + uniqueSuffix;
    },
    handleManualRate(score, conversationId, entry) {
      // 尝试多种方式获取 ID
      let finalId = conversationId || (entry ? (entry.conversationId || entry.conversation_id) : null);
      console.log("这是entry: ", entry)
      if (!finalId) {
        console.error("无法评分：缺少会话ID");
        return;
      }
      // 写入临时分数
      this.$set(this.tempScores, finalId, score);
      this.$forceUpdate();
    },

    handleScroll(e) {
      const target = e.target;
      // 阈值：距离底部 50px 以内都算“在底部”
      const threshold = 50;

      // 判断是否在底部: 卷去的高度 + 可视高度 >= 总滚动高度 - 阈值
      const isAtBottom = target.scrollTop + target.clientHeight >= target.scrollHeight - threshold;

      if (isAtBottom) {
        // 如果用户滚回底部了，重置状态
        this.isUserScrollingUp = false;
        this.unreadNewMsgCount = 0; // 消息已读，气泡消失
      } else {
        // 用户滚上去了
        this.isUserScrollingUp = true;
      }
    },

    // 滚动到底部动作
    scrollToBottom() {
      this.$nextTick(() => {
        const container = this.$el;
        if (container) {
          // 平滑滚动效果 (可选，behavior: 'smooth')，但即时通讯通常推荐 'auto' 瞬间跳到底部
          container.scrollTo({
            top: container.scrollHeight,
            behavior: 'auto'
          });

          // 重置状态
          this.isUserScrollingUp = false;
          this.unreadNewMsgCount = 0;
        }
      });
    },
    handleRateChange(val, conversationId) {
      if (!conversationId) return;
      // 使用 $set 确保数据响应式
      this.$set(this.tempScores, conversationId, val);
      // 强制更新组件，防止 UI 卡死（这是解决"点不动"的关键）
      this.$forceUpdate();
    },
    submitHistoryRating(entry) {
      let finalId = entry.conversationId || entry.conversation_id;
      if (!finalId) {
        this.$message.error("提交失败：缺失会话ID");
        return;
      }

      const score = this.tempScores[finalId];
      if (!score) return;

      reqSubmitScore(finalId, score).then(resp => {
        if (resp && resp.status === 200) {
          // 提交成功后，修改本地数据，卡片立马变身“只读”状态
          this.$set(entry, 'score', score);

          // 清理临时输入
          this.$delete(this.tempScores, finalId);
        }
      });
    },

    // 从点击事件中提取 domain-id
    handleMessageClick(event) {
      // 检查点击的是否是带有 data-action 的元素
      if (event.target.dataset.action === 'open-service-dialog') {
        if (this.isChatActive) {
          this.$message.warning("当前服务中心已有正在进行的会话，请先结束当前服务后再开启新的会话");
          return;
        }
        const domainId = this.currentSession.serviceDomainId;
        if (domainId) {
          this.openServiceDialog(domainId);
        } else {
          console.error("当前会话缺少 serviceDomainId", this.currentSession);
          this.$message.error("系统状态异常，请刷新页面后重试");
        }
      }
    },

    // 【修改】开启弹窗，接收 domainId
    openServiceDialog(domainId) {
      if (this.isChatActive) {
        this.$message.warning("当前会话已开启，无需重复操作");
        return;
      }
      if (!domainId) {
        this.$message.error("无法获取服务域信息");
        return;
      }
      this.currentDomainId = domainId; // 保存 ID，提交时要用
      this.loading = true;
      this.serviceList = [];

      // 传入 domainId 获取对应的服务列表
      reqGetSupportServiceCategories(domainId).then(resp => {
        this.loading = false;
        // 兼容处理：resp.obj 是列表，或者 resp 本身是列表
        let list = (resp && (resp.obj || resp)) || [];
        // 确保 list 是数组
        if (!Array.isArray(list)) list = [];

        this.serviceList = list;

        if (this.serviceList.length > 0) {
          this.selectedServiceId = this.serviceList[0].id;
          this.serviceDialogVisible = true;
        } else {
          this.$message.warning("该服务域暂无可用的人工服务分类");
        }
      }).catch(err => {
        this.loading = false;
        console.error(err);
        this.$message.error("获取服务分类失败");
      });
    },

    // 确认开启，传入 domainId 和 serviceId
    confirmStartChat() {
      if (!this.selectedServiceId || !this.currentDomainId) return;
      this.loading = true;
      const selectedService = this.serviceList.find(item => item.id === this.selectedServiceId);
      const serviceName = selectedService.name;
      this.$store.dispatch('startPrivateChat', {
        domainId: this.currentDomainId,
        serviceId: this.selectedServiceId,
        serviceName: serviceName
      }).then(success => {
        this.loading = false;
        this.serviceDialogVisible = false;
      });
    },

    getDisplayAvatar(entry) {
      if (this.isVirtualService) {
        // 如果是虚拟服务，直接显示服务号头像
        // 除非 entry.fromProfile 是特定的虚拟头像（如后端传来的“人工客服团队”头像），否则统一用服务头像
        // 绝对不去查什么 realInfo
        return this.serviceAvatar;
      } else {
        return entry.fromProfile || this.currentSession.userProfile || this.defaultAvatar;
      }
    },

    getDisplayNickname(entry) {
      if (this.isVirtualService) {
        // 统一显示当前服务号的昵称（如“A类服务团队”）
        return this.currentSession.nickname;
      } else {
        return entry.fromNickname || this.currentSession.nickname;
      }
    }
  },
  filters: {
    time(date) {
      return date ? new Date(date).toTimeString().slice(0, 5) : '';
    },
    fullTime(date) {
      return date ? new Date(date).toLocaleString() : '';
    }
  },
  directives: {
    'scroll-bottom': {
      componentUpdated: function (el) {
        setTimeout(() => {
          el.scrollTop = el.scrollHeight;
        }, 100);
      }
    }
  }
}
</script>

<style scoped>
/* 此处保留你原有的 scoped 样式，不需要改动 */
#message {
  padding: 10px 0;
  box-sizing: border-box;
}

.chat-wrapper {
  padding: 0 20px;
}

.message-row {
  margin-bottom: 20px;
}

.system-message-container {
  margin: 10px 0;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.system-text {
  font-size: 13px;
  color: #909399;
  display: flex;
  align-items: center;
  gap: 15px;
}

.line {
  width: 30px;
  height: 1px;
  background: #e0e0e0;
}

.system-time {
  font-size: 12px;
  color: #c0c4cc;
  margin-top: 4px;
}

.welcome-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
}

.welcome-avatar {
  width: 80px;
  margin-bottom: 20px;
  border-radius: 50%;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
}

.welcome-text {
  text-align: center;
  margin-bottom: 30px;
  color: #666;
}

.title {
  font-size: 18px;
  font-weight: bold;
  margin-bottom: 10px;
}

.message-group {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

.message-group.self {
  justify-content: flex-end;
}

.avatar {
  width: 38px;
  height: 38px;
  border-radius: 4px;
  box-shadow: 0 1px 1px rgba(0, 0, 0, 0.1);
  flex-shrink: 0;
}

.message-group:not(.self) .avatar {
  margin-top: 5px;
}

.content-box {
  display: flex;
  flex-direction: column;
  max-width: 70%;
}

.message-group:not(.self) .content-box {
  align-items: flex-start;
}

.message-group.self .content-box {
  align-items: flex-end;
}

.sender-name {
  font-size: 12px;
  line-height: 18px;
  color: #909399;
  margin-bottom: 2px;
  margin-left: 2px;
  display: block;
}

.bubble {
  padding: 10px 14px;
  border-radius: 4px;
  font-size: 15px;
  line-height: 1.5;
  position: relative;
  word-break: break-all;
  box-shadow: 0 1px 1px rgba(0, 0, 0, 0.05);
}

.message-group:not(.self) .bubble {
  background: #fff;
  border: 1px solid #e4e7ed;
  color: #333;
}

.message-group:not(.self) .bubble::before {
  content: "";
  position: absolute;
  top: 14px;
  left: -6px;
  width: 0;
  height: 0;
  border-right: 6px solid #fff;
  border-top: 6px solid transparent;
  border-bottom: 6px solid transparent;
}

.message-group:not(.self) .bubble::after {
  content: "";
  position: absolute;
  top: 14px;
  left: -7px;
  width: 0;
  height: 0;
  border-right: 6px solid #e4e7ed;
  border-top: 6px solid transparent;
  border-bottom: 6px solid transparent;
  z-index: -1;
}

.message-group.self .bubble {
  background: #b1e3ff;
  border: none;
  color: #333;
}

.message-group.self .bubble::after {
  content: "";
  position: absolute;
  top: 14px;
  right: -6px;
  width: 0;
  height: 0;
  border-left: 6px solid #b1e3ff;
  border-top: 6px solid transparent;
  border-bottom: 6px solid transparent;
}

.text {
  margin: 0;
}

.limit-tip {
  text-align: center;
  padding: 10px 0;
  font-size: 12px;
  color: #909399;
}

.msg-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  margin-top: 4px;
}

.message-group:not(.self) .msg-footer {
  justify-content: flex-start;
}

.read-status {
  font-size: 10px;
  color: #f56c6c;
  margin-right: 6px;
}

.read-status.read {
  color: #67c23a;
}

.time-tip {
  font-size: 11px;
  color: #c0c4cc;
}

.chat-img {
  max-width: 200px;
  border-radius: 4px;
  cursor: pointer;
}

.file-card {
  display: flex;
  align-items: center;
}

.file-icon {
  font-size: 28px;
  margin-right: 10px;
  color: #606266;
}

.file-text {
  font-size: 14px;
  font-weight: bold;
  margin-bottom: 2px;
}

.download-link {
  font-size: 12px;
  color: #409EFF;
  text-decoration: none;
}

.service-select-container {
  display: flex;
  flex-direction: column;
  padding: 10px 0;
}

.service-radio-group {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.service-radio {
  margin-left: 0 !important;
  width: 100%;
  box-sizing: border-box;
}

.no-service-tip {
  text-align: center;
  color: #909399;
}

.new-msg-tip {
  position: fixed; /* 或 absolute，视父级定位而定 */
  bottom: 160px; /* 距离底部的距离，避开输入框 */
  right: 20px; /* 距离右侧的距离 */
  background-color: #fff;
  color: #409EFF;
  padding: 8px 15px;
  border-radius: 20px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  font-size: 13px;
  cursor: pointer;
  z-index: 999;
  display: flex;
  align-items: center;
  transition: all 0.3s;
  border: 1px solid #e6f1fc;
}

.new-msg-tip:hover {
  background-color: #f0f9eb;
  transform: translateY(-2px);
}

.new-msg-tip i {
  margin-right: 5px;
  font-weight: bold;
}

/* 气泡显隐动画 */
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.5s;
}

.fade-enter, .fade-leave-to {
  opacity: 0;
}

/* 评价卡片样式 */
.system-rating-container {
  display: flex;
  justify-content: center;
  margin: 20px 0;
  width: 100%;
}

.rating-card {
  background: #ffffff;
  border: 1px solid #ebeef5;
  border-radius: 8px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.05);
  width: 280px;
  padding: 20px;
  text-align: center;
}

.rating-header {
  font-size: 13px;
  color: #909399;
  margin-bottom: 15px;
  border-bottom: 1px dashed #f2f6fc;
  padding-bottom: 10px;
}

.rating-label {
  font-size: 14px;
  color: #303133;
  margin-bottom: 10px;
}

.rating-action {
  margin-top: 15px;
}

/* 自定义星星容器 */
.custom-star-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  margin: 10px 0;
}

/* 星星基础样式 (默认为灰色) */
.custom-star {
  font-size: 32px; /* 把星星放大一点，方便点击 */
  color: #e0e0e0;
  cursor: pointer;
  transition: all 0.2s;
}

/* 选中状态 (黄色) */
.custom-star.active {
  color: #F7BA2A;
  transform: scale(1.1); /* 选中时稍微放大 */
}

/* 鼠标悬停效果 */
.custom-star:hover {
  transform: scale(1.2);
}

/* 分数文字 */
.score-text {
  font-size: 14px;
  color: #F7BA2A;
  margin-left: 10px;
  font-weight: bold;
  min-width: 35px;
}
</style>

<style>
/* 弹窗居中样式 */
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
