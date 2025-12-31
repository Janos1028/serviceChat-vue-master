import Vue from 'vue'
import Vuex from 'vuex'
import {
  reqGetChatUsers,
  reqStartPrivateChat,
  reqClosePrivateChat,
  reqGetPrivateChatHistory,
  reqGetAllActiveSessions
} from "../utils/api";
import SockJS from '../utils/sockjs'
import '../utils/stomp'
import { Notification } from 'element-ui';
import notifySound from '../assets/notify.mp3'; // 提示音

Vue.use(Vuex)

const store = new Vuex.Store({
  state: sessionStorage.getItem('state') ? JSON.parse(sessionStorage.getItem('state')) : {
    routes: [],
    sessions: {},
    users: [],
    currentUser: null,
    currentSession: null,
    isPrivateChatActive: false,
    currentConversationId: null,
    activeSessions: {},
    filterKey: '',
    stomp: null,
    isDot: {},
    errorImgUrl: "http://39.108.169.57/group1/M00/00/00/J2ypOV7wJkyAAv1fAAANuXp4Wt8303.jpg",
    shotHistory: {}
  },
  mutations: {
    initRoutes(state, data) {
      state.routes = data;
    },
    // 更新用户在线状态
    UPDATE_USER_STATE(state, { userId, userStateId }) {
      let user = state.users.find(u => u.id === userId);
      if (user) {
        user.userStateId = userStateId;
      }
    },
    INIT_ACTIVE_SESSIONS(state, sessionsMap) {
      let newMap = {};
      if (sessionsMap && state.users.length > 0) {
        for (let [uidStr, convId] of Object.entries(sessionsMap)) {
          let user = state.users.find(u => u.id.toString() === uidStr);
          if (user) {
            newMap[user.username] = convId;
          }
        }
      }
      state.activeSessions = newMap;
    },
    changeCurrentSession(state, currentSession) {
      state.currentSession = currentSession;
      if (currentSession) {
        // 切换会话时，自动消除红点
        Vue.set(state.isDot, state.currentUser.username + "#" + currentSession.username, false);

        let cachedConvId = state.activeSessions[currentSession.username];
        if (cachedConvId) {
          state.isPrivateChatActive = true;
          state.currentConversationId = cachedConvId;
        } else {
          if(currentSession.username === '群聊'){
            state.isPrivateChatActive = true;
            state.currentConversationId = null;
          } else {
            state.isPrivateChatActive = false;
            state.currentConversationId = null;
          }
        }
      }
    },
    SET_CHAT_ACTIVE(state, { conversationId, isActive, username }) {
      state.isPrivateChatActive = isActive;
      state.currentConversationId = conversationId;
      let targetUsername = username || (state.currentSession ? state.currentSession.username : null);
      if (targetUsername) {
        if (isActive) {
          Vue.set(state.activeSessions, targetUsername, conversationId);
        } else {
          Vue.delete(state.activeSessions, targetUsername);
        }
      }
    },
    addMessage(state, msg) {
      let key = state.currentUser.username + "#" + msg.to;
      if (!state.sessions[key]) {
        Vue.set(state.sessions, key, []);
      }
      state.sessions[key].push({
        content: msg.content,
        date: msg.createTime || new Date(),
        fromNickname: msg.fromNickname,
        messageTypeId: msg.messageTypeId,
        self: !msg.notSelf
      })
    },
    SET_HISTORY_MESSAGES(state, { username, messages }) {
      let key = state.currentUser.username + "#" + username;
      let formatted = messages.map(m => ({
        content: m.content,
        date: m.createTime,
        fromNickname: m.fromName,
        messageTypeId: m.messageTypeId,
        self: m.fromId === state.currentUser.id
      }));
      Vue.set(state.sessions, key, formatted);
    },
    INIT_USER(state, data) {
      state.users = data;
    }
  },
  actions: {
    initData(context) {
      reqGetChatUsers().then(resp => {
        if (resp) {
          context.commit('INIT_USER', resp);
          reqGetAllActiveSessions().then(sessionResp => {
            if(sessionResp && sessionResp.status === 200) {
              context.commit('INIT_ACTIVE_SESSIONS', sessionResp.obj);
            }
          });
        }
      });
    },
    startPrivateChat({ commit }, toUser) {
      return reqStartPrivateChat(toUser.id).then(resp => {
        if (resp && resp.status === 200) {
          commit('SET_CHAT_ACTIVE', {
            conversationId: resp.obj,
            isActive: true,
            username: toUser.username
          });
          return true;
        }
        return false;
      });
    },
    endPrivateChat({ commit, state }) {
      if (!state.currentConversationId) return;
      return reqClosePrivateChat(state.currentConversationId).then(resp => {
        if (resp && resp.status === 200) {
          commit('SET_CHAT_ACTIVE', {
            conversationId: null,
            isActive: false,
            username: state.currentSession.username
          });
        }
      });
    },
    loadPrivateHistory({ commit }, toUser) {
      reqGetPrivateChatHistory(toUser.id).then(data => {
        if (data) {
          commit('SET_HISTORY_MESSAGES', {
            username: toUser.username,
            messages: data
          });
        }
      });
    },
    connect(context) {
      let token = "";
      let userStr = window.sessionStorage.getItem("user");
      if (userStr) {
        let user = JSON.parse(userStr);
        token = user.token;
      }
      context.state.stomp = Stomp.over(new SockJS('/ws/ep'));
      let headers = { 'Authorization': 'Bearer ' + token };

      context.state.stomp.connect(headers, success => {
        context.state.stomp.subscribe("/topic/notification", msg => { /*...*/ });

        // 订阅聊天消息
        context.state.stomp.subscribe('/user/queue/chat', msg => {
          let receiveMsg = JSON.parse(msg.body);

          // 播放提示音 (这一步判断是正确的：不是自己发的才响)
          if (receiveMsg.from !== context.state.currentUser.username) {
            let audio = new Audio(notifySound);
            audio.play().catch(e => console.log("播放失败", e));
          }

          // 【修复点 1】: 弹窗通知逻辑
          // 增加条件：receiveMsg.from !== context.state.currentUser.username
          // 只有“发送者不是我自己” 且 (“当前没有会话” 或 “消息来源不是当前正在聊的人”) 时，才弹窗
          if (
              receiveMsg.from !== context.state.currentUser.username &&
              (!context.state.currentSession || receiveMsg.from != context.state.currentSession.username)
          ) {
            // 过滤系统消息
            if (!receiveMsg.messageTypeId || receiveMsg.messageTypeId <= 3) {
              Notification.info({
                title: '【' + receiveMsg.fromNickname + '】发来消息',
                message: receiveMsg.content.length > 15 ? receiveMsg.content.substr(0, 15) + '...' : receiveMsg.content,
                position: "bottom-right",
                customClass: 'chat-notification',
                onClick: () => {
                  let senderUser = context.state.users.find(u => u.username === receiveMsg.from);
                  if (senderUser) {
                    context.commit('changeCurrentSession', senderUser);
                    context.dispatch('loadPrivateHistory', senderUser);
                  }
                }
              });
            }
            // 标记红点
            Vue.set(context.state.isDot, context.state.currentUser.username + "#" + receiveMsg.from, true);
          }


          if (receiveMsg.from === context.state.currentUser.username) {
            // Case A: 我发的消息 (或系统替我发的)
            receiveMsg.notSelf = false; // 显示在右侧
            // receiveMsg.to 保持不变 (应该是对方的 username)，这样 Key 就会是 Me#对方
          } else {
            // Case B: 别人发给我的
            receiveMsg.notSelf = true;  // 显示在左侧
            receiveMsg.to = receiveMsg.from; // 对于我来说，对话方是发送者，所以把 to 设为 from，Key 变成 Me#发送者
          }

          // 提交到 Store
          context.commit('addMessage', receiveMsg);
        });

        // 订阅状态变更 (处理会话开启/结束)
        context.state.stomp.subscribe('/user/queue/chat/status', msg => {
          let payload = JSON.parse(msg.body);
          let partnerId;
          if (payload.fromId === context.state.currentUser.id) {
            partnerId = payload.toId;
          } else {
            partnerId = payload.fromId;
          }
          let targetUser = context.state.users.find(u => u.id === partnerId);

          if (payload.type === 'START') {
            if (targetUser) {
              Vue.set(context.state.activeSessions, targetUser.username, payload.conversationId);
              if (context.state.currentSession && context.state.currentSession.username === targetUser.username) {
                context.commit('SET_CHAT_ACTIVE', {
                  conversationId: payload.conversationId,
                  isActive: true,
                  username: targetUser.username
                });
              }
            }
          }
          else if (payload.type === 'END') {
            // 【修复点 2】: 查找结束的会话 ID
            // 使用 String() 转换或 == 进行比较，防止 Long 类型(后端)与 String/Number 类型(前端)不匹配导致找不到 key
            let endedUsername = Object.keys(context.state.activeSessions).find(
                key => String(context.state.activeSessions[key]) === String(payload.conversationId)
            );

            if (endedUsername) {
              // 删除活跃状态，这样界面上的“开启会话”按钮就会变回可用状态
              Vue.delete(context.state.activeSessions, endedUsername);

              // 如果当前正停留在该会话，也更新当前状态
              if (context.state.currentSession && context.state.currentSession.username === endedUsername) {
                context.commit('SET_CHAT_ACTIVE', {
                  conversationId: null,
                  isActive: false,
                  username: endedUsername
                });
              }
            }
          }
        });

        // 订阅用户状态变更通知
        context.state.stomp.subscribe("/topic/userStatus", msg => {
          let statusMsg = JSON.parse(msg.body);
          context.commit('UPDATE_USER_STATE', {
            userId: statusMsg.userId,
            userStateId: statusMsg.userStateId
          });
        });

      }, error => {
        // ...
      })
    },
    disconnect(context) {
      if (context.state.stomp != null) {
        context.state.stomp.disconnect();
      }
    },
  }
})

export default store;
