<template>
  <div class="login-page">
    <!-- 背景装饰圆 -->
    <div class="bg-decoration-circle"></div>

    <!-- 左上角悬浮的返回客户端入口 -->
    <el-button
        class="client-link-btn"
        @click="gotoClientLogin"
        icon="el-icon-back"
        circle
        title="返回用户登录"
    ></el-button>

    <!-- 登录卡片 -->
    <div class="login-card">
      <div class="login-header">
        <h3 class="login-title">系统管理员 <span class="sub-title">Admin</span></h3>
        <p class="login-subtitle">请登录后台管理系统</p>
      </div>

      <el-form
          :rules="rules"
          ref="loginForm"
          v-loading="loading"
          element-loading-text="正在登录..."
          element-loading-spinner="el-icon-loading"
          element-loading-background="rgba(0, 0, 0, 0.4)"
          :model="loginForm"
      >
        <el-form-item prop="username">
          <el-input
              size="normal"
              type="text"
              v-model="loginForm.username"
              auto-complete="off"
              placeholder="请输入管理员账号"
              prefix-icon="el-icon-user-solid"
          ></el-input>
        </el-form-item>
        <el-form-item prop="password">
          <el-input
              size="normal"
              type="password"
              v-model="loginForm.password"
              auto-complete="off"
              placeholder="请输入密码"
              prefix-icon="el-icon-lock"
              @keydown.enter.native="submitLogin"
          ></el-input>
        </el-form-item>
        <el-button type="primary" style="width: 100%; margin-top: 20px;" @click="submitLogin" class="login-btn">登录</el-button>
      </el-form>
    </div>
  </div>
</template>

<script>
// 注意路径：根据文件结构，通常组件在 src/views 下，api在 src/utils 下，所以是 ../utils/api
import { reqAdminLogin } from "../../utils/api";

export default {
  name: "AdminLogin",
  data() {
    return {
      loading: false,
      loginForm: {
        username: 'admin',
        password: '123'
      },
      rules: {
        username: [{required: true, message: '请输入用户名', trigger: 'blur'}],
        password: [{required: true, message: '请输入密码', trigger: 'blur'}]
      }
    }
  },
  methods: {
    gotoClientLogin() {
      this.$router.replace('/');
    },
    submitLogin() {
      this.$refs.loginForm.validate((valid) => {
        if (valid) {
          this.loading = true;
          reqAdminLogin(this.loginForm).then(resp => {
            this.loading = false;
            if (resp) {
              // --- 修复关键点 ---
              // 原错误代码：只存了 token 字符串，且 key 为 'token'
              // const tokenStr = resp.obj.tokenHead + resp.obj.token;
              // window.sessionStorage.setItem('token', tokenStr);

              // 新正确代码：
              // 1. 将整个 admin 对象（包含 token, name, avatar 等）存入 'admin' 键
              // 2. 这样 api.js 拦截器才能通过 JSON.parse(sessionStorage.getItem('admin')) 拿到 token
              // 3. 这样 Home.vue 也能通过 sessionStorage.getItem('admin') 拿到头像和昵称
              window.sessionStorage.setItem('admin', JSON.stringify(resp.obj));

              // 跳转到管理员首页
              this.$router.replace('/home');
            }
          }).catch(() => {
            this.loading = false;
          })
        } else {
          this.$message.error('请输入所有字段');
          return false;
        }
      });
    }
  }
}
</script>

<style scoped>
.login-page {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  background-color: #1e1e2e; /* 深色背景 */
  position: relative;
  overflow: hidden;
}

.bg-decoration-circle {
  position: absolute;
  width: 600px;
  height: 600px;
  background: radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, rgba(30, 30, 46, 0) 70%);
  border-radius: 50%;
  top: -100px;
  left: -100px;
  z-index: 1;
}

.client-link-btn {
  position: absolute;
  top: 20px;
  left: 20px;
  background: rgba(255, 255, 255, 0.1);
  border: none;
  color: #fff;
  z-index: 20;
}
.client-link-btn:hover {
  background: rgba(255, 255, 255, 0.2);
  color: #818cf8;
}

.login-card {
  width: 400px;
  background: rgba(255, 255, 255, 0.05); /* 玻璃拟态 */
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
  padding: 45px 40px;
  box-sizing: border-box;
  z-index: 10;
}

.login-header {
  text-align: center;
  margin-bottom: 35px;
}

.login-title {
  margin: 0;
  font-size: 28px;
  color: #fff;
  font-weight: 700;
  letter-spacing: 1px;
}

.sub-title {
  color: #818cf8;
}

.login-subtitle {
  margin-top: 10px;
  color: rgba(255,255,255,0.6);
  font-size: 14px;
}

/* 输入框样式重写 */
::v-deep .el-input__inner {
  border-radius: 25px;
  height: 45px;
  line-height: 45px;
  background-color: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255,255,255,0.1);
  color: #fff;
  padding-left: 40px;
  transition: all 0.3s;
}

::v-deep .el-input__inner:focus {
  border-color: #818cf8;
  background-color: rgba(0, 0, 0, 0.4);
}

::v-deep .el-input__icon {
  line-height: 45px;
  color: rgba(255,255,255,0.5);
}

.login-btn {
  height: 45px;
  border-radius: 25px;
  background: linear-gradient(135deg, #6366f1 0%, #818cf8 100%);
  border: none;
  font-size: 16px;
  font-weight: 600;
  letter-spacing: 1px;
  transition: all 0.3s;
}

.login-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(99, 102, 241, 0.4);
}
</style>
