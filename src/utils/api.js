import axios from 'axios';
import { Message } from 'element-ui';
import router from '../router';

// 请求拦截器
axios.interceptors.request.use(config => {
  // 根据请求路径判断是【管理员】还是【普通用户】
  if (config.url.startsWith('/admin')) {
    // --- 管理员请求处理 ---
    let adminStr = window.sessionStorage.getItem("admin");
    if (adminStr) {
      let admin = JSON.parse(adminStr);
      if (admin.token) {
        // 对应 JwtTokenAdminInterceptor.java 的校验逻辑
        config.headers['Authorization'] = 'Bearer ' + admin.token;
      }
    }
  } else {
    // --- 普通用户请求处理 ---
    let userStr = window.sessionStorage.getItem("user");
    if (userStr) {
      let user = JSON.parse(userStr);
      if (user.token) {
        config.headers['Authorization'] = 'Bearer ' + user.token;
      }
    }
  }
  return config;
}, error => {
  console.log(error);
});


// 响应拦截器 【核心修改部分】
axios.interceptors.response.use(success => {
  // 1. HTTP 状态码为 200，但业务逻辑可能报错
  if (success.status && success.status === 200) {

    // 【修改点 1】: code -> status, message -> msg
    // --- 针对业务逻辑上的 Token 过期 (Status 401) ---
    if (success.data.status === 401) {
      Message.error({ message: success.data.msg || '登录已过期，请重新登录' });
      // 清除缓存
      window.sessionStorage.removeItem("user");
      window.sessionStorage.removeItem("admin");
      window.localStorage.removeItem("user");
      window.localStorage.removeItem("admin");
      // 强制跳转
      router.replace('/');
      return;
    }

    // 【修改点 2】: code -> status, message -> msg
    // 其他业务错误 (500, 403)
    if (success.data.status === 500 || success.data.status === 403) {
      Message.error({ message: success.data.msg || '操作失败' });
      return;
    }

    // 【修改点 3】: message -> msg
    // 操作成功
    if (success.data.msg) {
      Message.success({ message: success.data.msg });
    }
  }
  return success.data;
}, error => {
  // 2. HTTP 状态码错误处理 (Axios 捕获到的 HTTP 异常)
  if (error.response) {
    let status = error.response.status;

    if (status === 504 || status === 404) {
      Message.error({ message: '服务器被吃了( ╯□╰ )' });
    } else if (status === 403) {
      Message.error({ message: '权限不足，请联系管理员' });
    } else if (status === 401) {
      Message.error({ message: '认证失效，请重新登录' });
      window.sessionStorage.removeItem("user");
      window.sessionStorage.removeItem("admin");
      window.localStorage.removeItem("user");
      window.localStorage.removeItem("admin");
      router.replace('/');
    } else {
      // 【修改点 4】: message -> msg (防止后端报错返回结构也是 msg)
      if (error.response.data && error.response.data.msg) {
        Message.error({ message: error.response.data.msg });
      } else {
        Message.error({ message: '未知错误!' });
      }
    }
  } else {
    Message.error({ message: '网络连接失败，请检查网络' });
  }
  return;
});

let base = '';

// 基础常量导出
export const uploadUrl = '/user/ossFileUpload'; // 头像上传地址
export const publicAvatarUploadUrl = '/user/public/uploadAvatar';
// 通用请求方法
export const postRequest = (url, params) => {
  return axios({
    method: 'post',
    url: `${base}${url}`,
    data: params
  });
};

export const putRequest = (url, params) => {
  return axios({
    method: 'put',
    url: `${base}${url}`,
    data: params
  });
};

export const getRequest = (url, params) => {
  return axios({
    method: 'get',
    url: `${base}${url}`,
    params: params
  });
};

export const deleteRequest = (url, params) => {
  return axios({
    method: 'delete',
    url: `${base}${url}`,
    params: params
  });
};

// --- 业务接口封装 ---

// 1. 登录与注册
export const reqLogin = (params) => postRequest('/user/login', params);
export const reqUserLogin = (params) => postRequest('/user/login', params);
export const reqUserRegister = (params) => postRequest('/user/register', params);

// 验证相关
export const reqVerifyCode = () => getRequest('/verifyCode');
export const reqGetMailVerifyCode = () => getRequest('/mailVerifyCode');
export const reqCheckUsername = (username) => getRequest('/user/checkUsername', { username });
export const reqCheckNickname = (nickname) => getRequest('/user/checkNickname', { nickname });

export const reqLogout = () => getRequest('/login/logout');

// 2. 管理员相关
export const reqAdminLogin = (params) => postRequest('/admin/login', params);
export const reqAdminLogout = () => getRequest('/admin/logout');


// 3. 用户管理
export const reqGetAllUsersByPage = (params) => getRequest('/admin/getAllUserByPage', params);
export const reqUpdateUserStatus = (params) => putRequest(`/admin/changeLockedStatus?id=${id}&isLocked=${isLocked}`, params);
export const reqDeleteUser = (id) => deleteRequest(`/admin/${id}`);
export const reqDeleteUserByIds = (params) => deleteRequest('/admin/', params);

// 4. 个人信息
export const reqGetCurrentUser = () => getRequest('/user/current');
export const reqUpdateUserInfo = (params) => putRequest('/user/current', params);
export const reqUpdatePassword = (params) => putRequest('/user/pass', params);
export const reqSearchFriends = (params) => getRequest('/user/', params);

// 5. 群聊消息管理
export const reqGetGroupMsgLogs = (params) => getRequest('/admin/GroupMsgContent/getAllGroupMsgContentByPage', params);
export const reqDeleteGroupMsgById = (id) => deleteRequest(`/admin/GroupMsgContent/deleteGroupMsgContentById/${id}`);
export const reqDeleteGroupMsgByIds = (params) => deleteRequest('/admin/GroupMsgContent/deleteGroupMsgContentByIds', params);

// 6. 聊天相关
export const reqGetChatUsers = () => getRequest('/user/chat/getUsersWithoutCurrentUser');

// 注意：后端使用 @RequestParam，为了稳妥，我们这里直接拼接到URL上，或者使用 params 对象
export const reqStartPrivateChat = (toId) => postRequest(`/user/private/start?toId=${toId}`);
export const reqClosePrivateChat = (conversationId) => postRequest(`/user/private/close?conversationId=${conversationId}`);
export const reqGetPrivateChatHistory = (toId) => getRequest('/user/private/history', { toId });
export const reqGetPrivateChatStatus = (toId) => getRequest('/user/private/status', { toId });
export const reqGetAllActiveSessions = () => getRequest('/user/private/active_sessions');
// 7. 文件上传
export const reqUploadFile = (params) => postRequest('/user/file', params);
export const reqOssFileUpload = (params) => postRequest('/user/ossFileUpload', params);
// 8. 其他
export const reqGetUserState = (id) => getRequest('/user/userState/selectOne', { id });
export const reqSendFeedback = (params) => postRequest('/user/mail/feedback', params);
export const reqGetPrivateMsgLogs = (params) => getRequest('/admin/privateMsg/list', params);
