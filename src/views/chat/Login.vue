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
            <img :src="verifyCode" title="点击切换验证码" @click="changeverifyCode" class="verify-img" />
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
// 引入 publicAvatarUploadUrl
import { reqUserLogin, reqUserRegister, reqCheckUsername, reqCheckNickname, publicAvatarUploadUrl } from '../../utils/api';

export default {
  name: "Login",
  data(){
    var validateNickname = (rule, value, callback) => {
      if (value === '') {
        callback(new Error('请输入昵称'));
      }
      reqCheckNickname(value).then(resp=>{
        if (resp && resp.status == 200 && resp.obj){
          callback(new Error("该昵称已被注册"))
        } else {
          callback();
        }
      })
    };
    var validateUsername = (rule, value, callback) => {
      if (value === '') {
        callback(new Error('请输入用户名'));
      }
      reqCheckUsername(value).then(resp=>{
        if (resp && resp.status == 200 && resp.obj){
          callback(new Error('该用户名已被注册'));
        }
        else {
          callback();
        }
      })

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

      loginForm:{
        username:'',
        password:'',
        code:'',
      },
      verifyCode:'/verifyCode',
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
  methods:{
    getRandomAvatar() {
      const seed = Math.random().toString(36).substring(7);
      return `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`;
    },
    refreshRandomAvatar() {
      this.registerForm.userProfile = this.getRandomAvatar();
    },

    submitLogin() {
      this.$refs.loginForm.validate((valid) => {
        if (valid) {
          this.fullscreenLoading = true;
          reqUserLogin(this.loginForm).then(resp => {
            this.fullscreenLoading = false;
            if (resp && resp.status == 200 && resp.obj) {
              this.$store.state.currentUser = resp.obj;

              // 始终存入 sessionStorage
              window.sessionStorage.setItem("user", JSON.stringify(resp.obj));

              // 根据勾选存入 localStorage
              if (this.checked) {
                window.localStorage.setItem("user", JSON.stringify(resp.obj));
              } else {
                window.localStorage.removeItem("user");
              }

              let path = this.$route.query.redirect;
              this.$router.replace((path == '/' || path == undefined) ? "/chatroom" : path);
            } else {
              // 失败处理交给拦截器或保持原状
            }
          }).catch(() => {
            this.fullscreenLoading = false;
          });
        } else {
          // 校验失败
        }
      });
    },
    changeverifyCode(){
      this.verifyCode="/verifyCode?time="+new Date();
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

      // 解析后端 RespBean
      if (response && response.status === 200) {
        // 关键修复：从 obj 字段获取 URL
        this.registerForm.userProfile = response.obj;
        this.$message.success("头像上传成功");
      } else {
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
      };
      // 重置状态
      this.avatarLoading = false;
      this.uploadDisabled = false;
      done();
    },

    submitRegisterForm(formName) {
      this.$refs[formName].validate((valid) => {
        if (valid) {
          reqUserRegister(this.registerForm).then(resp=>{
            if (resp && resp.status == 200){
              this.registerDialogVisible=false;
              this.$message.success("注册成功！请登录");
            } else if (resp && resp.msg) {
              this.$message.error(resp.msg);
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
.login-page {
  height: 100vh;
  width: 100vw;
  display: flex;
  justify-content: center;
  align-items: center;
  background: linear-gradient(135deg, #eef2ff 0%, #c7d2fe 100%);
  position: relative;
  overflow: hidden;
}

.bg-decoration-circle {
  position: absolute;
  top: -100px;
  right: -100px;
  width: 600px;
  height: 600px;
  background: radial-gradient(circle, rgba(79, 70, 229, 0.1) 0%, rgba(255, 255, 255, 0) 70%);
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
  color: #4f46e5;
  font-weight: 700;
  letter-spacing: 1px;
}

.sub-title {
  color: #4f46e5;
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

::v-deep .el-input__inner:focus {
  border-color: #4f46e5;
  background-color: #fff;
  box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
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
        background-color: #4f46e5;
        border-color: #4f46e5;
      }

      .el-checkbox__label {
        color: #4f46e5 !important;
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
  background: linear-gradient(90deg, #4f46e5 0%, #6366f1 100%);
  border: none;
  box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);
  transition: all 0.3s;
}

.submit-btn:hover {
  box-shadow: 0 6px 16px rgba(79, 70, 229, 0.4);
  transform: translateY(-1px);
}

.register-btn {
  width: 100%;
  color: #6b7280;
}

.register-btn:hover {
  color: #4f46e5;
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
  color: #4f46e5;
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
  border-color: #4f46e5;
}

.avatar-preview-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* 刷新遮罩层 */
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

/* 加载中遮罩层 */
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
  color: #4f46e5;
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
  background: linear-gradient(90deg, #4f46e5 0%, #6366f1 100%);
  border: none;
}

.user-type-item {
  text-align: left !important;
  padding-left: 10px;

  ::v-deep .el-form-item__label {
    padding-left: 5px;
  }
}

.avatar-form-item {
  text-align: left !important;
  padding-left: 10px;

  ::v-deep .el-form-item__label {
    padding-left: 5px;
  }
}
</style>
