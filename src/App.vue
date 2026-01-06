<template>
  <div id="app">
    <router-view/>
  </div>
</template>

<script>
export default {
  name: 'App',
  data() {
    return {
      // 用于记录滑动状态
      touchStartX: 0,
      touchStartY: 0,
      currentSwipeElement: null,
      isSwiping: false
    };
  },
  mounted() {
    // 添加全局触摸事件监听
    document.addEventListener('touchstart', this.onGlobalTouchStart, { passive: false });
    document.addEventListener('touchmove', this.onGlobalTouchMove, { passive: false });
    document.addEventListener('touchend', this.onGlobalTouchEnd);
  },
  beforeDestroy() {
    // 销毁时移除监听
    document.removeEventListener('touchstart', this.onGlobalTouchStart);
    document.removeEventListener('touchmove', this.onGlobalTouchMove);
    document.removeEventListener('touchend', this.onGlobalTouchEnd);
  },
  methods: {
    // 辅助方法：向上查找最近的弹窗元素
    getNotificationElement(target) {
      // 兼容处理：有些浏览器不支持 closest
      return target.closest ? target.closest('.el-notification') : null;
    },

    onGlobalTouchStart(e) {
      // 1. 检查点击的目标是否在通知弹窗内
      const el = this.getNotificationElement(e.target);
      if (el) {
        this.currentSwipeElement = el;
        this.touchStartX = e.touches[0].clientX;
        this.touchStartY = e.touches[0].clientY;
        this.isSwiping = false;

        // 触摸开始时，暂时移除过渡效果，让跟随更跟手
        el.style.transition = 'none';
      }
    },

    onGlobalTouchMove(e) {
      if (!this.currentSwipeElement) return;

      const deltaX = e.touches[0].clientX - this.touchStartX;
      const deltaY = e.touches[0].clientY - this.touchStartY;

      // 2. 判断是否为水平滑动 (X轴位移 > Y轴位移 且 向右滑动的距离 > 10px)
      // 这里设定只能向右滑动关闭 (deltaX > 0)
      if (Math.abs(deltaX) > Math.abs(deltaY) && deltaX > 10) {
        // 阻止默认滚动行为
        if (e.cancelable) e.preventDefault();

        this.isSwiping = true;

        // 跟随手指移动 (最大移动距离限制一下视觉，或者直接跟随)
        this.currentSwipeElement.style.transform = `translateX(${deltaX}px)`;
        // 同时改变透明度，产生渐隐效果
        const opacity = 1 - (deltaX / 300); // 假设滑300px完全透明
        this.currentSwipeElement.style.opacity = opacity > 0 ? opacity : 0;
      }
    },

    onGlobalTouchEnd(e) {
      if (!this.currentSwipeElement) return;

      const deltaX = e.changedTouches[0].clientX - this.touchStartX;

      // 3. 判定是否触发关闭 (滑动距离超过 80px)
      if (this.isSwiping && deltaX > 80) {
        // 尝试找到关闭按钮并模拟点击
        const closeBtn = this.currentSwipeElement.querySelector('.el-notification__closeBtn');
        if (closeBtn) {
          closeBtn.click(); // 触发 Element UI 原生的关闭逻辑
        } else {
          // 如果找不到关闭按钮（比如 hideClose: true），则手动隐藏
          this.currentSwipeElement.style.display = 'none';
        }
      } else {
        // 4. 未达到阈值，回弹复位
        this.currentSwipeElement.style.transition = 'all 0.3s ease';
        this.currentSwipeElement.style.transform = ''; // 清空 transform 回到原位
        this.currentSwipeElement.style.opacity = '';   // 恢复透明度
      }

      // 重置状态
      this.currentSwipeElement = null;
      this.isSwiping = false;
    }
  }
}
</script>

<style>

/* 全局样式重置 */
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

/* 强制覆盖 Element UI 的动态定位计算
  让所有聊天弹窗都叠在右上角的同一个位置
*/
.el-notification.chat-notification {
  /* 强制固定顶部距离，不再自动往下排 */
  top: 60px !important;
  /* 固定右侧距离 */
  right: 15px !important;
  /* 增加层级，保证在最上层 */
  z-index: 2000 !important;
  /* 加上阴影，让堆叠感更强，看起来像一叠卡片 */
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2) !important;
  /* 稍微加一点透明度，让底下的能隐约透出来一点点（可选） */
  opacity: 0.95;
}

/* 可选优化：让鼠标悬停时，当前的弹窗稍微往前浮动一下
  提升交互感
*/
.el-notification.chat-notification:hover {
  z-index: 2001 !important;
  transform: scale(1.02);
  transition: all 0.3s;
  opacity: 1;
}

@media screen and (max-width: 768px) {
  /* 1. 修复 Message (顶部轻提示) */
  .el-message {
    /* 取消默认的最小宽度380px，改为屏幕的90% */
    min-width: 0 !important;
    width: 90% !important;
    /* 增加顶部外边距，避开 Header 区域 (默认top约20px + margin 60px = 80px) */
    margin-top: 40px !important;
    /* 增加内边距，防止文字换行太紧凑 */
    padding: 10px 15px !important;
    /* 确保阴影和层级 */
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important;
    pointer-events: none !important;
  }

  /* 2. 修复 MessageBox (确认弹窗) */
  .el-message-box {
    /* 宽度调整为85%，适应手机屏幕 */
    width: 85% !important;
    /* 强制绝对定位居中，解决默认太靠上的问题 */
    position: absolute !important;
    top: 50% !important;
    left: 50% !important;
    transform: translate(-50%, -50%) !important;
    margin-top: 0 !important; /* 清除 Element UI 默认的 margin-top */
  }

  /* 3. 适配 Notification (如果有需要) */
  .el-notification.chat-notification {
    width: 90% !important;
    right: 5% !important;
    /* 如果觉得60px还是遮挡，可以在这里单独加高 */
    top: 70px !important;
  }
}
</style>
