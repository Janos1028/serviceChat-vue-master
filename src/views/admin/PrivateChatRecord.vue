<template>
  <div class="page-container">
    <!-- 顶部筛选区域 -->
    <div class="card toolbar-card">
      <div class="filter-row">
        <div class="filter-item">
          <span class="label">用户搜索</span>
          <el-input
              v-model="nameKeyword"
              placeholder="发送者/接收者昵称"
              size="medium"
              prefix-icon="el-icon-search"
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
          <el-button
              type="text"
              size="small"
              class="clear-radio-btn"
              v-if="msgTypeRadio"
              @click="msgTypeRadio = null"
          >清除</el-button>
        </div>
      </div>

      <div class="action-row">
        <el-button
            type="primary"
            icon="el-icon-search"
            size="medium"
            @click="initMessTableData"
            :loading="loading"
        >搜索私聊</el-button>
        <!-- 批量删除暂未实现，预留接口 -->
        <el-button
            type="danger"
            icon="el-icon-delete"
            size="medium"
            plain
            :disabled="multipleSelection.length === 0"
        >批量删除</el-button>
      </div>
    </div>

    <!-- 表格区域 -->
    <div class="card table-card" v-loading="loading" element-loading-text="加载数据...">
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

        <el-table-column label="发送者" width="160">
          <template slot-scope="scope">
            <div class="user-tag sender">
              <i class="el-icon-user"></i>
              <span>{{ scope.row.fromName }}</span>
            </div>
          </template>
        </el-table-column>

        <el-table-column width="40" align="center">
          <template slot-scope="scope">
            <i class="el-icon-right arrow-icon"></i>
          </template>
        </el-table-column>

        <el-table-column label="接收者" width="160">
          <template slot-scope="scope">
            <div class="user-tag receiver">
              <i class="el-icon-user"></i>
              <!-- 假设数据结构中有 toName -->
              <span>{{ scope.row.toName || '未知用户' }}</span>
            </div>
          </template>
        </el-table-column>

        <el-table-column prop="content" label="消息内容" min-width="250">
          <template slot-scope="scope">
            <!-- 文本 -->
            <div v-if="scope.row.type === 1" class="text-content">
              <span v-html="scope.row.content"></span>
            </div>
            <!-- 图片 -->
            <div v-else-if="scope.row.type === 2" class="img-content">
              <el-image
                  style="width: 60px; height: 60px; border-radius: 4px"
                  :src="scope.row.content"
                  :preview-src-list="[scope.row.content]"
                  fit="cover">
                <div slot="error" class="image-slot">
                  <i class="el-icon-picture-outline"></i>
                </div>
              </el-image>
            </div>
            <!-- 文件 -->
            <div v-else-if="scope.row.type === 3" class="file-content">
              <i class="el-icon-document file-icon"></i>
              <a :href="scope.row.content" target="_blank" class="file-link">下载文件</a>
              <span class="file-hint">(点击下载)</span>
            </div>
            <div v-else class="text-content">{{ scope.row.content }}</div>
          </template>
        </el-table-column>

        <el-table-column prop="createTime" label="发送时间" width="170" align="center" sortable>
          <template slot-scope="scope">
            <span class="time-tag">{{ scope.row.createTime }}</span>
          </template>
        </el-table-column>

        <el-table-column label="操作" width="100" align="center" fixed="right">
          <template slot-scope="scope">
            <el-button
                size="mini"
                type="text"
                class="delete-btn"
                icon="el-icon-delete"
                @click="handleDelete(scope.row)"
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
import { reqGetPrivateMsgLogs, reqDeletePrivateMsgById } from "../../utils/api";

export default {
  name: "PrivateChatRecord",
  data() {
    return {
      nameKeyword: '',
      dateScope: null,
      msgTypeRadio: null,
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
    // 获取数据
    initMessTableData() {
      this.loading = true;
      let params = {
        page: this.currentPage,
        size: this.pageSize,
        keyword: this.nameKeyword,
        type: this.msgTypeRadio,
        dateScope: this.dateScope
      };

      reqGetPrivateMsgLogs(params).then(resp => {
        this.loading = false;
        if (resp) {
          this.tableData = resp.data;
          this.total = resp.total;
        }
      }).catch(() => {
        this.loading = false;
      });
    },
    // 单条删除
    handleDelete(row) {
      this.$confirm('此操作将永久删除该条私聊记录, 是否继续?', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        reqDeletePrivateMsgById(row.id).then(resp => {
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
    handleSelectionChange(val) {
      this.multipleSelection = val;
    },
    handleSizeChange(val) {
      this.pageSize = val;
      this.initMessTableData();
    },
    handleCurrentChange(val) {
      this.currentPage = val;
      this.initMessTableData();
    }
  }
}
</script>

<style scoped lang="scss">
.page-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  gap: 15px;
  background-color: #f1f5f9;
  padding: 15px;
  box-sizing: border-box;
}

.card {
  background: #ffffff;
  border-radius: 12px;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
  padding: 20px;
  transition: all 0.3s ease;
}

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

.table-card {
  padding: 0;
  flex: 1;
  overflow: hidden;
  border-top: 3px solid #4f46e5;
}

/* --- 表格内容样式 --- */

/* 用户标签 */
.user-tag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
}

.user-tag.sender {
  background-color: #eef2ff;
  color: #4f46e5;
}

.user-tag.receiver {
  background-color: #f0fdf4;
  color: #166534;
}

.arrow-icon {
  color: #cbd5e1;
  font-size: 14px;
}

.text-content {
  color: #334155;
  line-height: 1.6;
}

.img-content {
  display: flex;
  align-items: center;
  gap: 12px;
}

.file-hint {
  font-size: 12px;
  color: #94a3b8;
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

.file-content {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #4f46e5;
}

.file-link {
  color: #4f46e5;
  text-decoration: underline;
}

.time-tag {
  color: #94a3b8;
  font-size: 13px;
  font-family: monospace;
}

.delete-btn {
  color: #ef4444;
}
.delete-btn:hover {
  color: #dc2626;
  text-decoration: underline;
}

.pagination-area {
  background: #fff;
  padding: 15px 20px;
  border-radius: 12px;
  display: flex;
  justify-content: flex-end;
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
}
</style>
