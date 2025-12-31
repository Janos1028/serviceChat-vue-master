<template>
  <div id="app">
    <router-view/>
  </div>
</template>

<script>
export default {
  name: 'App'
}
</script>

<style>
/* 【核心修改】全局样式重置 */
html, body {
  margin: 0;
  padding: 0;
  width: 100%;
  height: 100%;
  overflow: hidden; /* 禁止浏览器原本的滚动条 */
  -webkit-font-smoothing: antialiased; /* 字体抗锯齿，让文字更像原生应用 */
}

#app {
  width: 100%;
  height: 100%;
  font-family: 'Helvetica Neue', Helvetica, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', '微软雅黑', Arial, sans-serif;
}

/* 注意：这个类名必须放在全局样式中（不要加 scoped），否则 Element UI 的弹窗无法读取到 */
.chat-notification {
  cursor: pointer !important; /* 强制显示手型 */
  user-select: none;          /* 防止文本被选中，更像按钮 */
  transition: all 0.2s ease;  /* 添加平滑过渡效果 */
  border-left: 5px solid #409EFF !important; /* 左侧加一道蓝杠，增加设计感 */
}

/* 鼠标悬停时的效果：轻微上浮 + 阴影加重 */
.chat-notification:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.15) !important;
  background-color: #e9f6ff !important; /* 可选：悬停时微微变色 */
}
</style>
