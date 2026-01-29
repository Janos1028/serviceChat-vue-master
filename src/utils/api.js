import axios from 'axios';
import {Message} from 'element-ui';
import router from '../router';

export const baseUrl = process.env.VUE_APP_API_BASE_URL || 'http://120.55.5.60:9090';

axios.defaults.baseURL = baseUrl; // 设置 axios 默认前缀
axios.defaults.withCredentials = true;
let isReloginMessageShown = false;

// 【新增】统一的重置状态与跳转方法
const resetLoginState = () => {
    // 1. 清除所有相关的缓存
    window.sessionStorage.removeItem("user");
    window.sessionStorage.removeItem("admin");
    window.sessionStorage.removeItem("state");
    window.localStorage.removeItem("user");
    window.localStorage.removeItem("admin");

    // 2. 强制刷新页面跳转 (比 router.replace 更彻底，能清空内存中的 Vuex)
    window.location.href = '/';
};

// 请求拦截器
axios.interceptors.request.use(config => {
    if (config.url.startsWith('/admin')) {
        let adminStr = window.sessionStorage.getItem("admin");
        if (adminStr) {
            let admin = JSON.parse(adminStr);
            if (admin.token) config.headers['Authorization'] = 'Bearer ' + admin.token;
        }
    } else {
        let userStr = window.sessionStorage.getItem("user");
        if (userStr) {
            let user = JSON.parse(userStr);
            if (user.token) config.headers['Authorization'] = 'Bearer ' + user.token;
        }
    }
    return config;
}, error => {
    console.log(error);
});

// 响应拦截器
axios.interceptors.response.use(success => {
    if (success.status && success.status === 200) {
        const requestUrl = success.config.url;
        const isSilentRequest = requestUrl.includes('/checkUsername') || requestUrl.includes('/checkNickname');

        // --- 业务逻辑 Token 过期 (Status 401) ---
        if (success.data.status === 401) {
            // 【修复】加锁，只弹一次窗，只执行一次清理
            if (!isReloginMessageShown) {
                isReloginMessageShown = true;
                Message.error({message: success.data.msg || '登录已过期，请重新登录'});
                resetLoginState();
            }
            return;
        }

        if (success.data.status === 500 || success.data.status === 403) {
            if (!isSilentRequest) {
                Message.error({message: success.data.msg || '操作失败'});
                return;
            }
        }

        if (success.data.msg) {
            if (!isSilentRequest) {
                Message.success({message: success.data.msg});
            }
        }
    }
    return success.data;
}, error => {
    if (error.response) {
        let status = error.response.status;

        if (status === 504 || status === 404) {
            Message.error({message: '服务器被吃了( ╯□╰ )'});
        } else if (status === 403) {
            Message.error({message: '权限不足，请联系管理员'});
        } else if (status === 401) {
            // 【修复】HTTP 401 错误也加锁处理
            if (!isReloginMessageShown) {
                isReloginMessageShown = true;
                Message.error({message: '认证失效，请重新登录'});
                resetLoginState();
            }
        } else {
            if (error.response.data) {
                const errorMsg = error.response.data.msg || error.response.data.message;
                if (errorMsg) {
                    Message.error({message: errorMsg});
                } else {
                    Message.error({message: '未知错误!'});
                }
            } else {
                Message.error({message: '未知错误!'});
            }
        }
    } else {
        Message.error({message: '网络连接失败，请检查网络'});
    }
    return;
});

let base = process.env.VUE_APP_API_BASE_URL || 'http://120.55.5.60:9090'

// 基础常量导出
export const uploadUrl = baseUrl + '/user/ossFileUpload'; // 头像上传地址
export const publicAvatarUploadUrl = baseUrl + '/user/public/uploadAvatar';
// 通用请求方法
export const postRequest = (url, params) => {
    return axios({
        method: 'post',
        url: `${baseUrl}${url}`,
        data: params
    });
};

export const putRequest = (url, params) => {
    return axios({
        method: 'put',
        url: `${baseUrl}${url}`,
        data: params
    });
};

export const getRequest = (url, params) => {
    return axios({
        method: 'get',
        url: `${baseUrl}${url}`,
        params: params
    });
};

export const deleteRequest = (url, params) => {
    return axios({
        method: 'delete',
        url: `${baseUrl}${url}`,
        params: params
    });
};

// --- 业务接口封装 ---

// 1. 登录与注册
export const reqUserLogin = (params) => postRequest('/user/login', params);
export const reqUserRegister = (params) => postRequest('/user/register', params);
export const reqUserLogout = () => getRequest('/user/logout');
// 验证相关
export const reqVerifyCode = () => getRequest('/verifyCode');
export const reqGetMailVerifyCode = () => getRequest('/mailVerifyCode');
export const reqCheckUsername = (username) => getRequest('/user/checkUsername', {username});
export const reqCheckNickname = (nickname) => getRequest('/user/checkNickname', {nickname});

export const reqLogout = () => getRequest('/login/logout');

// 2. 管理员相关
export const reqAdminLogin = (params) => postRequest('/admin/login', params);
export const reqAdminLogout = () => getRequest('/admin/logout');


// 3. 用户管理
export const reqGetAllUsersByPage = (params) => getRequest('/admin/getAllUserByPage', params);
export const reqUpdateUserStatus = (params) => putRequest(`/admin/changeLockedStatus?id=${id}&isLocked=${isLocked}`, params);
export const reqDeleteUser = (id) => deleteRequest(`/admin/${id}`);
export const reqDeleteUserByIds = (params) => deleteRequest('/admin/', params);

export const reqChangeUserState = (stateId) => postRequest(`/user/supporter/changeUserState?stateId=${stateId}`);
export const reqGetCard = () => getRequest(`/user/getCard`);
// 5. 群聊消息管理
export const reqGetGroupMsgLogs = (params) => getRequest('/admin/GroupMsgContent/getAllGroupMsgContentByPage', params);
export const reqDeleteGroupMsgById = (id) => deleteRequest(`/admin/GroupMsgContent/deleteGroupMsgContentById/${id}`);
export const reqDeleteGroupMsgByIds = (params) => deleteRequest('/admin/GroupMsgContent/deleteGroupMsgContentByIds', params);

// 6. 聊天相关
export const reqGetRecentConversation = () => getRequest('/user/chat/getRecentConversation');
export const reqGetSupportServiceCategories = (domainId) => getRequest('/user/chat/getSupportServiceCategories', {domainId});
export const reqGetServiceDomains = () => getRequest('/user/chat/getServiceDomains');
// 注意：后端使用 @RequestParam，为了稳妥，我们这里直接拼接到URL上，或者使用 params 对象
export const reqClosePrivateChat = (conversationId,messageId) => postRequest(`/user/private/close?conversationId=${conversationId}&messageId=${messageId}`);
export const reqSupporterGetHistoryMsg = (params) => getRequest('/user/private/supporterGetHistoryMsg', params);
export const reqGetHistoryMsg = (params) => getRequest('/user/private/getHistoryMsg', params);
// export const reqGetPrivateChatStatus = (toId) => getRequest('/user/private/status', {toId});
export const reqGetAllActiveSessions = () => getRequest('/user/private/active_sessions');
// 获取发送了未读消息的用户ID列表 (用于登录初始化红点)
export const reqGetUnreadSenders = () => getRequest('/user/private/getUnreadSenders');
// 更新已读了某人的消息
export const reqUpdateMsgRead = (fromId) => postRequest(`/user/private/updateMsgStateToRead?fromId=${fromId}`);
// 开启人工服务会话
export const reqStartPrivateChat = (domainId, serviceId) => postRequest(`/user/private/start?domainId=${domainId}&serviceId=${serviceId}`);
// 客服请求结束会话（发起确认申请，状态转为3）
export const reqRequestClosePrivateChat = (conversationId,isActive) => postRequest(`/user/private/requestClose?conversationId=${conversationId}&isActive=${isActive}`);
// 用户点击“未解决”（恢复会话，状态转为1）
export const reqConfirmUnsolved = (conversationId,messageId) => postRequest(`/user/private/confirmUnsolved?conversationId=${conversationId}&messageId=${messageId}`);
export const reqUpdateServiceMsgRead = (domainId, staffId) => {
    let url = `/user/private/updateServiceMsgRead?domainId=${domainId}`;
    if (staffId) {
        url += `&staffId=${staffId}`;
    }
    return postRequest(url);
};
// 转接支撑人员
export const reqTransferChat = (conversationId, newServiceId, domainId) => {
    return postRequest(`/user/private/transfer?conversationId=${conversationId}&newServiceId=${newServiceId}&domainId=${domainId}`);
}
export const reqSubmitScore = (conversationId, score) => {
    return postRequest(`/user/private/submitScore?conversationId=${conversationId}&score=${score}`);
}
// 7. 文件上传
export const reqUploadFile = (params) => postRequest('/user/file', params);
export const reqOssFileUpload = (params) => postRequest('/user/ossFileUpload', params);
// 8. 其他

export const reqGetPrivateMsgLogs = (params) => getRequest('/admin/privateMsg/list', params);
