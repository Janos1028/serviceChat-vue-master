// 根据环境变量决定代理目标
const isDevelopment = process.env.NODE_ENV === 'development';
const targetUrl = process.env.VUE_APP_API_BASE_URL || 'http://120.55.5.60:9090';

let proxyObj = {};
proxyObj['/ws'] = {
  ws: true,
  target: targetUrl.replace('https://', 'wss://').replace('http://', 'ws://'),
  secure: !isDevelopment, // 开发环境可能需要设置为false
  changeOrigin: true
};
proxyObj['/'] = {
  ws: false,
  target: targetUrl,
  secure: !isDevelopment, // 开发环境可能需要设置为false
  changeOrigin: true,
  pathRewrite: {
    '^/': ''
  }
};

module.exports = {
  devServer: {
    host: 'localhost',
    port: 8088,
    proxy: proxyObj
  }
};
