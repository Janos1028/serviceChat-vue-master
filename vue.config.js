// 根据环境变量决定代理目标

const targetUrl = process.env.VUE_APP_API_BASE_URL;

let proxyObj = {};
proxyObj['/ws'] = {
  ws: true,
  target: targetUrl.replace('https://', 'wss://').replace('http://', 'ws://'),
  changeOrigin: true
};
proxyObj['/'] = {
  ws: false,
  target: targetUrl,
  changeOrigin: true,
  pathRewrite: {
    '^/': ''
  }
};

module.exports = {
  devServer: {
    host: '10.210.52.151',
    port: 8088,
    proxy: proxyObj
  }
};
