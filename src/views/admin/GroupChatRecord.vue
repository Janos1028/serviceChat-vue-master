<template>
  <div class="page-container">
    <!-- 顶部筛选区域 -->
    <div class="card toolbar-card">
      <div class="filter-row">
        <div class="filter-item">
          <span class="label">发送者</span>
          <el-input
              v-model="nameKeyword"
              placeholder="输入昵称搜索"
              size="medium"
              prefix-icon="el-icon-user"
              class="filter-input"
              clearable
              @keyup.enter.native="initMessTableData"
              @clear="initMessTableData"
          ></el-input>
        </div>

        <div class="filter-item">
          <span class="label">时间范围</span>
          <el-date-picker
              v-model="dateScope"
              type="datetimerange"
              range-separator="至"
              start-placeholder="开始日期"
              end-placeholder="结束日期"
              size="medium"
              value-format="yyyy-MM-dd HH:mm:ss"
              class="date-picker"
              :default-time="['00:00:00', '23:59:59']"
          ></el-date-picker>
        </div>

        <div class="filter-item">
          <span class="label">消息类型</span>
          <el-radio-group v-model="msgTypeRadio" size="medium" fill="#4f46e5">
            <el-radio-button :label="1">文本</el-radio-button>
            <el-radio-button :label="2">图片</el-radio-button>
            <el-radio-button :label="3">文件</el-radio-button>
          </el-radio-group>
          <!-- 清除按钮 -->
          <el-button
              type="text"
              size="small"
              class="clear-radio-btn"
              v-if="msgTypeRadio"
              @click="msgTypeRadio = null"
          >清除选中</el-button>
        </div>
      </div>

      <div class="action-row">
        <el-button
            type="primary"
            icon="el-icon-search"
            size="medium"
            @click="initMessTableData"
            :loading="loading"
        >搜索记录</el-button>
        <el-button
            type="danger"
            icon="el-icon-delete"
            size="medium"
            :disabled="multipleSelection.length === 0"
            @click="handleMassDelete"
            plain
        >批量删除</el-button>
      </div>
    </div>

    <!-- 表格区域 -->
    <div class="card table-card" v-loading="loading" element-loading-text="数据加载中...">
      <el-table
          :data="tableData"
          stripe
          style="width: 100%"
          height="100%"
          @selection-change="handleSelectionChange"
          :header-cell-style="{background:'#f8fafc', color:'#64748b', fontWeight:'600'}"
      >
        <el-table-column type="selection" width="55" align="center"></el-table-column>
        <el-table-column prop="id" label="ID" width="80" align="center" sortable></el-table-column>

        <el-table-column label="发送者" width="180">
          <template slot-scope="scope">
            <div class="sender-info">
              <el-avatar :size="32" :src="scope.row.fromProfile" shape="circle" class="sender-avatar">
                <i class="el-icon-user-solid"></i>
              </el-avatar>
              <div class="sender-detail">
                <span class="sender-name">{{ scope.row.fromName }}</span>
              </div>
            </div>
          </template>
        </el-table-column>

        <el-table-column prop="content" label="消息内容" min-width="300">
          <template slot-scope="scope">
            <!-- 文本消息 -->
            <div v-if="scope.row.type === 1" class="text-content">
              <span v-html="scope.row.content"></span>
            </div>
            <!-- 图片消息 -->
            <div v-else-if="scope.row.type === 2" class="img-content">
              <el-image
                  style="width: 80px; height: 80px; border-radius: 4px"
                  :src="scope.row.content"
                  :preview-src-list="[scope.row.content]"
                  fit="cover">
                <div slot="error" class="image-slot">
                  <i class="el-icon-picture-outline"></i>
                </div>
              </el-image>
            </div>
            <!-- 文件消息 -->
            <div v-else-if="scope.row.type === 3" class="file-content">
              <i class="el-icon-document file-icon"></i>
              <span class="file-link">文件链接: {{scope.row.content}}</span>
            </div>
            <!-- 其他/未知 -->
            <div v-else class="text-content">{{ scope.row.content }}</div>
          </template>
        </el-table-column>

        <el-table-column prop="createTime" label="发送时间" width="180" align="center" sortable>
          <template slot-scope="scope">
            <span class="time-tag"><i class="el-icon-time" style="margin-right: 4px"></i>{{ scope.row.createTime }}</span>
          </template>
        </el-table-column>

        <el-table-column label="操作" width="120" align="center" fixed="right">
          <template slot-scope="scope">
            <el-button
                size="mini"
                type="text"
                class="delete-btn"
                icon="el-icon-delete"
                @click="handleDelete(scope.$index, scope.row)"
            >删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- 分页区域 -->
    <div class="pagination-area">
      <el-pagination
          background
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
          :current-page="currentPage"
          :page-sizes="[10, 20, 50, 100]"
          :page-size="pageSize"
          layout="total, sizes, prev, pager, next, jumper"
          :total="total"
      ></el-pagination>
    </div>
  </div>
</template>

<script>
import {
  reqGetGroupMsgLogs,
  reqDeleteGroupMsgById,
  reqDeleteGroupMsgByIds
} from "../../utils/api";

export default {
  name: "GroupChatRecord",
  data() {
    return {
      nameKeyword: '',
      dateScope: null,
      msgTypeRadio: null, // 默认不筛选，点击radio后变为1,2,3
      loading: false,
      tableData: [],
      currentPage: 1,
      pageSize: 10,
      total: 0,
      multipleSelection: []
    }
  },
  mounted() {
    this.initMessTableData();
  },
  methods: {
    // 获取/搜索数据
    initMessTableData() {
      this.loading = true;
      let params = {
        page: this.currentPage,
        size: this.pageSize,
        nickname: this.nameKeyword,
        type: this.msgTypeRadio,
        dateScope: this.dateScope
      };

      reqGetGroupMsgLogs(params).then(resp => {
        this.loading = false;
        if (resp) {
          this.tableData = resp.data;
          this.total = resp.total;
        }
      }).catch(() => {
        this.loading = false;
      });
    },
    // 删除单条
    handleDelete(index, row) {
      this.$confirm('此操作将永久删除该条消息记录, 是否继续?', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        reqDeleteGroupMsgById(row.id).then(resp => {
          if (resp) {
            this.initMessTableData();
          }
        });
      }).catch(() => {
        this.$message({
          type: 'info',
          message: '已取消删除'
        });
      });
    },
    // 批量选中
    handleSelectionChange(val) {
      this.multipleSelection = val;
    },
    // 批量删除
    handleMassDelete() {
      if (this.multipleSelection.length === 0) return;

      this.$confirm(`即将删除选中的 ${this.multipleSelection.length} 条记录, 是否继续?`, '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        // 提取ID
        let ids = this.multipleSelection.map(item => item.id);
        // SpringMVC 接收数组参数通常可以是 ids=1,2,3 的形式
        reqDeleteGroupMsgByIds({ ids: ids.toString() }).then(resp => {
          if (resp) {
            this.initMessTableData();
            // 清空选中状态
            this.multipleSelection = [];
          }
        });
      }).catch(() => {
        this.$message({
          type: 'info',
          message: '已取消删除'
        });
      });
    },
    // 分页大小改变
    handleSizeChange(val) {
      this.pageSize = val;
      this.initMessTableData();
    },
    // 页码改变
    handleCurrentChange(val) {
      this.currentPage = val;
      this.initMessTableData();
    }
  }
}
</script>

<style scoped lang="scss">
/* 页面容器：采用Flex布局，填满父容器 */
.page-container {
  display: flex;
  flex-direction: column;
  height: 100%; /* 确保在Admin Main区域内铺满 */
  gap: 15px;
  background-color: #f1f5f9; /* 浅灰底色 */
  padding: 15px;
  box-sizing: border-box;
}

/* 卡片通用样式 */
.card {
  background: #ffffff;
  border-radius: 12px;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
  padding: 20px;
  transition: all 0.3s ease;
}

.card:hover {
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
}

/* --- 顶部工具栏样式 --- */
.toolbar-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 20px;
}

.filter-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 24px;
}

.filter-item {
  display: flex;
  align-items: center;
  gap: 10px;
}

.label {
  font-size: 14px;
  font-weight: 500;
  color: #64748b;
}

.filter-input {
  width: 200px;
}

.date-picker {
  width: 360px !important;
}

/* 清除按钮 */
.clear-radio-btn {
  margin-left: 10px;
  color: #94a3b8;
}
.clear-radio-btn:hover {
  color: #ef4444;
}

.action-row {
  display: flex;
  gap: 12px;
}

/* --- 表格区域样式 --- */
.table-card {
  padding: 0;
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  border: 1px solid #e2e8f0;
}

/* 覆盖 el-table 默认边框，使其更干净 */
::v-deep .el-table {
  flex: 1; /* 让表格主体占满剩余空间 */
}
::v-deep .el-table__body-wrapper {
  /* 确保滚动条正常工作 */
  overflow-y: auto;
}

/* 自定义表格内容 */
.sender-info {
  display: flex;
  align-items: center;
  gap: 10px;
}
.sender-avatar {
  background-color: #e2e8f0;
  flex-shrink: 0;
}
.sender-detail {
  display: flex;
  flex-direction: column;
}
.sender-name {
  font-weight: 600;
  color: #334155;
  font-size: 14px;
}

/* 消息内容 */
.text-content {
  color: #334155;
  line-height: 1.6;
  font-size: 14px;
}

.img-content {
  display: flex;
  align-items: center;
  padding: 4px 0;
}

.file-content {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #4f46e5;
  font-size: 14px;
}
.file-icon {
  font-size: 18px;
}

.image-slot {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 100%;
  background: #f1f5f9;
  color: #cbd5e1;
  font-size: 20px;
}

/* 时间标签 */
.time-tag {
  color: #94a3b8;
  font-size: 13px;
  font-family: monospace;
}

/* 删除按钮 */
.delete-btn {
  color: #ef4444;
}
.delete-btn:hover {
  color: #dc2626;
  text-decoration: underline;
}

/* --- 分页区域 --- */
.pagination-area {
  background: #fff;
  padding: 15px 20px;
  border-radius: 12px;
  display: flex;
  justify-content: flex-end;
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
}
</style>
