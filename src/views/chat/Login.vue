<template>
  <div class="login-page">
    <div class="bg-decoration-circle"></div>

    <el-button
        class="admin-link-btn"
        @click="gotoAdminLogin"
        icon="el-icon-s-tools"
        circle
        title="管理端登录"
    ></el-button>

    <div class="login-card">
      <div class="login-header">
        <h3 class="login-title">支撑服务平台 </h3>
        <p class="login-subtitle">欢迎回来，请登录您的账户</p>
      </div>

      <el-form ref="loginForm" :rules="rules" :model="loginForm" class="login-form">
        <el-form-item prop="username">
          <el-input
              type="text"
              v-model="loginForm.username"
              auto-complete="off"
              placeholder="用户名"
              prefix-icon="el-icon-user"
          ></el-input>
        </el-form-item>

        <el-form-item prop="password">
          <el-input
              type="password"
              v-model="loginForm.password"
              auto-complete="off"
              placeholder="密码"
              prefix-icon="el-icon-lock"
              show-password
          ></el-input>
        </el-form-item>

        <el-form-item prop="code">
          <div class="verify-wrapper">
            <el-input
                type="text"
                @keydown.enter.native="submitLogin"
                v-model="loginForm.code"
                auto-complete="off"
                placeholder="验证码"
                prefix-icon="el-icon-key"
                class="verify-input"
            ></el-input>
            <img
                :src="verifyCodeImgUrl"
                title="点击切换验证码"
                @click="getVerifyCode"
                class="verify-img"
            />
          </div>
        </el-form-item>

        <div class="remember-me">
          <el-checkbox
              v-model="checked"
              :class="{ 'is-checked': checked }"
          >
            自动登录 (7天)
          </el-checkbox>
        </div>

        <div class="action-buttons">
          <el-button
              type="primary"
              class="submit-btn"
              @click="submitLogin"
              :loading="fullscreenLoading"
              round
          >立即登录</el-button>

          <el-button
              class="register-btn"
              @click="showRegistryDialog"
              type="text"
          >注册新账号</el-button>
        </div>
      </el-form>
    </div>

    <el-dialog
        title="新用户注册"
        :before-close="closeRegisterDialog"
        :visible.sync="registerDialogVisible"
        :close-on-click-modal="false"
        width="380px"
        custom-class="custom-dialog"
        append-to-body
        center
    >
      <el-form :model="registerForm" status-icon :rules="registerRules" ref="registerForm" class="register-form">
        <el-form-item prop="nickname">
          <el-input v-model="registerForm.nickname" autocomplete="off" placeholder="昵称" prefix-icon="el-icon-star-off"></el-input>
        </el-form-item>
        <el-form-item prop="username">
          <el-input v-model="registerForm.username" autocomplete="off" placeholder="登录用户名" prefix-icon="el-icon-user"></el-input>
        </el-form-item>
        <el-form-item prop="password">
          <el-input type="password" v-model="registerForm.password" autocomplete="off" placeholder="密码" prefix-icon="el-icon-lock"></el-input>
        </el-form-item>
        <el-form-item prop="checkPass">
          <el-input type="password" v-model="registerForm.checkPass" autocomplete="off" placeholder="确认密码" prefix-icon="el-icon-lock"></el-input>
        </el-form-item>

        <el-form-item label="是否为支撑人员" prop="userTypeId" class="user-type-item">
          <el-radio-group v-model="registerForm.userTypeId">
            <el-radio :label="1">是</el-radio>
            <el-radio :label="0">否</el-radio>
          </el-radio-group>
        </el-form-item>

        <template v-if="registerForm.userTypeId === 1">

          <el-form-item
              label="所属服务域"
              prop="serviceDomainId"
              class="user-type-item"
              :rules="[{ required: true, message: '请选择服务域', trigger: 'change' }]"
          >
            <el-select
                v-model="registerForm.serviceDomainId"
                class="custom-register-select"
                placeholder="请选择服务域"
                style="width: 100%"
                @change="handleDomainChange"
            >
              <el-option
                  v-for="item in serviceDomains"
                  :key="item.id"
                  :label="item.name"
                  :value="item.id">
              </el-option>
            </el-select>
          </el-form-item>

          <el-form-item
              label="支撑服务类型"
              prop="serviceIds"
              class="user-type-item"
              :rules="[{ required: true, message: '请选择服务类型', trigger: 'change' }]"
          >
            <el-select
                v-model="registerForm.serviceIds"
                multiple
                class="limit-tags-select"
                popper-class="limit-dropdown"
                placeholder="请选择具体服务(可多选)"
                style="width: 100%"
                :disabled="!registerForm.serviceDomainId"
            >
              <el-option
                  v-for="item in supportServices"
                  :key="item.id"
                  :label="item.name"
                  :value="item.id">
              </el-option>
            </el-select>
          </el-form-item>
        </template>

        <el-form-item label="头像设置" class="avatar-form-item">
          <div class="avatar-selection">
            <div
                class="avatar-preview-wrapper"
                @click="!avatarLoading && refreshRandomAvatar()"
                title="点击换一个随机头像"
            >
              <img :src="registerForm.userProfile" class="avatar-preview-img">

              <div class="avatar-loading-overlay" v-if="avatarLoading">
                <i class="el-icon-loading"></i>
              </div>

              <div class="avatar-refresh-overlay" v-else>
                <i class="el-icon-refresh"></i>
              </div>
            </div>

            <el-upload
                class="avatar-uploader-mini"
                :action="uploadUrl"
                ref="upload"
                :class="{disabled:uploadDisabled}"
                :before-upload="beforeAvatarUpload"
                :on-success="imgSuccess"
                :on-error="imgError"
                :show-file-list="false"
                :disabled="avatarLoading"
            >
              <el-button size="small" type="primary" plain round :loading="avatarLoading">
                {{ avatarLoading ? '上传中...' : '上传自定义图片' }}
              </el-button>
            </el-upload>
          </div>
          <p class="avatar-tip">点击头像可随机切换，或点击按钮上传</p>
        </el-form-item>
      </el-form>
      <div slot="footer" class="dialog-footer">
        <el-button
            type="primary"
            @click="submitRegisterForm('registerForm')"
            class="full-width-btn"
            round
            :disabled="avatarLoading"
        >立即注册</el-button>
      </div>
    </el-dialog>

  </div>
</template>

<script>
import axios from 'axios';
// 引入 publicAvatarUploadUrl
import {
  reqUserLogin,
  reqUserRegister,
  reqCheckUsername,
  reqCheckNickname,
  publicAvatarUploadUrl,
  baseUrl, reqGetServiceDomains, reqGetSupportServiceCategories
} from '../../utils/api';

export default {
  name: "Login",
  data(){
    var validateNickname = (rule, value, callback) => {
      if (value === '') {
        return callback(new Error('请输入昵称'));
      }
      reqCheckNickname(value).then(resp => {
        // 只有明确返回 200 且 数量为0 时，才算通过
        if (resp && resp.status == 200 && resp.obj == 0) {
          callback();
        } else {
          // 其他情况（包括 resp.obj > 0 或者 status != 200）都提示已被注册
          // 这里的文字对应的是“昵称”框
          callback(new Error("该昵称已被注册"));
        }
      }).catch(e => {
        // 网络完全不通时，保留网络错误的提示比较合理，或者你也想改成已注册？
        // 通常这里保留“网络异常”更方便排查，如果想强行统一，也可以改成 callback(new Error("该昵称已被注册"));
        callback(new Error("网络请求超时或异常"));
      });
    };

    var validateUsername = (rule, value, callback) => {
      if (value === '') {
        return callback(new Error('请输入用户名'));
      }
      reqCheckUsername(value).then(resp => {
        // 只有明确返回 200 且 数量为0 时，才算通过
        if (resp && resp.status == 200 && resp.obj == 0) {
          callback();
        } else {
          // 其他情况统统提示用户名已被注册
          callback(new Error('该用户名已被注册'));
        }
      }).catch(e => {
        callback(new Error("网络请求超时或异常"));
      });
    };
    var validatePass = (rule, value, callback) => {
      if (value === '') {
        callback(new Error('请输入密码'));
      } else {
        if (this.registerForm.checkPass !== '') {
          this.$refs.registerForm.validateField('checkPass');
        }
        callback();
      }
    };
    var validatePass2 = (rule, value, callback) => {
      if (value === '') {
        callback(new Error('请再次输入密码'));
      } else if (value !== this.registerForm.password) {
        callback(new Error('两次输入密码不一致!'));
      } else {
        callback();
      }
    };
    return{
      // 使用新的安全接口
      uploadUrl: publicAvatarUploadUrl,
      serviceDomains: [],
      supportServices: [],
      loginForm:{
        username:'',
        password:'',
        code:'',
        verifyKey: ''
      },
      verifyCodeImgUrl: '',
      checked:false,
      rules: {
        username:[{required:true,message:'请输入用户名',trigger:'blur'}],
        password:[{required:true,message: '请输入密码',trigger:'blur'}],
        code:[{required:true,message: '请输入验证码',trigger:'blur'}]
      },
      fullscreenLoading:false,
      registerDialogVisible:false,
      formLabelWidth: '120px',
      registerForm:{
        nickname:'',
        username:'',
        password:'',
        checkPass:'',
        userTypeId: 0,
        userProfile: this.getRandomAvatar(),
      },
      serviceDomainId: null,
      serviceIds: [],
      registerRules: {
        nickname: [
          { validator: validateNickname, trigger: 'blur' }
        ],
        username: [
          { validator: validateUsername, trigger: 'blur' }
        ],
        password: [
          { validator: validatePass, trigger: 'blur' }
        ],
        checkPass: [
          { validator: validatePass2, trigger: 'blur' }
        ],
      },
      uploadDisabled:false,
      avatarLoading: false, // 控制加载状态
      fileList:[],
    };
  },
  watch: {
    'registerForm.userTypeId': function(val) {
      if (val === 1 && this.serviceDomains.length === 0) {
        this.loadServiceDomains();
      }
    }
  },
  mounted() {
    // 页面加载时获取第一次验证码
    this.getVerifyCode();
    this.$store.commit('RESET_STATE');
    window.sessionStorage.removeItem("state");
  },
  methods:{
    loadServiceDomains() {
      reqGetServiceDomains().then(resp => {
        if (resp && resp.status === 200) {
          this.serviceDomains = resp.obj;
        }
      });
    },

    handleDomainChange(domainId) {
      // 1. 清空已选的具体服务，防止数据错乱
      this.registerForm.serviceIds = [];
      this.supportServices = [];

      // 2. 如果选中了有效域，去后台拉取该域下的服务类型
      if (domainId) {
        reqGetSupportServiceCategories(domainId).then(resp => {
          if (resp && resp.status === 200) {
            this.supportServices = resp.obj;
          }
        });
      }
    },
    getRandomAvatar() {
      const seed = Math.random().toString(36).substring(7);
      return `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`;
    },
    refreshRandomAvatar() {
      this.registerForm.userProfile = this.getRandomAvatar();
    },
    getVerifyCode() {
      // 【修改点】使用 axios.create() 创建一个新实例，绕过 api.js 中的全局拦截器
      // 否则拦截器会把 headers 过滤掉，只返回 data
      const newAxios = axios.create();

      newAxios.get(baseUrl + '/verifyCode', {
        responseType: 'blob', // 关键：告诉 axios 返回的是二进制文件
        withCredentials: true // 保持跨域凭证设置
      }).then(resp => {
        // 现在 resp 是完整的响应对象，包含 status, headers, data 等

        // 1. 从响应头中获取 Verify-Key
        // 注意：axios 拿到的 headers key 默认是小写
        const key = resp.headers['verify-key'];

        if (key) {
          this.loginForm.verifyKey = key;
        } else {
          console.warn("未获取到 Verify-Key，请检查后端是否配置了 Access-Control-Expose-Headers: Verify-Key");
        }

        // 2. 将二进制图片数据 (resp.data) 转换为浏览器可识别的 URL
        if (this.verifyCodeImgUrl) {
          window.URL.revokeObjectURL(this.verifyCodeImgUrl);
        }
        this.verifyCodeImgUrl = window.URL.createObjectURL(resp.data);
      }).catch(err => {
        this.$message.error('验证码获取失败');
        console.error(err);
      });
    },
    changeverifyCode() {
      this.getVerifyCode();
    },

    submitLogin() {
      this.$refs.loginForm.validate((valid) => {
        if (valid) {
          this.fullscreenLoading = true;

          // reqUserLogin 发送时，loginForm 里已经包含了 verifyKey
          // 所以这里不需要改动，verifyKey 会自动随表单发送
          reqUserLogin(this.loginForm).then(resp => {
            this.fullscreenLoading = false;
            if (resp && resp.status == 200 && resp.obj) {
              // ... 登录成功的逻辑保持不变 ...
              this.$store.state.currentUser = resp.obj;
              window.sessionStorage.setItem("user", JSON.stringify(resp.obj));

              if (this.checked) {
                window.localStorage.setItem("user", JSON.stringify(resp.obj));
              } else {
                window.localStorage.removeItem("user");
              }

              let path = this.$route.query.redirect;
              this.$router.replace((path == '/' || path == undefined) ? "/chatroom" : path);
            } else {
              // 登录失败（如验证码错误），刷新验证码
              this.getVerifyCode();
            }
          }).catch(() => {
            this.fullscreenLoading = false;
            // 异常也刷新验证码
            this.getVerifyCode();
          });
        } else {
          return false;
        }
      });
    },
    gotoAdminLogin(){
      this.$router.replace("/adminlogin");
    },
    showRegistryDialog(){
      this.registerForm.userProfile = this.getRandomAvatar();
      this.registerDialogVisible=true;
    },

    // 上传前校验与 Loading 开启
    beforeAvatarUpload(file) {
      let isLt4M = file.size / 1024 / 1024 < 4;
      if (!isLt4M) {
        this.$message.error('上传头像图片大小不能超过 4MB!');
        return false;
      }
      this.avatarLoading = true;
      this.uploadDisabled = true;
      return true;
    },

    // 进度条（可选，el-upload内部有处理，这里主要用于防止重复提交）
    onProgress(event, file, fileList){
      this.uploadDisabled = true;
    },

    // 上传成功回调
    imgSuccess(response, file, fileList) {
      this.avatarLoading = false;
      this.uploadDisabled = false;

      if (response && response.status === 200) {
        this.registerForm.userProfile = response.obj;

        // 【修改点】优先使用后端返回的 msg，如果没有再显示默认文字
        // 注意：这里必须手动调用 this.$message，因为 el-upload 不走全局拦截器
        if (response.msg) {
          this.$message.success(response.msg);
        }
      } else {
        // 同理，错误提示也优先用后端的
        this.$message.error(response.msg || "上传失败");
      }
    },

    // 上传失败回调
    imgError(err, file, fileList){
      this.avatarLoading = false;
      this.uploadDisabled = false;
      this.$message.error("网络错误，上传失败");
    },

    closeRegisterDialog(done){
      this.registerForm={
        nickname:'',
        username:'',
        password:'',
        checkPass:'',
        userTypeId: 0,
        userProfile: this.getRandomAvatar(),
        serviceDomainId: null,
        serviceIds: []
      };
      // 重置状态
      this.serviceDomains = [];
      this.supportServices = [];

      this.avatarLoading = false;
      this.uploadDisabled = false;
      done();
    },

    submitRegisterForm(formName) {
      this.$refs[formName].validate((valid) => {
        // 1. 额外的逻辑校验：如果是支撑人员，必须选这两项
        if (this.registerForm.userTypeId === 1) {
          if (!this.registerForm.serviceDomainId) {
            this.$message.warning("支撑人员请选择所属服务域");
            return false;
          }
          if (!this.registerForm.serviceIds || this.registerForm.serviceIds.length === 0) {
            this.$message.warning("请至少选择一项支撑服务类型");
            return false;
          }
        }

        if (valid) {
          reqUserRegister(this.registerForm).then(resp=>{
            if (resp && resp.status == 200){
              this.registerDialogVisible=false;
            }
          })
        } else {
          this.$message.error("请正确填写信息！");
          return false;
        }
      });
    },

  }
}
</script>

<style lang="scss" scoped>
/* 蓝色主题配色方案
  - 背景：清新的天蓝渐变
  - 主色：#409EFF (Element Blue)
  - 深色强调：#044eba (Deep Blue，匹配 List 选中态)
*/

.login-page {
  height: 100vh;
  width: 100vw;
  display: flex;
  justify-content: center;
  align-items: center;
  /* 修改：改为清爽的蓝色渐变 */
  background: linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%);
  position: relative;
  overflow: hidden;
}

.bg-decoration-circle {
  position: absolute;
  top: -100px;
  right: -100px;
  width: 600px;
  height: 600px;
  /* 修改：改为蓝色光晕 */
  background: radial-gradient(circle, rgba(56, 189, 248, 0.2) 0%, rgba(255, 255, 255, 0) 70%);
  border-radius: 50%;
  pointer-events: none;
}

.login-card {
  width: 380px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border-radius: 20px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  padding: 40px 35px;
  box-sizing: border-box;
  z-index: 10;
  transition: transform 0.3s ease;
}

.login-card:hover {
  transform: translateY(-5px);
}

.login-header {
  text-align: center;
  margin-bottom: 35px;
}

.login-title {
  margin: 0;
  font-size: 28px;
  /* 修改：使用深蓝色，更显专业 */
  color: #044eba;
  font-weight: 700;
  letter-spacing: 1px;
}

.login-subtitle {
  margin-top: 10px;
  color: #6b7280;
  font-size: 14px;
}

::v-deep .el-input__inner {
  border-radius: 25px;
  height: 45px;
  line-height: 45px;
  background-color: #f9fafb;
  border: 1px solid #e5e7eb;
  padding-left: 40px;
  transition: all 0.3s;
}

/* 适配移动端字体大小 */
@media screen and (max-width: 768px) {
  ::v-deep .el-input__inner {
    font-size: 16px !important;
  }
}

::v-deep .el-input__inner:focus {
  /* 修改：聚焦颜色改为 Element Blue */
  border-color: #409EFF;
  background-color: #fff;
  box-shadow: 0 0 0 3px rgba(64, 158, 255, 0.1);
}

::v-deep .el-input__prefix {
  left: 5px;
  display: flex;
  align-items: center;
}

::v-deep .el-input__icon {
  font-size: 18px;
  color: #9ca3af;
}

.verify-wrapper {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.verify-input {
  width: 60% !important;
}

.verify-img {
  width: 35%;
  height: 45px;
  border-radius: 8px;
  cursor: pointer;
  border: 1px solid #e5e7eb;
  object-fit: contain;
  background: #fff;
}

.remember-me {
  margin-bottom: 25px;

  ::v-deep .el-checkbox {
    &.is-checked {
      .el-checkbox__input.is-checked .el-checkbox__inner {
        /* 修改：选中框改为深蓝色 */
        background-color: #044eba;
        border-color: #044eba;
      }

      .el-checkbox__label {
        /* 修改：选中文字改为深蓝色 */
        color: #044eba !important;
      }
    }

    .el-checkbox__label {
      color: #606266;
    }
  }
}

.action-buttons {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.submit-btn {
  width: 100%;
  height: 45px;
  font-size: 16px;
  /* 修改：按钮渐变改为深蓝到亮蓝 */
  background: linear-gradient(90deg, #044eba 0%, #409EFF 100%);
  border: none;
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.3);
  transition: all 0.3s;
}

.submit-btn:hover {
  box-shadow: 0 6px 16px rgba(64, 158, 255, 0.4);
  transform: translateY(-1px);
}

.register-btn {
  width: 100%;
  color: #6b7280;
  margin-left: 0 !important;
  text-align: center;
}

.register-btn:hover {
  /* 修改：注册按钮悬浮色 */
  color: #409EFF;
}

.admin-link-btn {
  position: absolute;
  top: 20px;
  right: 20px;
  font-size: 20px;
  color: #6b7280;
  background: rgba(255, 255, 255, 0.5);
  border: none;
  z-index: 20;
}

.admin-link-btn:hover {
  background: #fff;
  /* 修改：图标悬浮色 */
  color: #044eba;
}

.avatar-selection {
  display: flex;
  align-items: center;
  gap: 20px;
  justify-content: center;
}

.avatar-preview-wrapper {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  overflow: hidden;
  border: 3px solid #e0e7ff;
  cursor: pointer;
  position: relative;
  box-shadow: 0 4px 6px rgba(0,0,0,0.1);
  background-color: #f3f4f6;
  transition: all 0.3s;
}

.avatar-preview-wrapper:hover {
  /* 修改：头像框悬浮色 */
  border-color: #409EFF;
}

.avatar-preview-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-refresh-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0,0,0,0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s;
  z-index: 1;
}

.avatar-preview-wrapper:hover .avatar-refresh-overlay {
  opacity: 1;
}

.avatar-refresh-overlay i {
  color: white;
  font-size: 24px;
}

.avatar-loading-overlay {
  position: absolute;
  inset: 0;
  background: rgba(255, 255, 255, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2;
}

.avatar-loading-overlay i {
  /* 修改：加载图标色 */
  color: #409EFF;
  font-size: 24px;
  animation: rotating 2s linear infinite;
}

@keyframes rotating {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.avatar-tip {
  text-align: center;
  font-size: 12px;
  color: #9ca3af;
  margin-top: 8px;
}

.full-width-btn {
  width: 100%;
  /* 修改：弹窗按钮渐变 */
  background: linear-gradient(90deg, #044eba 0%, #409EFF 100%);
  border: none;
}

.user-type-item, .avatar-form-item {
  text-align: left !important;
  padding-left: 10px;
}

::v-deep .el-form-item__label {
  padding-left: 5px;
}
</style>
<style>
/* 1. 限制弹窗主体区域的高度，并开启滚动 */
.custom-dialog .el-dialog__body {
  /* 设置最大高度，比如屏幕高度的 50% 或固定像素 400px */
  max-height: 55vh;
  /* 内容超出时显示滚动条 */
  overflow-y: auto;
  /* 优化滚动条样式（可选） */
  scrollbar-width: thin;
  padding: 20px 35px; /* 保持原有的内边距 */
}

/* 2. (可选) 优化滚动条在 Chrome/Edge 下的显示 */
.custom-dialog .el-dialog__body::-webkit-scrollbar {
  width: 6px;
}
.custom-dialog .el-dialog__body::-webkit-scrollbar-thumb {
  background-color: #dcdfe6;
  border-radius: 3px;
}
.custom-dialog .el-dialog__body::-webkit-scrollbar-track {
  background-color: #f5f7fa;
}
/* 移动端适配：纯净卡片模式 (无滚动) */
@media screen and (max-width: 768px) {
  .custom-dialog {
    /* 1. 定位与宽度 */
    width: 380px !important;     /* 尝试保持标准宽 */
    max-width: 90% !important;   /* 屏幕窄时自动缩小 */
    margin: 0 !important;        /* 清除默认边距 */

    /* 2. 强制居中 */
    position: fixed !important;
    top: 50% !important;
    left: 50% !important;
    transform: translate(-50%, -50%) !important;

    /* 3. 外观样式 */
    border-radius: 20px !important;
    display: flex;
    flex-direction: column;
  }

  /* 4. 内部间距 (紧凑一点，防止撑破屏幕) */
  .custom-dialog .el-dialog__body {
    padding: 20px 25px !important;
  }

  /* 5. 表单项间距 */
  .custom-dialog .el-form-item {
    margin-bottom: 22px !important;
  }

  /* 6. 特殊处理：去掉最后一个头像项的下边距 */
  .custom-dialog .avatar-form-item {
    margin-bottom: 0 !important;
  }

  /* 7. 输入框高度适配 */
  .custom-dialog .el-input__inner {
    height: 40px !important;
    line-height: 40px !important;
  }
  .custom-dialog .el-input__icon {
    line-height: 40px !important;
  }

  /* 8. 头像大小 */
  .custom-dialog .avatar-preview-wrapper {
    width: 60px !important;
    height: 60px !important;
  }

  /* 9. 标题和按钮 */
  .custom-dialog .el-dialog__title {
    font-size: 18px !important;
  }
  .custom-dialog .full-width-btn {
    height: 40px !important;
    font-size: 16px !important;
  }
}

   /* ... 原有的 .custom-dialog 等样式保持不变 ... */

   /* =================================
      多选框：横向排列 + 横向滚动 (最终版)
      ================================= */

   /* 1. 核心容器：强制一行显示，超出横向滚动 */
   /* 1. 核心容器设置 */
.custom-register-select .el-input__inner,
.limit-tags-select .el-input__inner {
  padding-left: 10px !important;
  padding-right: 30px !important; /* 右边给箭头留位置 */
}

/* =========================================
   以下是第二个下拉框(多选)的专属样式
   ========================================= */

/* 2. 多选标签容器：横向排列 + 滚动 */
.limit-tags-select .el-select__tags {
  display: flex !important;
  flex-wrap: nowrap !important;
  overflow-x: auto !important;
  overflow-y: hidden !important;

  /* 【核心修复】让标签也靠左，对齐输入框文字 */
  padding-left: 10px !important;

  /* 限制宽度，防止盖住右侧图标 */
  max-width: calc(100% - 35px) !important;

  /* 垂直居中 */
  top: 50% !important;
  transform: translateY(-50%) !important;

  /* 隐藏滚动条 */
  scrollbar-width: none;
  pointer-events: auto !important;
  cursor: pointer;
}

/* Chrome/Safari 隐藏滚动条 */
.limit-tags-select .el-select__tags::-webkit-scrollbar {
  display: none;
}

/* 3. 处理 Vue 动画层 */
.limit-tags-select .el-select__tags > span {
  display: flex !important;
  flex-wrap: nowrap !important;
  align-items: center !important;
}

/* 4. 标签本身的样式 */
.limit-tags-select .el-tag {
  flex-shrink: 0 !important;
  margin: 2px 4px 2px 0 !important;
  /* 标签内部文字也紧凑一点 */
  padding: 0 4px !important;
  display: inline-flex !important;
  align-items: center !important;
  height: 24px !important;
  line-height: 22px !important;
}

/* 5. 确保输入框高度固定 */
.limit-tags-select .el-input__inner {
  height: 40px !important;
  line-height: 40px !important;
}
</style>
