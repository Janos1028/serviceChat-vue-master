import Vue from 'vue'
import Vuex from 'vuex'
import {
  reqGetServiceDomains,
  reqStartPrivateChat,
  reqGetRecentConversation,
  reqClosePrivateChat,
  reqSupporterGetHistoryMsg,
  reqGetAllActiveSessions,
  reqGetUnreadSenders,
  reqUpdateMsgRead,
  reqGetHistoryMsg,
  baseUrl, reqUpdateServiceMsgRead,
} from "../utils/api";
import SockJS from '../utils/sockjs'
import '../utils/stomp'
import { Notification } from 'element-ui';
import notifySound from '../assets/notify.mp3';
import customerServiceAvatar from '../assets/客服头像.png';

Vue.use(Vuex)
const savedState = sessionStorage.getItem('state') ? JSON.parse(sessionStorage.getItem('state')) : null;
if (savedState) {
  savedState.stomp = null;
  savedState.isStompConnected = false;
  savedState.sessions = {};
  // 确保清理掉可能残留的旧字段，防止干扰
  if (!savedState.sessions) savedState.sessions = {};
  if (!savedState.isDot) savedState.isDot = {};
  if (!savedState.users) savedState.users = [];
  if (!savedState.conversationToServiceMap) savedState.conversationToServiceMap = {};
}
const store = new Vuex.Store({
  state: savedState || {
    routes: [],
    sessions: {},
    // 用户列表：每个 User 对象内部将包含 conversationId 属性，以此判断会话是否开启
    users: [],
    currentUser: null,
    currentSession: null, // 当前选中的 User 对象

    // 路由映射 (普通用户端专用：ConversationId -> ServiceUsername)
    conversationToServiceMap: {},

    filterKey: '',
    stomp: null,
    isStompConnected : false,
    isDot: {}, // 红点状态
  },

  mutations: {
    initRoutes(state, data) { state.routes = data; },
    RESET_STATE(state) {
      state.routes = []; state.sessions = {}; state.users = [];
      state.currentUser = null; state.currentSession = null;
      state.isChatActive = false;
      state.isDot = {}; state.stomp = null;
    },
    REGISTER_CONVERSATION_MAPPING(state, { conversationId, serviceUsername }) {
      // 双重保险：如果对象不存在，立即创建
      if (!state.conversationToServiceMap) {
        Vue.set(state, 'conversationToServiceMap', {});
      }
      Vue.set(state.conversationToServiceMap, conversationId, serviceUsername);
      console.log('Mapping Registered:', conversationId, '->', serviceUsername);
    },
    UPDATE_USER_STATE(state, { userId, userStateId }) {
      let user = state.users.find(u => u.id === userId);
      if (user) Vue.set(user, 'userStateId', userStateId);
      if (state.currentSession && state.currentSession.id === userId) Vue.set(state.currentSession, 'userStateId', userStateId);
    },
    INIT_ACTIVE_SESSIONS(state, sessionsMap) {
      if (!sessionsMap || !state.users.length) return;

      // sessionsMap 结构: { "userId": "convId" } (后端 Redis 返回)
      state.users.forEach(user => {
        let convId = null;

        // 根据身份匹配 Key
        if (state.currentUser.userTypeId === 1) {
          // 客服端：Key 是用户 ID
          convId = sessionsMap[user.id.toString()];
        } else {
          // 用户端：Key 是 Service Username (或 StaffID，视后端返回而定)
          // 这里主要处理客服端的逻辑，用户端通常是点击后才建立连接
          convId = sessionsMap[user.username];
        }

        // 直接修改 User 对象属性
        if (convId) {
          Vue.set(user, 'conversationId', convId);
        } else {
          Vue.set(user, 'conversationId', null);
        }
      });
    },

    INIT_DATA(state) {
      // 1. 确保获取到最新的当前用户
      let user = JSON.parse(window.sessionStorage.getItem("user"));
      state.currentUser = user;
      // 注意：原先这里的 API 请求逻辑全部移到 actions 中处理，防止数据冲突
    },

    changeCurrentSession(state, currentSession) {
      state.currentSession = currentSession;

      if (currentSession) {
        // 1. 清除红点 (视觉)
        Vue.set(state.isDot, state.currentUser.username + "#" + currentSession.username, false);

        // 2. 【核心新增】调用后端接口更新已读状态
        if (state.currentUser.userTypeId === 1) {
          // --- 客服端逻辑 ---
          // 确保有真实的用户ID才调用
          if (currentSession.id) {
            reqUpdateMsgRead(currentSession.id);
          }
        } else {
          // --- 普通用户端逻辑 ---
          // 确保是服务号
          if (currentSession.username.startsWith('service_')) {
            let domainId = currentSession.serviceDomainId;
            // 获取 staffId：如果会话已激活，currentSession.id 会被替换为真实客服ID
            // 如果未激活，id 可能是 null，此时只传 domainId 进行批量更新
            let staffId = currentSession.id;

            if (domainId) {
              reqUpdateServiceMsgRead(domainId, staffId);
            }
          }
        }

        // --- 自动发送欢迎语逻辑 (普通用户端) ---
        if (state.currentUser.userTypeId !== 1 && currentSession.username.startsWith('service_') ) {
          let targetUser = state.users.find(u => u.username === currentSession.username) || currentSession;
          // 严谨判断：如果没有活跃会话 ID，才允许显示欢迎语
          if (state.currentSession.id===null) {
            let key = state.currentUser.username + "#" + currentSession.username;
            if (!state.sessions[key]) Vue.set(state.sessions, key, []);
            let nickname = targetUser.nickname || '服务中心';
            let domainId = targetUser.serviceDomainId;
            let msgs = state.sessions[key];
            // 检查最后一条是否已经是欢迎语，防止重复 push
            let hasWelcome = msgs.some(m => m.isLocal && m.content.includes('open-service-dialog'));

            if (!hasWelcome) {
              console.log("打招呼发送");
              msgs.push({
                content: `您好，欢迎咨询${nickname}！<br>请点击：<span style="color:#409EFF;cursor:pointer;font-weight:bold;text-decoration:underline;" data-action="open-service-dialog" data-domain-id="${domainId}">【人工服务】</span>，系统将为您分配专属客服。`,
                date: new Date(),
                fromNickname: nickname,
                self: false,
                isLocal: true,
                fromProfile: null
              });
            }
          }
        }

      }
      },
    SET_CHAT_ACTIVE(state, { conversationId, isActive, userId, username }) {
      // 1. 寻找列表中的目标用户对象
      let targetUser = null;
      if (userId) {
        targetUser = state.users.find(u => u.id == userId);
      } else if (username) {
        targetUser = state.users.find(u => u.username === username);
      } else if (state.currentSession) {
        targetUser = state.currentSession;
      }

      // 定义一个内部方法，用于更新单个用户对象的状态
      const updateUserObj = (u) => {
        if (isActive) {
          // 激活：写入 conversationId
          Vue.set(u, 'conversationId', conversationId);

          // 用户端专用：维护路由映射
          if (state.currentUser.userTypeId !== 1) {
            Vue.set(state.conversationToServiceMap, conversationId, u.username);
          }
        } else {
          // 关闭：置空
          Vue.set(u, 'conversationId', null);
          Vue.set(u, 'serviceName', null);
          // 清理映射
          if (state.currentUser.userTypeId !== 1 && conversationId) {
            Vue.delete(state.conversationToServiceMap, conversationId);
          }
        }
      };

      // 2. 更新列表中的用户对象
      if (targetUser) {
        updateUserObj(targetUser);
      }

      // 3. 【核心修复】同步更新 currentSession
      // 如果 currentSession 存在，且它的 ID 或 用户名 与目标一致，但它与 targetUser 不是同一个对象引用
      // 这通常发生在页面刷新后，users 列表重置了，但 currentSession 还是旧引用的情况
      if (state.currentSession && state.currentSession !== targetUser) {
        let isSameId = userId && state.currentSession.id == userId;
        let isSameName = username && state.currentSession.username === username;

        if (isSameId || isSameName) {
          updateUserObj(state.currentSession);
        }
      }
    },
    addMessage(state, msg) {
      if (msg.messageTypeId === 5) {
        const timeoutMsg1 = "当前对话调度人员超时未响应，已为您分配其他调度人员进行支撑。";
        const timeoutMsg2 = "您超时未响应，系统已分配其他调度人员进行支撑。";

        if (msg.content === timeoutMsg1 || msg.content === timeoutMsg2) {
          // 使用 Element UI 的 Notification 进行系统级提醒
          let notify = Notification.warning({
            title: '系统通知',
            message: msg.content,
            duration: 0, // 6秒后自动关闭
            zIndex: 9999,  // 确保在最上层
            onClick: () => {
              // 1. 根据消息中的 conversationId 查找对应的聊天对象
              // msg.conversationId 是后端 sendPrivateSystemMessage 时带上的
              if (msg.conversationId) {
                let targetUser = state.users.find(u => u.conversationId === msg.conversationId);
                if (!targetUser) {
                  // 假设 msg.to 是当前用户，那么 msg.fromName (或 context) 可能是服务号
                  // 或者直接遍历 users，找到那个正在聊天的服务号 (conversationId 不为空的那个)

                  // 策略 A: 找当前 users 里所有 conversationId 不为空的对象
                  // (通常普通用户同时只能和一个客服聊天，所以有 conversationId 的大概率就是它)
                  targetUser = state.users.find(u => u.conversationId);

                  // 策略 B: 如果后端消息里带了服务号的 username (比如 service_1)
                  // 你可以检查 msg 的 extra info，或者根据业务逻辑硬找
                }
                if (targetUser) {
                  // 2. 切换当前会话
                  store.commit('changeCurrentSession', targetUser);
                  // 3. (可选) 如果有路由，确保跳转到聊天页 (视你的路由结构而定)
                  // router.push('/chat');
                } else {
                  console.warn("未找到该会话对应的用户，conversationId:", msg.conversationId);
                }
              }
              // 4. 点击后关闭弹窗
              notify.close();
            }
          });
        }
      }
      // 这里的 msg 已经在 connect 中被修正过 from 了，所以 key 生成是正确的
      let key = state.currentUser.username + "#" + msg.to;
      if (!state.sessions[key]) Vue.set(state.sessions, key, []);
      console.log("这是msg：", msg)
      if (msg.id) {
        let existingMsg = state.sessions[key].find(m => m.id === msg.id);
        if (existingMsg) {
          console.log(" -> 发现已存在消息 (ID相同):", existingMsg);

          // 只有当状态发生变化时才更新
          if (msg.state !== undefined && existingMsg.state !== msg.state) {
            console.log(` -> 【关键】状态更新! 从 ${existingMsg.state} 变为 ${msg.state}`);
            Vue.set(existingMsg, 'state', msg.state);
          } else {
            console.log(` -> 状态未变或无状态字段 (Old: ${existingMsg.state}, New: ${msg.state})`);
          }
          return; // 更新完退出
        }
      } else {
        console.log(" -> 这是一个新消息 (无ID或ID未匹配到)");
      }
      state.sessions[key].push({
        id: msg.id, // 补上 ID
        content: msg.content,
        date: msg.createTime || new Date(),
        fromNickname: msg.fromNickname,
        messageTypeId: msg.messageTypeId,
        self: !msg.notSelf,
        state: msg.state || 0,
        fromProfile: msg.fromProfile,
        conversationId: msg.conversationId,
        score: msg.score
      })
      state.sessions = { ...state.sessions };
      let targetUser = state.users.find(u => u.username === msg.to);
      if (targetUser) Vue.set(targetUser, 'lastMessageTime', msg.createTime || new Date());
    },
    MARK_SESSION_READ(state, readerUsername) {
      let key = state.currentUser.username + "#" + readerUsername;
      if (state.sessions[key]) {
        state.sessions[key].forEach(msg => { if (msg.self) msg.state = 1; });
        Vue.set(state.sessions, key, [...state.sessions[key]]);
      }
    },
    // 【修改】SET_HISTORY_MESSAGES (支持反转、保留、兜底生成)
    SET_HISTORY_MESSAGES(state, { username, messages, prepend = false }) {
      let key = state.currentUser.username + "#" + username;

      // 格式化后端返回的消息
      let formatted = messages.map(m => {
        return {
          id: m.id,
          content: m.content,
          date: m.createTime,
          fromNickname: m.fromName,
          messageTypeId: m.messageTypeId,
          self: m.fromId == state.currentUser.id,
          state: m.state,
          fromProfile: m.fromProfile,
          isLocal: false,
          conversationId: m.conversationId,
          score: m.score
        }
      });

      // --- 场景 A: 上拉加载更多 (拼接到最前面) ---
      if (prepend) {
        if (!state.sessions[key]) {
          Vue.set(state.sessions, key, formatted);
        } else {
          // 【核心修复】去重逻辑
          // 1. 拿到当前页面上已经显示的所有消息 ID
          const existingIds = new Set(state.sessions[key].map(m => m.id));

          // 2. 过滤掉那些“ID已存在”的历史消息
          // (比如刚才刚发的消息，后端还没存好你就拉历史，或者后端分页边界问题)
          const newHistory = formatted.filter(m => !m.id || !existingIds.has(m.id));

          // 3. 安全拼接
          Vue.set(state.sessions, key, [...newHistory, ...state.sessions[key]]);
        }
        return;
      }

      // --- 场景 B: 首次加载/刷新 (覆盖) ---
      // 保持原有逻辑，但也建议加上去重，防止 formatted 内部自己有重复

      let oldSession = state.sessions[key];
      let welcomeMsg = null;
      // 保留本地生成的欢迎语


      // 生成欢迎语逻辑 (保持不变)
      if (state.currentUser.userTypeId !== 1 && username.startsWith('service_')&&!state.currentSession.id  ) {
        if (oldSession && oldSession.length > 0) {
          welcomeMsg = oldSession.find(m => m.isLocal && m.content && m.content.includes('open-service-dialog'));
        }
        let targetUser = state.users.find(u => u.username === username) || state.currentSession;
        if (targetUser && !state.currentSession.id) {
          let nickname = targetUser.nickname || '服务中心';
          let domainId = targetUser.serviceDomainId;
          console.log("场景 B欢迎")
          welcomeMsg = {
            content: `您好，欢迎咨询${nickname}！<br>请点击：<span style="color:#409EFF;cursor:pointer;font-weight:bold;text-decoration:underline;" data-action="open-service-dialog" data-domain-id="${domainId}">【人工服务】</span>，系统将为您分配专属客服。`,
            date: new Date(),
            fromNickname: nickname,
            self: false,
            isLocal: true,
            fromProfile: null
          };
        }
      }

      if (!welcomeMsg) {
        Vue.set(state.sessions, key, formatted);
      } else {
        formatted.push(welcomeMsg);
        Vue.set(state.sessions, key, formatted);
      }
    },
    INIT_USER(state, data) { state.currentUser = data; },
    INIT_USER_LIST(state, data) { state.users = data; },

    RESTORE_RECEPTIONIST(state) {
      // 1. 安全检查
      if (!state.currentSession) return;

      // 2. 清理【当前会话对象】里的临时标记 (这是清理 currentSession 内部)
      Vue.set(state.currentSession, 'id', null);
      Vue.delete(state.currentSession, 'conversationId'); // 清理之前的备份
      Vue.delete(state.currentSession, 'originalServiceId');

      // 3. 还原身份状态
      Vue.set(state.currentSession, 'isReceptionist', true);


      // 5. 关闭聊天激活状态
      state.isChatActive = false;
    },

    // 立即更新当前会话的客服信息
    TRANSFORM_CURRENT_SESSION(state, { userId, serviceId, conversationId, serviceName}) {
      if (state.currentSession) {
        // 1. 更新 ID 为客服的真实 ID
        Vue.set(state.currentSession, 'id', userId);

        // 2. 确保 serviceDomainId 存在 (防止它是旧数据)
        if (!state.currentSession.serviceDomainId) {
          Vue.set(state.currentSession, 'serviceDomainId', serviceId);
        }

        // 4. 其他状态标记
        Vue.set(state.currentSession, 'conversationId', conversationId);
        Vue.set(state.currentSession, 'isReceptionist', false);
        Vue.set(state.currentSession, 'serviceName', serviceName)

        Vue.set(state.conversationToServiceMap, conversationId, state.currentSession.username);
      }
    },
  },
  actions: {
    // src/store/index.js

    initData(context, options = {}) {
      // 1. 直接从 sessionStorage 获取最准确的当前用户字符串
      const userJson = window.sessionStorage.getItem("user");
      if (!userJson) return;

      const userObj = JSON.parse(userJson);
      // 立即更新 state，确保后续逻辑使用的身份是最新且同步的
      context.commit('INIT_USER', userObj);

      // 2. 基于 userObj 进行身份隔离，避免支撑人员进入普通用户分支
      if (userObj.userTypeId === 1) {
        // 支撑人员逻辑
        console.log("[Init] 检测为支撑人员，执行专项初始化");


        reqGetRecentConversation().then(resp => {
          let userList = (resp && (resp.obj || resp)) || [];
          context.commit('INIT_USER_LIST', userList);

          // 加载活跃状态
          reqGetAllActiveSessions().then(res => {
            if (res && res.status === 200) {
              context.commit('INIT_ACTIVE_SESSIONS', res.obj);
            }
          });
        });
      } else {
        // 普通用户逻辑
        console.log("[Init] 检测为普通用户，执行服务域初始化");
        reqGetServiceDomains().then(resp => {
          if (resp && resp.status === 200) {
            let domains = resp.obj || [];
            let domainUsers = domains.map(d => {
              const username = 'service_' + d.id;

              // 【关键修改】从当前 state 或 savedState 中查找是否已存在该用户的会话信息
              const oldUser = context.state.users.find(u => u.username === username);

              return {
                serviceDomainId: d.id,
                username: username,
                nickname: d.name + '中心',
                userProfile: customerServiceAvatar,
                userTypeId: 0,
                isReceptionist: true,
                userStateId: 1,
                // 如果旧对象里有这些 ID，就继承过来，否则设为 null
                conversationId: oldUser ? oldUser.conversationId : null,
                id: oldUser ? oldUser.id : null
              };
            });
            context.commit('INIT_USER_LIST', domainUsers);

            // 只有在没有恢复会话的情况下，才默认选中第一个
            if (context.state.currentSession) {
              const active = domainUsers.find(u => u.username === context.state.currentSession.username);
              if (active) {
                context.state.currentSession = active;
              }
            }
          }
        });
      }

      // 统一连接 WebSocket


      reqGetUnreadSenders().then(resp => {
        if (resp && resp.status === 200 && resp.obj) {
          resp.obj.forEach(senderId => {
            let sender = context.state.users.find(u => u.id === senderId);
            if(sender) Vue.set(context.state.isDot, currentUser.username + "#" + sender.username, true);
          });
        }
      });
      context.dispatch('connect');
    },

    startPrivateChat({ commit, state }, { domainId: domainId, serviceId, serviceName }) {
      // 调用 API (注意 api.js 里参数顺序要对)
      return reqStartPrivateChat(domainId, serviceId).then(resp => {
        if (resp && resp.status === 200) {
          // resp.obj 是 ConversationStartVO
          // 结构: { conversationId: "...", domainId: 1, userId: 123 }
          const data = resp.obj;

          if (data && data.conversationId) {
            commit('TRANSFORM_CURRENT_SESSION', {
              userId: data.userId, // 提取真实客服ID
              serviceId: serviceId,
              conversationId: data.conversationId,
              serviceName: serviceName // 透传前端选的名字
            });

            // 注册会话映射，确保 WS 消息能路由回来
            if (state.currentSession) {
              commit('REGISTER_CONVERSATION_MAPPING', {
                conversationId: data.conversationId,
                serviceUsername: state.currentSession.username
              });

              commit('SET_CHAT_ACTIVE', {
                conversationId: data.conversationId,
                isActive: true,
                username: state.currentSession.username
              });
            }
            return true;
          }
        }
        return false;
      });
    },

    endPrivateChat({ commit, state }) {
      if (!state.currentConversationId) return;
      return reqClosePrivateChat(state.currentConversationId).then(resp => {
        if (resp && resp.status === 200) {
          commit('SET_CHAT_ACTIVE', { conversationId: null, isActive: false, username: state.currentSession.username });
        }
      });
    },

    async loadPrivateHistory({ commit, state }, { toUser, page = 1, size = 20 }) {
      if (!toUser) return 0;

      try {
        let res = null;

        // -------------------------
        // 1. 普通用户逻辑 (User -> Service)
        // -------------------------
        if (state.currentUser.userTypeId !== 1) {
          let domainId = toUser.serviceDomainId;
          if (!domainId) return 0;

          let params = {
            serviceDomainId: domainId,
            page: page,
            size: size
          }
          // 调用接口
          res = await reqGetHistoryMsg(params);
        }

            // -------------------------
            // 2. 客服/管理员逻辑 (Admin -> User)
        // -------------------------
        else {
          if (!toUser.username) return 0;
          let params = {
            toId: toUser.id,
            page: page,
            size: size
          }
          // 调用接口
          res = await reqSupporterGetHistoryMsg(params);
        }

        // -------------------------
        // 3. 处理返回数据 (关键修改点)
        // -------------------------
        // 后端直接返回: RespBean { status: 200, obj: [ ...数组... ] }
        if (res && res.obj) {
          let messages = res.obj;

          // 确保它是数组
          if (Array.isArray(messages)) {
            commit('SET_HISTORY_MESSAGES', {
              username: toUser.username,
              messages: messages,
              prepend: page > 1 // 页码>1 拼接到头部
            });

            // 返回本次加载的条数
            // 组件里的逻辑应改为: if (count < size) isAllLoaded = true;
            return messages.length;
          }
        }

      } catch (e) {
        console.error("加载历史记录异常:", e);
      }
      return 0;
    },

    connect(context) {
      // 防止重复连接导致消息重复
      if (context.state.stomp && context.state.stomp.connected) {
        return;
      }

      let token = (context.state.currentUser || JSON.parse(window.sessionStorage.getItem("user"))).token;
      context.state.stomp = Stomp.over(new SockJS(baseUrl +'/ws/ep'));

      context.state.stomp.connect({ 'Authorization': 'Bearer ' + token }, success => {
        context.state.stomp.subscribe("/topic/notification", msg => {});

        // 当有用户上线/下线时，后端会发消息到这里
        context.state.stomp.subscribe("/topic/userStatus", msg => {
          let statusMsg = JSON.parse(msg.body);
          // statusMsg 结构: { "userId": 1, "userStateId": 1 } (1在线, 2离线)

          // 调用 Mutation 更新用户列表中的状态
          context.commit('UPDATE_USER_STATE', {
            userId: statusMsg.userId,
            userStateId: statusMsg.userStateId
          });
        });

        context.state.stomp.subscribe('/user/queue/chat', msg => {
          let receiveMsg = JSON.parse(msg.body);
          let currentUser = context.state.currentUser;

          if (receiveMsg.from !== currentUser.username) {
            // --- 接收消息逻辑 ---
            let senderUser = context.state.users.find(u => u.username === receiveMsg.from);

            // A. 客服端逻辑：如果是新用户发消息，刷新列表
            if (!senderUser && currentUser.userTypeId === 1) {
              context.dispatch('initData', { silent: true });
            }

            // B. 普通用户逻辑：关键路由映射
            if (currentUser.userTypeId !== 1) {
              let mappedService = null;

              // 1. 优先尝试：通过 conversationId 查找映射 (最准确)
              // 这能解决“打招呼”消息和 START 信号时序不一致的问题
              if (receiveMsg.conversationId) {
                mappedService = context.state.conversationToServiceMap[receiveMsg.conversationId];
              }

              // 2. 兜底策略：如果没找到映射（可能是第一条消息，START信号还没到）
              // 但用户当前正停留在以 'service_' 开头的服务窗口
              // 那么毫无疑问，这条刚才发出来的消息属于当前这个服务
              if (!mappedService && context.state.currentSession && context.state.currentSession.username.startsWith('service_')) {
                mappedService = context.state.currentSession.username;

                // 关键：立即补录映射关系，确保后续消息也能正常接收
                if (receiveMsg.conversationId) {
                  context.commit('REGISTER_CONVERSATION_MAPPING', {
                    conversationId: receiveMsg.conversationId,
                    serviceUsername: mappedService
                  });
                }
              }

              // 3. 执行“路由劫持”
              if (mappedService) {
                receiveMsg.realFromId = receiveMsg.fromId; // 暂时保留 ID 用于回执
                receiveMsg.from = mappedService;           // 修改为虚拟号

                // 强制修正昵称和头像为“当前服务号”的信息
                // 这样无论后端发来的是谁，前端都只显示"服务中心"
                if (context.state.currentSession && context.state.currentSession.username === mappedService) {
                  receiveMsg.fromNickname = context.state.currentSession.nickname;
                  receiveMsg.fromProfile = context.state.currentSession.userProfile;
                }
              }
            }

            let effectiveSender = receiveMsg.from;
            let isChattingWithSender = context.state.currentSession && context.state.currentSession.username === effectiveSender;

            if (!isChattingWithSender) {
              new Audio(notifySound).play().catch(()=>{});

              if (!receiveMsg.messageTypeId || receiveMsg.messageTypeId <= 3) {
                let notification = Notification.info({
                  title: '【' + (receiveMsg.fromNickname || effectiveSender) + '】发来消息',
                  message: receiveMsg.content,
                  position: "top-right",
                  duration: 3000,
                  customClass: 'chat-notification',
                  onClick: () => {
                    // 2. 点击后立即关闭弹窗
                    notification.close();
                    let u = context.state.users.find(u => u.username === effectiveSender);
                    if(u) {
                      context.commit('changeCurrentSession', u);
                      if(u.username !== '群聊') context.dispatch('loadPrivateHistory', { toUser: u, page: 1 });

                      // 4. Mutation: 立即把本地内存中的消息标为已读 (红点消失，状态更新)
                      context.commit('MARK_SESSION_READ', u.username);

                      // 5. WebSocket: 发送回执给对方 (对方界面显示"已读")
                      if (context.state.stomp && context.state.stomp.connected) {
                        context.state.stomp.send("/app/chat/read", {}, JSON.stringify({
                          to: receiveMsg.realFrom || receiveMsg.from,
                          from: currentUser.username,
                          type: 'READ_RECEIPT'
                        }));
                      }
                    }else {
                      // 2. 【关键修复】如果用户不在列表里（极少数情况，如新服务号）
                      // 我们需要手动调用新接口，而不是旧接口
                      if (currentUser.userTypeId !== 1) {
                        // 普通用户：尝试从消息中获取 domainId (如果消息里没带，可能需要后端配合，或者前端无法更新)
                        // 但通常 Notification 是针对 domain 的，receiveMsg.from 已经被改为 service_X
                        // 我们可以尝试解析 service_X 得到 domainId
                        let domainId = null;
                        if (effectiveSender.startsWith('service_')) {
                          domainId = effectiveSender.split('_')[1];
                        }
                        if (domainId) {
                          reqUpdateServiceMsgRead(domainId, receiveMsg.fromId);
                        }
                      } else {
                        // 客服：调用旧接口
                        if (receiveMsg.fromId) reqUpdateMsgRead(receiveMsg.fromId);
                      }
                    }
                  }
                });
              }
              Vue.set(context.state.isDot, currentUser.username + "#" + effectiveSender, true);
            } else {


              if (context.state.stomp && context.state.stomp.connected) {
                context.state.stomp.send("/app/chat/read", {}, JSON.stringify({
                  // 【修改点】：确保发给“真实”的发送者账号。
                  // 如果 receiveMsg 中带了 realFrom（客服真实工号），则优先发给它。
                  to: receiveMsg.realFrom || receiveMsg.from,
                  from: currentUser.username,
                  type: 'READ_RECEIPT'
                }));
              }

              // 解决问题：防止刷新后消息变回未读，或红点状态不同步
              if (currentUser.userTypeId === 1) {
                // 客服端：维持原状 (按用户ID更新)
                if (receiveMsg.fromId) reqUpdateMsgRead(receiveMsg.fromId);
              } else {
                // 普通用户端：调用新接口 (domainId + 真实 staffId)
                let domainId = context.state.currentSession.serviceDomainId;
                let realStaffId = receiveMsg.fromId;

                // 只有当两个参数都有值时才发送
                if (domainId && realStaffId) {
                  reqUpdateServiceMsgRead(domainId, realStaffId);
                }
              }

              if (receiveMsg.messageTypeId !== 7) {
                receiveMsg.state = 1;
              }
            }
          }
          // 3. 标记归属并存入 Store
          let isSelf = false;
          // 优先用 ID 判断，没有 ID 才用 Username
          if (receiveMsg.fromId) {
            isSelf = (receiveMsg.fromId == currentUser.id);
          } else {
            isSelf = (receiveMsg.from === currentUser.username);
          }
          // 3. 标记归属并存入 Store
          if (isSelf) {
            receiveMsg.notSelf = false;
            if (currentUser.userTypeId === 1 && receiveMsg.messageTypeId === 5) {
              // 在当前用户列表中，找到拥有该会话ID的用户
              let targetUser = context.state.users.find(u => u.conversationId === receiveMsg.conversationId);
              if (targetUser) {
                receiveMsg.to = targetUser.username;
                // 可选：为了防止界面上显示头像为客服自己，可以强制修正头像为系统或空
                // receiveMsg.fromProfile = null;
              }
            }
            if (currentUser.userTypeId !== 1) {
              let targetService = null;

              // 【保险 1】尝试通过唯一的会话 ID 查找对应的虚拟服务号
              // 这不受客服人员变更影响，只认会话 ID
              if (receiveMsg.conversationId) {
                targetService = context.state.conversationToServiceMap[receiveMsg.conversationId];
              }

              // 【保险 2】如果查不到（Start 信号晚到），但用户正打开着以 'service_' 开头的窗口
              // 说明这是用户主动发起的咨询，直接归入当前窗口
              if (!targetService && context.state.currentSession && context.state.currentSession.username.startsWith('service_')) {
                targetService = context.state.currentSession.username;
              }

              // 修正目标 ID：把“具体的客服工号”替换为“虚拟服务号”
              if (targetService) {
                receiveMsg.to = targetService;
              }
            }
          } else {
            receiveMsg.notSelf = true;
            // 【关键修复 3】to 必须等于 from (已被篡改为 service_x)
            receiveMsg.to = receiveMsg.from;
          }
          context.commit('addMessage', receiveMsg);
        });

        // 状态订阅 (处理 START/END)
        context.state.stomp.subscribe('/user/queue/chat/status', msg => {
          let payload = JSON.parse(msg.body);
          let current = context.state.currentSession;
          let isUser = context.state.currentUser.userTypeId !== 1; // 判断是否普通用户

          // --- 开启会话 (START) ---
          if (payload.type === 'START') {

            // ===========================
            // 场景A：普通用户正在前台 -> 需要变身
            // ===========================
            if (isUser && current && current.username.startsWith('service_')) {
              // 1. 【关键】只更新 ID 和 会话ID，不更新 username/profile (保持匿名)
              Vue.set(current, 'id', payload.toId); // 更新为真实客服ID
              Vue.set(current, 'conversationId', payload.conversationId);
              Vue.set(current, 'originalServiceId', payload.serviceId);

              // 2. 标记不再是纯接待状态
              Vue.set(current, 'isReceptionist', false);

              // 3. 激活会话状态
              context.commit('SET_CHAT_ACTIVE', { conversationId: payload.conversationId, isActive: true });

              // 4. 加载历史记录 (传入更新后的 current，里面有 serviceDomainId)
              context.dispatch('loadPrivateHistory', {
                toUser: current,
                page: 1
              });

            }

            // ===========================
            // 场景B：客服收到 START -> 自动添加新用户到列表 + 提醒
            // ===========================
            if (!isUser) {
              // 1. 构造新用户对象 (payload.from... 是发起咨询的普通用户)
              let newUser = {
                id: payload.fromId,
                username: payload.fromUsername, // 之前可能写成了 fromUserUsername
                nickname: payload.fromNickname || '新用户', // 之前可能写成了 fromUserNickname
                userProfile: payload.fromProfile || 'https://cube.elemecdn.com/0/88/03b0d39583f48206768a7534e55bcpng.png',
                userTypeId: 0,
                userStateId: 1,
                lastMessageTime: new Date(),
                conversationId: payload.conversationId
              };
              // 2. 【关键】立即注册活跃会话！
              // 只要这一步执行了，state.activeSessions 就不再是空对象 {}
              // 3. 更新列表 (去重 + 置顶)
              let exists = context.state.users.find(u => u.id == newUser.id);
              if (!exists) {
                context.state.users.unshift(newUser);
              } else {
                exists.userStateId = 1;
                // 更新会话ID
                Vue.set(exists, 'conversationId', payload.conversationId);
                // 置顶
                let index = context.state.users.indexOf(exists);
                if (index > -1) {
                  context.state.users.splice(index, 1);
                  context.state.users.unshift(exists);
                }
              }

              // 4. 【关键】如果客服当前正停留在该用户的窗口，立即点亮输入框
              // (解决“看着会话开启了，但输入框还是灰的”的问题)
              if (current && current.id == newUser.id) {
                context.commit('SET_CHAT_ACTIVE', {
                  conversationId: payload.conversationId,
                  isActive: true,
                  userId: newUser.id
                });
              }

              // 5. 播放提示音
              new Audio(notifySound).play().catch(()=>{});
              let notify = Notification.success({
                title: '新服务接入',
                message: `用户【${newUser.nickname}】正在咨询`,
                position: "top-right",
                duration: 0,
                onClick: () => {
                  notify.close();
                  // 点击通知，自动切换并激活
                  let target = context.state.users.find(u => u.id === newUser.id);
                  if (target) context.commit('changeCurrentSession', target);
                }
              });
            }
          }

          if (payload.type === 'READ_RECEIPT') {
            // payload 结构: { type: 'READ_RECEIPT', readerId: 10, readerName: 'admin' }

            if (!isUser) {
              // --- 场景A：我是客服 ---
              // 读我消息的是普通用户，payload.readerName 就是用户的真实用户名
              // 直接调用 Mutation 标记该会话的所有自己发的消息为已读
              context.commit('MARK_SESSION_READ', payload.readerName);
            } else {
              // --- 场景B：我是普通用户 ---
              // 读我消息的是客服 (payload.readerId 是客服真实ID)
              // 但我前端列表里存的是虚拟号 (service_1, service_2)
              // 所以需要通过 readerId 反查出对应的虚拟号
              let targetUsername = null;
              if (context.state.currentSession && context.state.currentSession.id == payload.readerId) {
                targetUsername = context.state.currentSession.username;
              }
              if (targetUsername) {
                // 传入 'service_1'，精准命中
                context.commit('MARK_SESSION_READ', targetUsername);
              }
            }
          }
          // --- 结束会话 (END) ---
          if (payload.type === 'END') {
            // 客服端：payload.fromId 是普通用户 ID
            // 用户端：payload.toId 是客服 ID
            let targetId = isUser ? payload.toId : payload.fromId;

            // 统一使用 SET_CHAT_ACTIVE 关闭 (传入 userId)
            context.commit('SET_CHAT_ACTIVE', {
              conversationId: null,
              isActive: false,
              userId: targetId
            });

            if (isUser) {
              context.commit('RESTORE_RECEPTIONIST');
              Notification.warning({ title: '系统通知', message: '本次人工服务已结束' });

              // 获取当前重置后的会话对象 (service_X)
              let current = context.state.currentSession;

              if (current && current.username.startsWith('service_')) {
                let key = context.state.currentUser.username + "#" + current.username;
                if (!context.state.sessions[key]) Vue.set(context.state.sessions, key, []);

                let nickname = current.nickname || '服务中心';
                let domainId = current.serviceDomainId;

                if (domainId) {
                  context.state.sessions[key].push({
                    // 这里完全复用最初的欢迎语格式
                    content: `您好，欢迎咨询${nickname}！<br>请点击：<span style="color:#409EFF;cursor:pointer;font-weight:bold;text-decoration:underline;" data-action="open-service-dialog" data-domain-id="${domainId}">【人工服务】</span>，系统将为您分配专属客服。`,
                    date: new Date(),
                    fromNickname: nickname, // 发送人显示为“一类服务中心”
                    self: false,
                    isLocal: true, // 标记为本地消息
                    fromProfile: null
                  });
                }
              }
            }
          }
        });
      }, error => {})
    },
    disconnect(context) {
      if (context.state.stomp) context.state.stomp.disconnect();
    }
  }
})

export default store;
