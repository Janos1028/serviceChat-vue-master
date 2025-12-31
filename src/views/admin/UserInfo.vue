<template>
  <div class="page-container">
    <!-- 顶部工具栏 -->
    <div class="card toolbar-card">
      <div class="filter-row">
        <div class="filter-item">
          <span class="label">用户搜索</span>
          <el-input
              placeholder="输入昵称搜索"
              prefix-icon="el-icon-search"
              v-model="nameKeyword"
              size="medium"
              class="filter-input"
              clearable
              @clear="initUserData"
              @keyup.enter.native="initUserData"
          ></el-input>
        </div>

        <div class="filter-item">
          <span class="label">账号状态</span>
          <el-select v-model="stateValue" placeholder="请选择状态" size="medium" class="filter-select" @change="initUserData">
            <el-option label="全部" value=""></el-option>
            <el-option label="已锁定" value="0"></el-option>
            <el-option label="正常" value="1"></el-option>
          </el-select>
        </div>
      </div>

      <div class="btn-row">
        <el-button type="primary" size="medium" icon="el-icon-search" @click="initUserData" class="primary-btn">查询</el-button>
        <el-button size="medium" icon="el-icon-refresh" @click="refreshTable" class="reset-btn">刷新</el-button>
        <div class="spacer"></div>
        <el-button
            type="danger"
            size="medium"
            icon="el-icon-delete"
            :disabled="multipleSelection.length===0"
            @click="handleMultiDelete"
            plain
            class="danger-btn"
        >批量删除</el-button>
      </div>
    </div>

    <!-- 数据表格区域 -->
    <div class="card table-card">
      <el-table
          :data="userData"
          style="width: 100%"
          height="100%"
          v-loading="loading"
          @selection-change="handleSelectionChange"
          :header-cell-style="{background:'#f8fafc', color:'#475569', fontWeight:'600', borderBottom: '1px solid #e2e8f0'}"
          class="custom-table"
      >
        <el-table-column type="selection" width="55" align="center"></el-table-column>
        <el-table-column prop="id" label="ID" width="80" align="center" sortable></el-table-column>

        <el-table-column label="用户信息" min-width="240">
          <template slot-scope="scope">
            <div class="user-info-cell">
              <el-avatar :size="42" :src="scope.row.userProfile" class="cell-avatar" icon="el-icon-user-solid"></el-avatar>
              <div class="cell-text">
                <span class="cell-nickname">{{ scope.row.nickname }}</span>
                <span class="cell-username">@{{ scope.row.username }}</span>
              </div>
            </div>
          </template>
        </el-table-column>


        <el-table-column label="账号状态" width="120" align="center">
          <template slot-scope="scope">
            <div class="status-badge" :class="scope.row.accountNonLocked ? 'status-active' : 'status-locked'">
              <span class="dot"></span>
              {{ scope.row.accountNonLocked ? '正常' : '已锁定' }}
            </div>
          </template>
        </el-table-column>

        <el-table-column label="状态控制" width="120" align="center">
          <template slot-scope="scope">
            <el-switch
                v-model="scope.row.accountNonLocked"
                active-color="#10b981"
                inactive-color="#cbd5e1"
                @change="changeLockedStatus(scope.row)"
            ></el-switch>
          </template>
        </el-table-column>

        <el-table-column label="操作" align="center" width="120">
          <template slot-scope="scope">
            <el-button
                size="mini"
                type="text"
                class="action-btn delete-text"
                icon="el-icon-delete"
                @click="handleDelete(scope.row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>
  </div>
</template>

<script>
// 引入封装好的 API 方法
import {
  reqGetAllUsers,
  reqUpdateUserStatus,
  reqDeleteUser,
  reqDeleteUserByIds,
  reqGetAllUsersByPage, reqChangeUserLockedStatus
} from '../../utils/api';

export default {
  name: "UserInfo",
  data(){
    return{
      userData:[],
      loading:false,
      multipleSelection:[],
      nameKeyword:'',
      stateValue:'',
    }
  },
  mounted() {
    this.initUserData();
  },
  methods:{
    refreshTable(){
      this.nameKeyword='';
      this.stateValue='';
      this.initUserData();
    },

    // 获取用户列表
    initUserData(){
      this.loading = true;

      // 构造参数
      const params = {
        keyword: this.nameKeyword
      };
      if (this.stateValue !== '') {
        params.isLocked = this.stateValue;
      }

      // 调用封装好的 API
      // 在 initUserData 方法中
      reqGetAllUsersByPage(params).then(resp => {
        this.loading = false;
        if (resp && resp.data) {
          // 将后端的 isLocked 字段转换为前端使用的 accountNonLocked 字段
          this.userData = resp.data.map(user => ({
            ...user,
            // 将 isLocked 转换为 accountNonLocked（取反）
            accountNonLocked: !user.isLocked
          }));
        }
      }).catch(() => {
        this.loading = false;
      });

    },

    // 修改锁定状态
    changeLockedStatus(data){
      // 构造更新参数
      const params = {
        id: data.id,
        isLocked: !data.accountNonLocked
      }

      reqUpdateUserStatus(params).then(resp => {
        if(resp){
          this.$message.success("状态更新成功");
          // this.initUserData(); // 可选：更新后是否刷新列表，或者直接信赖 switch 的变化
        } else {
          // 如果失败，把 switch 状态拨回去
          data.accountNonLocked = !data.accountNonLocked;
        }
      }).catch(()=>{
        data.accountNonLocked = !data.accountNonLocked;
      });
    },

    // 删除单个用户
    handleDelete(data){
      this.$confirm('此操作将永久删除用户【'+data.nickname+'】, 是否继续?', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        reqDeleteUser(data.id).then(resp => {
          if (resp){
            this.initUserData();
          }
        })
      }).catch(() => {});
    },

    handleSelectionChange(val){
      this.multipleSelection = val;
    },

    // 批量删除用户
    handleMultiDelete(){
      this.$confirm('此操作将永久删除【'+this.multipleSelection.length+'】个用户, 是否继续?', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        // 提取 ID 数组
        const ids = this.multipleSelection.map(item => item.id);

        // 调用批量删除接口，通常需要传 ids 参数
        reqDeleteUserByIds({ ids: ids }).then(resp => {
          if (resp){
            this.initUserData();
          }
        })
      }).catch(() => {});
    }
  }
}
</script>

<style scoped>
.page-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
  height: 100%;
}

.card {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
  border: 1px solid #f1f5f9;
}

.toolbar-card {
  padding: 16px 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.filter-row {
  display: flex;
  flex-wrap: wrap;
  gap: 32px;
  padding-bottom: 16px;
  border-bottom: 1px dashed #e2e8f0;
}

.filter-item {
  display: flex;
  align-items: center;
  gap: 10px;
}

.label {
  font-size: 14px;
  color: #64748b;
  font-weight: 500;
}

.filter-input {
  width: 200px;
}

.filter-select {
  width: 140px;
}

.btn-row {
  display: flex;
  gap: 12px;
  align-items: center;
}

.spacer {
  flex: 1;
}

/* 按钮风格 */
.primary-btn {
  background-color: #4f46e5;
  border-color: #4f46e5;
}
.primary-btn:hover {
  background-color: #4338ca;
  border-color: #4338ca;
}
.reset-btn:hover {
  color: #4f46e5;
  border-color: #c7d2fe;
  background-color: #eef2ff;
}
.danger-btn {
  /* 使用 Element 默认 danger 样式即可 */
}

.table-card {
  padding: 0;
  flex: 1;
  overflow: hidden;
  border-top: 3px solid #4f46e5;
}

/* 用户信息单元格 */
.user-info-cell {
  display: flex;
  align-items: center;
  gap: 12px;
}

.cell-avatar {
  border: 2px solid #eef2ff;
  background-color: #f8fafc;
}

.cell-text {
  display: flex;
  flex-direction: column;
}

.cell-nickname {
  font-weight: 600;
  color: #1e293b;
  font-size: 14px;
}

.cell-username {
  font-size: 12px;
  color: #64748b;
}

/* 状态徽章 */
.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  border-radius: 9999px;
  font-size: 12px;
  font-weight: 500;
}

.dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

.status-active {
  background-color: #f0fdf4;
  color: #166534;
}
.status-active .dot {
  background-color: #16a34a;
}

.status-locked {
  background-color: #fef2f2;
  color: #991b1b;
}
.status-locked .dot {
  background-color: #ef4444;
}

.action-btn {
  font-size: 13px;
  padding: 4px 8px;
}

.delete-text {
  color: #ef4444;
}
.delete-text:hover {
  color: #dc2626;
  text-decoration: underline;
}
</style>
