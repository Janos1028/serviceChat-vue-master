import Vue from 'vue'
import App from './App.vue'
import router from './router'
import store from './store'
import ElementUI from 'element-ui';
import 'element-ui/lib/theme-chalk/index.css';
import 'font-awesome/css/font-awesome.min.css'
import { postRequest, getRequest, putRequest, deleteRequest } from "./utils/api";

Vue.config.productionTip = false
Vue.use(ElementUI);

// 插件挂载
Vue.prototype.$postRequest = postRequest;
Vue.prototype.$getRequest = getRequest;
Vue.prototype.$putRequest = putRequest;
Vue.prototype.$deleteRequest = deleteRequest;

// 【核心修复】应用启动时，检查并自动清理有问题的旧缓存
try {
  const savedStateStr = sessionStorage.getItem('state');
  if (savedStateStr) {
    const savedState = JSON.parse(savedStateStr);
    // 如果发现缓存中缺少新功能的关键字段，说明是脏数据，强制清理
    if (!savedState.conversationToServiceMap) {
      console.warn('Detected outdated state cache. Clearing to prevent errors.');
      sessionStorage.removeItem('state');
      // 可选：如果用户信息也可能不一致，也可以清理 user
      // sessionStorage.removeItem('user');
    }
  }
} catch (e) {
  console.error('Error checking state cache:', e);
  sessionStorage.removeItem('state');
}

router.beforeEach((to, from, next) => {
  if (to.path === '/') {
    next();
  } else {
    if (window.sessionStorage.getItem("user")) {
      store.dispatch('initData'); // 确保进入非登录页时初始化数据
      next();
    } else {
      next('/?redirect=' + to.path);
    }
  }
})

new Vue({
  router,
  store,
  render: h => h(App)
}).$mount('#app')

window.addEventListener('beforeunload', () => {
  // 尝试断开 WebSocket 连接
  if (store.state.stomp && store.state.stomp.connected) {
    store.state.stomp.disconnect(() => {
      console.log("Browser closed, WebSocket disconnected.");
    });
  }
});
