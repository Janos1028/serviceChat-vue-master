import Vue from 'vue'
import Vuex from 'vuex'
import {
  reqGetChatUsers,
  reqStartPrivateChat,
  reqGetRecentConversation,
  reqClosePrivateChat,
  reqGetPrivateChatHistory,
  reqGetAllActiveSessions,
  reqGetUnreadSenders,
  reqUpdateMsgRead,
  baseUrl
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
    shotHistory: {},
    hiddenSessions: JSON.parse(localStorage.getItem('hiddenSessions') || '{}'),
  },
  mutations: {
    initRoutes(state, data) {
      state.routes = data;
    },

    // 当用户点击退出登录后，清除掉session中的state数据
    RESET_STATE(state) {
      state.routes = [];
      state.sessions = {};
      state.users = [];
      state.currentUser = null;
      state.currentSession = null;  // 关键：清除当前选中的人
      state.isPrivateChatActive = false;
      state.currentConversationId = null;
      state.activeSessions = {};
      state.isDot = {};
      state.filterKey = '';
      // 如果 stomp 连接还在，最好也置空（虽然 disconnect 已经断开了）
      state.stomp = null;
    },
    // 批量删除会话（其实是隐藏）
    BATCH_DELETE_SESSIONS(state, usernames) {
      const now = new Date().getTime();

      // 1. 将选中的用户名加入黑名单，并记录当前时间
      if (!state.hiddenSessions) {
        Vue.set(state, 'hiddenSessions', {});
      }

      usernames.forEach(username => {
        // 现在 state.hiddenSessions 肯定有值了，不会报错了
        Vue.set(state.hiddenSessions, username, now);
      });

      // 存入 LocalStorage
      localStorage.setItem('hiddenSessions', JSON.stringify(state.hiddenSessions));

      // 从界面移除
      state.users = state.users.filter(u => !usernames.includes(u.username));

      // 如果当前正在聊的人被删了，重置聊天框
      if (state.currentSession && usernames.includes(state.currentSession.username)) {
        state.currentSession = null;
        state.isPrivateChatActive = false;
      }
    },

    // 更新用户在线状态
    UPDATE_USER_STATE(state, { userId, userStateId }) {
      let user = state.users.find(u => u.id === userId);
      if (user) {
        user.userStateId = userStateId;
      }
      // 如果当前选中的人(currentSession)正好就是状态发生变化的人，也要更新它
      if (state.currentSession && state.currentSession.id === userId) {
        // 使用 Vue.set 保证视图立即响应更新
        Vue.set(state.currentSession, 'userStateId', userStateId);
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
        self: !msg.notSelf,
        state: 0// 新发的消息默认为未读
      })
      let targetUser = state.users.find(u => u.username === msg.to);
      if (targetUser) {
        // 使用 Vue.set 确保新增属性是响应式的，能被组件监听到
        Vue.set(targetUser, 'lastMessageTime', msg.createTime || new Date());
      }
    },

    // 将我对某人的聊天记录全部标记为已读
    MARK_SESSION_READ(state, readerUsername) {
      // readerUsername 是对方的用户名，key = 我#对方
      let key = state.currentUser.username + "#" + readerUsername;
      if (state.sessions[key]) {
        state.sessions[key].forEach(msg => {
          // 只有是我发的(self=true)，才把状态改为已读
          if (msg.self) {
            msg.state = 1;
          }
        });
        // 强制触发 Vue 列表更新
        Vue.set(state.sessions, key, [...state.sessions[key]]);
      }
    },

    SET_HISTORY_MESSAGES(state, { username, messages }) {
      let key = state.currentUser.username + "#" + username;
      let formatted = messages.map(m => ({
        content: m.content,
        date: m.createTime,
        fromNickname: m.fromName,
        messageTypeId: m.messageTypeId,
        self: m.fromId === state.currentUser.id,
        state: m.state // 保存后端传来的 0(未读) 或 1(已读)
      }));
      Vue.set(state.sessions, key, formatted);
    },
    INIT_USER(state, data) {
      state.users = data;
    }
  },
  actions: {
    initData(context, options = {}) {
      // 1. 获取当前用户信息
      let currentUser = context.state.currentUser || JSON.parse(window.sessionStorage.getItem("user"));
      if (!currentUser) return;

      // 2. 根据用户身份决定调用哪个接口
      let requestPromise;
      if (currentUser.userTypeId === 1) {
        // 如果是支撑人员，必须调用这个新接口！
        // 确保你在文件头部 import 中已经引入了 reqGetRecentConversation
        requestPromise = reqGetRecentConversation();
      } else {
        // 普通用户还是用原来的逻辑
        requestPromise = reqGetChatUsers();
      }

      // 3. 执行请求
      requestPromise.then(resp => {
        if (resp) {
          // 兼容处理：后端可能直接返回数组，也可能封装在 obj 里
          let userList = resp.obj || resp;

          if (userList) {
            // 简单的数据清洗：确保 lastMessageTime 字段存在（用于排序）
            userList = userList.map(u => ({
              ...u,
              // 后端VO里的 lastMsgTime 映射给前端的 lastMessageTime
              lastMessageTime: u.lastMsgTime || u.lastMessageTime
            }));

            // 只有当 (用户不在黑名单) 或者 (用户虽然在黑名单，但有比删除时间更新的消息) 时，才显示
            let hiddenSessions = context.state.hiddenSessions || {};

            userList = userList.filter(u => {
              // 1. 如果没被删过，保留
              if (!hiddenSessions[u.username]) return true;

              // 2. 如果被删过，检查最后一条消息的时间
              if (!u.lastMessageTime) return false; // 没时间的旧数据直接隐藏

              let msgTime = new Date(u.lastMessageTime).getTime();
              let deleteTime = hiddenSessions[u.username];

              // 只有 新消息时间 > 删除操作时间，才让它“复活”
              return msgTime > deleteTime;
            });

            context.commit('INIT_USER', userList);

            // 加载完用户后，再加载活跃会话状态 (红点/正在聊天状态)
            reqGetAllActiveSessions().then(sessionResp => {
              if(sessionResp && sessionResp.status === 200) {
                context.commit('INIT_ACTIVE_SESSIONS', sessionResp.obj);
              }
            });

                // 加载未读消息红点
                // 确保 currentUser 已存在 (通常 INIT_USER 后就有了，或者从 sessionStorage 取)
                let user = context.state.currentUser || JSON.parse(window.sessionStorage.getItem("user"));
                if (user) {
                  reqGetUnreadSenders().then(resp => {

                    // 2.解析数据结构
                    // 因为 axios 拦截器返回的是 success.data，所以这里的 resp 就是 {status:200, msg:null, obj:[...]}
                    if (resp && resp.status === 200 && resp.obj && resp.obj.length > 0) {

                      let idList = resp.obj; // <--- 关键：从 obj 里拿数组
                      let unreadNicknames = []; // 用于收集发送者的昵称
                      idList.forEach(senderId => {
                        // 在 users 列表中找到对应的 username
                        // 注意：senderId 是数字，u.id 也是数字，可以直接比较
                        let sender = context.state.users.find(u => u.id === senderId);

                        if (sender) {
                          // 生成 key: 当前用户#发送者，设为 true
                          // 使用 Vue.set 确保界面能监听到变化
                          Vue.set(context.state.isDot, user.username + "#" + sender.username, true);
                          unreadNicknames.push(sender.nickname);
                        }
                      });
                      if (!options.silent && unreadNicknames.length > 0) {
                        let uniqueNames = [...new Set(unreadNicknames)];
                        let content = uniqueNames.slice(0, 3).join('、');
                        if (uniqueNames.length > 3) {
                          content += ` 等 ${uniqueNames.length} 人`;
                        }
                        Notification.info({
                          title: '离线消息提醒',
                          message: `您收到来自 ${content} 的未读消息，请及时查看。`,
                          position: "top-right",
                          duration: 10000,
                          onClick: () => {}
                        });
                      }
                    }
                  });
                }
              }
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
          // 调用后端接口，把红点消掉，并通知对方“我读了”
          // 这里的参数是对方的 ID
          reqUpdateMsgRead(toUser.id);
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
      context.state.stomp = Stomp.over(new SockJS(baseUrl +'/ws/ep'));
      let headers = { 'Authorization': 'Bearer ' + token };

      context.state.stomp.connect(headers, success => {
        context.state.stomp.subscribe("/topic/notification", msg => { /*...*/ });

        // 订阅聊天消息
        context.state.stomp.subscribe('/user/queue/chat', msg => {
          let receiveMsg = JSON.parse(msg.body);
        // 排除自己发的消息
          if (receiveMsg.from !== context.state.currentUser.username) {
            let senderUser = context.state.users.find(u => u.username === receiveMsg.from);

            // 如果列表里没这个人（说明是新开启的会话，或者是以前的会话被过滤掉了）
            if (!senderUser) {
              console.log("收到新用户的消息，正在刷新列表...", receiveMsg.from);
              context.dispatch('initData', { silent: true });
              // 立即刷新列表，这样左侧列表就会出现这个人，弹窗点击也能找到人了
            }
          }
          // 播放提示音 (这一步判断是正确的：不是自己发的才响)
          if (receiveMsg.from !== context.state.currentUser.username) {
            let audio = new Audio(notifySound);
            audio.play().catch(e => console.log("播放失败", e));
          }

          // 弹窗通知逻辑
          // 增加条件：receiveMsg.from !== context.state.currentUser.username
          // 只有“发送者不是我自己” 且 (“当前没有会话” 或 “消息来源不是当前正在聊的人”) 时，才弹窗
          if (receiveMsg.from !== context.state.currentUser.username) {

            // 场景 1: 我当前没有打开聊天窗口，或者打开的窗口不是这个人
            // 动作: 弹窗通知 + 显示红点
            if (!context.state.currentSession || receiveMsg.from != context.state.currentSession.username) {

              // (原有的弹窗逻辑保持不变)
              if (!receiveMsg.messageTypeId || receiveMsg.messageTypeId <= 3) {
                let notifyInstance = Notification.info({
                  title: '【' + receiveMsg.fromNickname + '】发来消息',
                  message: receiveMsg.content.length > 15 ? receiveMsg.content.substr(0, 15) + '...' : receiveMsg.content,
                  position: "top-right",
                  duration: 5000,
                  customClass: 'chat-notification',
                  showClose: true,
                  onClick: () => {
                    notifyInstance.close();
                    // 因为上面调用了 initData，现在 users 里应该已经有这个人了
                    let latestUsers = context.state.users;
                    let targetUser = latestUsers.find(u => u.username === receiveMsg.from);

                    if (targetUser) {
                      context.commit('changeCurrentSession', targetUser);
                      // 如果不是群聊，加载历史记录
                      if (targetUser.username !== '群聊') {
                        context.dispatch('loadPrivateHistory', targetUser);
                      }
                    } else {
                      // 极端情况：点击太快，initData 还没回来，或者网络错误
                      console.warn("用户列表尚未同步完成，无法跳转");
                      // 可以选择再次尝试刷新
                      context.dispatch('initData');
                    }
                  }
                });
              }
              // 标记红点
              Vue.set(context.state.isDot, context.state.currentUser.username + "#" + receiveMsg.from, true);
            }

                // 场景 2: 我当前正打开着窗口跟这个人聊天
            // 动作: 不需要弹窗，不需要红点，直接告诉后端“已读”
            else {
              // 1. 调用后端接口，告诉对方“我已读” (传入当前会话对象的ID)
              reqUpdateMsgRead(context.state.currentSession.id);

              // 2. 本地将这条消息状态设为 1 (已读)，保持数据一致
              receiveMsg.state = 1;
            }
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

          // 处理已读回执
          else if (payload.type === 'READ_RECEIPT') {
            // payload.readerName 是读了消息的人（即对方的 username）
            // 触发 mutation 更新界面
            context.commit('MARK_SESSION_READ', payload.readerName);
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
