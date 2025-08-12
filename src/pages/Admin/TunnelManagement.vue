<template>
  <n-space vertical>
    <n-card title="隧道管理">
      <n-space justify="space-between">
        <n-space>
          <n-input v-model:value="searchKeyword" placeholder="搜索隧道名称/用户" style="max-width: 280px" />
          <n-select v-model:value="filterState" :options="stateOptions" placeholder="状态筛选" style="min-width: 120px" />
          <n-select v-model:value="filterType" :options="typeOptions" placeholder="类型筛选" style="min-width: 120px" />
        </n-space>
        <n-space>
          <n-button :loading="loading" @click="loadTunnels">刷新</n-button>
          <n-button type="primary" @click="openCreateDialog">创建隧道</n-button>
        </n-space>
      </n-space>
      
      <n-data-table 
        :columns="columns" 
        :data="filteredTunnels" 
        :loading="loading" 
        :pagination="pagination"
        @update:page="handlePageChange"
        style="margin-top: 12px" 
      />
    </n-card>

    <!-- 创建/编辑隧道对话框 -->
    <n-modal v-model:show="showDialog" preset="dialog" :title="editingTunnel ? '编辑隧道' : '创建隧道'">
      <n-form :model="tunnelForm" :rules="formRules" ref="formRef">
        <n-form-item label="隧道名称" path="name">
          <n-input v-model:value="tunnelForm.name" placeholder="请输入隧道名称" />
        </n-form-item>
        <n-form-item label="用户" path="userid">
          <n-select 
            v-model:value="tunnelForm.userid" 
            :options="userOptions" 
            placeholder="选择用户"
            filterable
          />
        </n-form-item>
        <n-form-item label="节点" path="node_id">
          <n-select 
            v-model:value="tunnelForm.node_id" 
            :options="nodeOptions" 
            placeholder="选择节点"
            filterable
          />
        </n-form-item>
        <n-form-item label="本地IP" path="localip">
          <n-input v-model:value="tunnelForm.localip" placeholder="127.0.0.1" />
        </n-form-item>
        <n-form-item label="本地端口" path="localport">
          <n-input-number v-model:value="tunnelForm.localport" :min="1" :max="65535" />
        </n-form-item>
        <n-form-item label="远程端口" path="nport">
          <n-input-number v-model:value="tunnelForm.nport" :min="1" :max="65535" />
        </n-form-item>
        <n-form-item label="隧道类型" path="type">
          <n-select v-model:value="tunnelForm.type" :options="typeOptions" />
        </n-form-item>
        <n-form-item label="自定义域名" path="dorp">
          <n-input v-model:value="tunnelForm.dorp" placeholder="可选" />
        </n-form-item>
        <n-form-item label="最大连接数" path="max_conns">
          <n-input-number v-model:value="tunnelForm.max_conns" :min="1" :max="1000" />
        </n-form-item>
        <n-form-item label="加密" path="encryption">
          <n-switch v-model:value="tunnelForm.encryption" />
        </n-form-item>
        <n-form-item label="压缩" path="compression">
          <n-switch v-model:value="tunnelForm.compression" />
        </n-form-item>
      </n-form>
      <template #action>
        <n-space>
          <n-button @click="showDialog = false">取消</n-button>
          <n-button type="primary" :loading="saving" @click="saveTunnel">保存</n-button>
        </n-space>
      </template>
    </n-modal>

    <!-- 批量操作对话框 -->
    <n-modal v-model:show="showBatchDialog" preset="dialog" title="批量操作">
      <n-space vertical>
        <n-alert type="warning" title="警告">
          此操作将影响选中的 {{ selectedTunnelIds.length }} 个隧道，请谨慎操作！
        </n-alert>
        <n-select v-model:value="batchAction" :options="batchActionOptions" placeholder="选择操作" />
      </n-space>
      <template #action>
        <n-space>
          <n-button @click="showBatchDialog = false">取消</n-button>
          <n-button type="error" :loading="batchProcessing" @click="executeBatchAction">确认执行</n-button>
        </n-space>
      </template>
    </n-modal>
  </n-space>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, h } from 'vue';
import { NButton, NTag, NSpace, useMessage, useDialog } from 'naive-ui';
import axios from 'axios';

const message = useMessage();
const dialog = useDialog();

// 响应式数据
const loading = ref(false);
const saving = ref(false);
const batchProcessing = ref(false);
const tunnels = ref<any[]>([]);
const users = ref<any[]>([]);
const nodes = ref<any[]>([]);
const searchKeyword = ref('');
const filterState = ref('');
const filterType = ref('');
const showDialog = ref(false);
const showBatchDialog = ref(false);
const editingTunnel = ref<any>(null);
const selectedTunnelIds = ref<number[]>([]);
const batchAction = ref('');

// 分页
const pagination = ref({
  page: 1,
  pageSize: 20,
  total: 0,
  showSizePicker: true,
  pageSizes: [10, 20, 50, 100]
});

// 选项数据
const stateOptions = [
  { label: '全部', value: '' },
  { label: '在线', value: 'online' },
  { label: '离线', value: 'offline' },
  { label: '错误', value: 'error' }
];

const typeOptions = [
  { label: '全部', value: '' },
  { label: 'TCP', value: 'tcp' },
  { label: 'UDP', value: 'udp' },
  { label: 'HTTP', value: 'http' },
  { label: 'HTTPS', value: 'https' }
];

const batchActionOptions = [
  { label: '批量启用', value: 'enable' },
  { label: '批量禁用', value: 'disable' },
  { label: '批量删除', value: 'delete' }
];

// 表单数据
const tunnelForm = ref({
  name: '',
  userid: null,
  node_id: null,
  localip: '127.0.0.1',
  localport: 80,
  nport: null,
  type: 'tcp',
  dorp: '',
  encryption: false,
  compression: false,
  max_conns: 10
});

// 表单验证规则
const formRules = {
  name: { required: true, message: '请输入隧道名称', trigger: 'blur' },
  userid: { required: true, message: '请选择用户', trigger: 'change' },
  node_id: { required: true, message: '请选择节点', trigger: 'change' },
  localport: { required: true, message: '请输入本地端口', trigger: 'blur' },
  type: { required: true, message: '请选择隧道类型', trigger: 'change' }
};

// 计算属性
const filteredTunnels = computed(() => {
  let result = tunnels.value;
  
  if (searchKeyword.value) {
    const keyword = searchKeyword.value.toLowerCase();
    result = result.filter(t => 
      t.name.toLowerCase().includes(keyword) ||
      t.username.toLowerCase().includes(keyword)
    );
  }
  
  if (filterState.value) {
    result = result.filter(t => t.state === filterState.value);
  }
  
  if (filterType.value) {
    result = result.filter(t => t.type === filterType.value);
  }
  
  return result;
});

const userOptions = computed(() => 
  users.value.map(u => ({ label: `${u.username} (${u.usergroup})`, value: u.id }))
);

const nodeOptions = computed(() => 
  nodes.value.map(n => ({ label: `${n.name} (${n.location})`, value: n.id }))
);

// 表格列定义
const columns = [
  { title: 'ID', key: 'id', width: 80 },
  { title: '隧道名称', key: 'name' },
  { title: '用户', key: 'username' },
  { title: '节点', key: 'node_name' },
  { title: '类型', key: 'type', render: (row: any) => h(NTag, { type: getTypeColor(row.type) }, { default: () => row.type.toUpperCase() }) },
  { title: '状态', key: 'state', render: (row: any) => h(NTag, { type: getStateColor(row.state) }, { default: () => getStateText(row.state) }) },
  { title: '本地地址', key: 'localip', render: (row: any) => `${row.localip}:${row.localport}` },
  { title: '远程端口', key: 'nport' },
  { title: '连接数', key: 'cur_conns' },
  { title: '创建时间', key: 'created_at', render: (row: any) => new Date(row.created_at).toLocaleString() },
  {
    title: '操作',
    key: 'actions',
    width: 200,
    render: (row: any) => h(NSpace, { size: 'small' }, {
      default: () => [
        h(NButton, { size: 'small', onClick: () => editTunnel(row) }, { default: () => '编辑' }),
        h(NButton, { size: 'small', type: 'error', onClick: () => deleteTunnel(row.id) }, { default: () => '删除' })
      ]
    })
  }
];

// 方法
function getTypeColor(type: string) {
  const colors = { tcp: 'blue', udp: 'green', http: 'orange', https: 'purple' };
  return colors[type] || 'default';
}

function getStateColor(state: string) {
  const colors = { online: 'success', offline: 'warning', error: 'error' };
  return colors[state] || 'default';
}

function getStateText(state: string) {
  const texts = { online: '在线', offline: '离线', error: '错误' };
  return texts[state] || state;
}

async function loadTunnels() {
  loading.value = true;
  try {
    const base = (import.meta as any).env?.VITE_API_BASE_URL || '';
    const token = localStorage.getItem('token');
    const resp = await axios.get(`${base}/tunnels?token=${token}&page=${pagination.value.page}&limit=${pagination.value.pageSize}`);
    
    if (resp.data?.code === 200) {
      tunnels.value = resp.data.data.tunnels || [];
      pagination.value.total = resp.data.data.pagination.total;
    }
  } catch (e: any) {
    message.error('加载隧道失败: ' + (e?.message || e));
  } finally {
    loading.value = false;
  }
}

async function loadUsers() {
  try {
    const base = (import.meta as any).env?.VITE_API_BASE_URL || '';
    const token = localStorage.getItem('token');
    const resp = await axios.get(`${base}/users?token=${token}`);
    if (resp.data?.code === 200) {
      users.value = resp.data.data.users || [];
    }
  } catch (e: any) {
    console.error('加载用户失败:', e);
  }
}

async function loadNodes() {
  try {
    const base = (import.meta as any).env?.VITE_API_BASE_URL || '';
    const resp = await axios.get(`${base}/nodes`);
    if (resp.data?.code === 200) {
      nodes.value = resp.data.data || [];
    }
  } catch (e: any) {
    console.error('加载节点失败:', e);
  }
}

function openCreateDialog() {
  editingTunnel.value = null;
  tunnelForm.value = {
    name: '',
    userid: null,
    node_id: null,
    localip: '127.0.0.1',
    localport: 80,
    nport: null,
    type: 'tcp',
    dorp: '',
    encryption: false,
    compression: false,
    max_conns: 10
  };
  showDialog.value = true;
}

function editTunnel(tunnel: any) {
  editingTunnel.value = tunnel;
  tunnelForm.value = { ...tunnel };
  showDialog.value = true;
}

async function saveTunnel() {
  saving.value = true;
  try {
    const base = (import.meta as any).env?.VITE_API_BASE_URL || '';
    const token = localStorage.getItem('token');
    
    if (editingTunnel.value) {
      // 更新隧道
      await axios.put(`${base}/tunnels/${editingTunnel.value.id}?token=${token}`, tunnelForm.value);
      message.success('隧道更新成功');
    } else {
      // 创建隧道
      await axios.post(`${base}/tunnels?token=${token}`, tunnelForm.value);
      message.success('隧道创建成功');
    }
    
    showDialog.value = false;
    await loadTunnels();
  } catch (e: any) {
    message.error('保存失败: ' + (e?.response?.data?.msg || e?.message || e));
  } finally {
    saving.value = false;
  }
}

function deleteTunnel(id: number) {
  dialog.warning({
    title: '确认删除',
    content: '确定要删除这个隧道吗？此操作不可恢复。',
    positiveText: '确定',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        const base = (import.meta as any).env?.VITE_API_BASE_URL || '';
        const token = localStorage.getItem('token');
        await axios.delete(`${base}/tunnels/${id}?token=${token}`);
        message.success('删除成功');
        await loadTunnels();
      } catch (e: any) {
        message.error('删除失败: ' + (e?.response?.data?.msg || e?.message || e));
      }
    }
  });
}

function handlePageChange(page: number) {
  pagination.value.page = page;
  loadTunnels();
}

function openBatchDialog() {
  if (selectedTunnelIds.value.length === 0) {
    message.warning('请先选择要操作的隧道');
    return;
  }
  showBatchDialog.value = true;
}

async function executeBatchAction() {
  if (!batchAction.value) {
    message.warning('请选择操作类型');
    return;
  }
  
  batchProcessing.value = true;
  try {
    const base = (import.meta as any).env?.VITE_API_BASE_URL || '';
    const token = localStorage.getItem('token');
    
    await axios.post(`${base}/tunnels/batch?token=${token}`, {
      action: batchAction.value,
      tunnel_ids: selectedTunnelIds.value
    });
    
    message.success('批量操作执行成功');
    showBatchDialog.value = false;
    await loadTunnels();
  } catch (e: any) {
    message.error('批量操作失败: ' + (e?.response?.data?.msg || e?.message || e));
  } finally {
    batchProcessing.value = false;
  }
}

// 生命周期
onMounted(() => {
  loadTunnels();
  loadUsers();
  loadNodes();
});
</script>

<style scoped>
.n-card {
  margin-bottom: 16px;
}
</style>
