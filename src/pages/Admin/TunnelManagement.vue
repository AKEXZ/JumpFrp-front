<template>
  <n-space vertical>
  <n-card title="隧道列表">
      <n-space justify="space-between">
        <n-space>
          <n-input v-model:value="searchKeyword" placeholder="搜索隧道名称/用户" style="max-width: 280px" />
          <n-select v-model:value="filterState" :options="stateOptions" placeholder="状态筛选" style="min-width: 120px" />
          <n-select v-model:value="filterType" :options="typeOptions" placeholder="类型筛选" style="min-width: 120px" />
        </n-space>
        <n-space>
          <n-button :loading="loading" @click="loadTunnels">刷新</n-button>
          <n-button type="primary" @click="openCreateDialog">创建隧道</n-button>
          <!-- 客户端相关按钮已移除 -->
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
        <n-form-item v-if="isAdmin" label="用户" path="userid">
          <n-select 
            v-model:value="tunnelForm.userid" 
            :options="userOptions" 
            placeholder="选择用户（管理员可指定，不选则默认自己）"
            clearable
            filterable
          />
        </n-form-item>
        <n-form-item label="节点" path="node_id">
          <n-select 
            v-model:value="tunnelForm.node_id" 
            :options="nodeOptions" 
            placeholder="选择节点"
            filterable
            @update:value="(v:number|null)=>{ tunnelForm.node_id = v }"
          />
        </n-form-item>
        <n-form-item v-if="tunnelForm.node_id" label="节点详情">
          <n-card size="small" :bordered="false">
            <n-space vertical>
              <div v-if="selectedNode">
                <strong>{{ selectedNode.name }} ({{ selectedNode.location }})</strong>
                <div style="font-size: 12px; color: var(--n-text-color-3); margin-top: 4px;">
                  带宽: {{ selectedNode.bandwidth || 0 }} Mbps · 状态: {{ selectedNode.status === 'online' ? '在线' : '离线' }}
                </div>
                <n-space size="small" style="margin-top: 8px;">
                  <n-tag size="small" :type="selectedNode.defense ? 'success' : 'default'">防御</n-tag>
                  <n-tag size="small" :type="selectedNode.udp ? 'success' : 'default'">UDP</n-tag>
                  <n-tag size="small" :type="selectedNode.web ? 'success' : 'default'">建站</n-tag>
                  <n-tag size="small" :type="selectedNode.ipv6 ? 'success' : 'default'">IPv6</n-tag>
                </n-space>
              </div>
            </n-space>
          </n-card>
        </n-form-item>
        <n-form-item label="本地IP" path="localip">
          <n-input v-model:value="tunnelForm.localip" placeholder="127.0.0.1" />
        </n-form-item>
        <n-form-item label="本地端口" path="localport">
          <n-input-number v-model:value="tunnelForm.localport" :min="1" :max="65535" />
        </n-form-item>
  <!-- 远程端口区间已由后端分配，无需前端输入 -->
        <n-form-item label="隧道类型" path="type">
          <n-select v-model:value="tunnelForm.type" :options="typeOptions" />
        </n-form-item>
        <n-form-item label="自定义域名" path="dorp">
          <n-input v-model:value="tunnelForm.dorp" placeholder="可选" />
        </n-form-item>
  <!-- 最大连接数已移除 -->
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

    <!-- 客户端配置对话框 -->
    <n-modal v-model:show="showClientConfigDialog" preset="dialog" title="客户端配置管理" style="max-width: 800px;">
      <n-space vertical>
        <n-alert type="info" title="说明">
          这里可以查看和下载用户的FRP客户端配置文件，支持TOML、JSON、YAML格式
        </n-alert>
        
        <n-form-item v-if="isAdmin" label="选择用户">
          <n-select 
            v-model:value="selectedUserId" 
            :options="userOptions" 
            placeholder="选择要生成配置的用户"
            @update:value="loadClientConfig"
          />
        </n-form-item>
        
        <div v-if="clientConfigs.length > 0">
          <n-divider title-placement="left">配置预览</n-divider>
          <n-space vertical>
            <div v-for="(configGroup, index) in clientConfigs" :key="index" class="config-group">
              <n-card size="small" :title="`节点: ${configGroup.node.host}:${configGroup.node.port}`">
                <n-space vertical>
                  <div>
                    <strong>隧道数量:</strong> {{ configGroup.tunnels.length }}
                  </div>
                  <div>
                    <strong>Web管理端口:</strong> {{ configGroup.config.webServer.port }}
                  </div>
                  <div>
                    <strong>用户名:</strong> {{ configGroup.config.user }}
                  </div>
                  
                  <n-divider title-placement="left">隧道列表</n-divider>
                  <n-space vertical>
                    <div v-for="tunnel in configGroup.tunnels" :key="tunnel.id" class="tunnel-item">
                      <n-tag :type="getTypeColor(tunnel.type)" size="small">{{ tunnel.type.toUpperCase() }}</n-tag>
                      <span style="margin-left: 8px;">{{ tunnel.name }}</span>
                      <span style="color: var(--n-text-color-3); margin-left: 8px;">
                        {{ tunnel.localip }}:{{ tunnel.localport }}
                        <span v-if="tunnel.nport"> → {{ tunnel.nport }}</span>
                      </span>
                      <n-tag v-if="tunnel.dorp" size="small" type="info">{{ tunnel.dorp }}</n-tag>
                    </div>
                  </n-space>
                  
                  <n-divider title-placement="left">下载配置</n-divider>
                  <n-space>
                    <n-button size="small" @click="downloadConfig(configGroup.config, 'toml')">下载TOML</n-button>
                    <n-button size="small" @click="downloadConfig(configGroup.config, 'json')">下载JSON</n-button>
                    <n-button size="small" @click="downloadConfig(configGroup.config, 'yaml')">下载YAML</n-button>
                  </n-space>
                </n-space>
              </n-card>
            </div>
          </n-space>
        </div>
        
        <div v-else-if="selectedUserId && !loadingClientConfig" class="no-config">
          <n-empty description="该用户暂无隧道配置" />
        </div>
      </n-space>
      
      <template #action>
        <n-space>
          <n-button @click="showClientConfigDialog = false">关闭</n-button>
        </n-space>
      </template>
    </n-modal>

    <!-- 个人客户端配置对话框 -->
    <n-modal v-model:show="showMyClientConfigDialog" preset="dialog" title="我的客户端配置" style="max-width: 800px;">
      <n-space vertical>
        <n-alert type="info" title="说明">
          这里可以查看和下载您的FRP客户端配置文件，支持TOML、JSON、YAML格式
        </n-alert>
        
        <div v-if="myClientConfigs.length > 0">
          <n-divider title-placement="left">配置预览</n-divider>
          <n-space vertical>
            <div v-for="(configGroup, index) in myClientConfigs" :key="index" class="config-group">
              <n-card size="small" :title="`节点: ${configGroup.node.host}:${configGroup.node.port}`">
                <n-space vertical>
                  <div>
                    <strong>隧道数量:</strong> {{ configGroup.tunnels.length }}
                  </div>
                  <div>
                    <strong>Web管理端口:</strong> {{ configGroup.config.webServer.port }}
                  </div>
                  <div>
                    <strong>用户名:</strong> {{ configGroup.config.user }}
                  </div>
                  
                  <n-divider title-placement="left">隧道列表</n-divider>
                  <n-space vertical>
                    <div v-for="tunnel in configGroup.tunnels" :key="tunnel.id" class="tunnel-item">
                      <n-tag :type="getTypeColor(tunnel.type)" size="small">{{ tunnel.type.toUpperCase() }}</n-tag>
                      <span style="margin-left: 8px;">{{ tunnel.name }}</span>
                      <span style="color: var(--n-text-color-3); margin-left: 8px;">
                        {{ tunnel.localip }}:{{ tunnel.localport }}
                        <span v-if="tunnel.nport"> → {{ tunnel.nport }}</span>
                      </span>
                      <n-tag v-if="tunnel.dorp" size="small" type="info">{{ tunnel.dorp }}</n-tag>
                    </div>
                  </n-space>
                  
                  <n-divider title-placement="left">下载配置</n-divider>
                  <n-space>
                    <n-button size="small" @click="downloadMyConfig(configGroup.config, 'toml')">下载TOML</n-button>
                    <n-button size="small" @click="downloadMyConfig(configGroup.config, 'json')">下载JSON</n-button>
                    <n-button size="small" @click="downloadMyConfig(configGroup.config, 'yaml')">下载YAML</n-button>
                  </n-space>
                </n-space>
              </n-card>
            </div>
          </n-space>
        </div>
        
        <div v-else-if="!loadingMyClientConfig" class="no-config">
          <n-empty description="您暂无隧道配置，请先创建隧道" />
        </div>
      </n-space>
      
      <template #action>
        <n-space>
          <n-button @click="showMyClientConfigDialog = false">关闭</n-button>
        </n-space>
      </template>
    </n-modal>

    <!-- 客户端状态对话框 -->
    <n-modal v-model:show="showClientStatusDialog" preset="dialog" title="客户端状态管理" style="max-width: 900px;">
      <n-space vertical>
        <n-alert type="info" title="说明">
          这里可以查看和控制用户的FRP客户端状态，包括启动、停止、重启等操作
        </n-alert>
        
        <n-form-item v-if="isAdmin" label="选择用户">
          <n-select 
            v-model:value="selectedStatusUserId" 
            :options="userOptions" 
            placeholder="选择要查看状态的用户"
            @update:value="loadClientStatus"
          />
        </n-form-item>
        
        <div v-if="clientStatusData">
          <n-divider title-placement="left">用户信息</n-divider>
          <n-card size="small">
            <n-space>
              <span><strong>用户名:</strong> {{ clientStatusData.user?.username }}</span>
              <span><strong>用户组:</strong> {{ clientStatusData.user?.usergroup }}</span>
              <span><strong>带宽限制:</strong> {{ clientStatusData.user?.bandwidth || 0 }} Mbps</span>
              <span><strong>隧道数量:</strong> {{ clientStatusData.tunnels?.length || 0 }}</span>
            </n-space>
          </n-card>
          
          <n-divider title-placement="left">节点状态</n-divider>
          <n-space vertical>
            <div v-for="(statusInfo, index) in clientStatusData.client_statuses" :key="index" class="status-group">
              <n-card size="small" :title="`节点: ${statusInfo.node.name} (${statusInfo.node.host}:${statusInfo.node.port})`">
                <n-space vertical>
                  <div>
                    <strong>客户端状态:</strong> 
                    <n-tag :type="statusInfo.status?.is_running ? 'success' : 'error'" size="small">
                      {{ statusInfo.status?.is_running ? '运行中' : '已停止' }}
                    </n-tag>
                  </div>
                  <div>
                    <strong>配置文件:</strong> 
                    <n-tag :type="statusInfo.status?.config_exists ? 'success' : 'warning'" size="small">
                      {{ statusInfo.status?.config_exists ? '存在' : '不存在' }}
                    </n-tag>
                  </div>
                  
                  <div v-if="statusInfo.status?.user_info">
                    <strong>端口数量:</strong> {{ statusInfo.status.user_info.ports_count }}
                    <strong style="margin-left: 16px;">域名数量:</strong> {{ statusInfo.status.user_info.domains_count }}
                  </div>
                  
                  <n-divider title-placement="left">操作</n-divider>
                  <n-space>
                    <n-button 
                      size="small" 
                      type="success" 
                      :loading="statusInfo.controlling"
                      @click="controlClient(statusInfo.node.id, 'start', selectedStatusUserId)"
                    >
                      启动
                    </n-button>
                    <n-button 
                      size="small" 
                      type="warning" 
                      :loading="statusInfo.controlling"
                      @click="controlClient(statusInfo.node.id, 'stop', selectedStatusUserId)"
                    >
                      停止
                    </n-button>
                    <n-button 
                      size="small" 
                      type="info" 
                      :loading="statusInfo.controlling"
                      @click="controlClient(statusInfo.node.id, 'restart', selectedStatusUserId)"
                    >
                      重启
                    </n-button>
                  </n-space>
                </n-space>
              </n-card>
            </div>
          </n-space>
        </div>
        
        <div v-else-if="selectedStatusUserId && !loadingClientStatus" class="no-status">
          <n-empty description="该用户暂无隧道或客户端状态" />
        </div>
      </n-space>
      
      <template #action>
        <n-space>
          <n-button @click="showClientStatusDialog = false">关闭</n-button>
        </n-space>
      </template>
    </n-modal>
  </n-space>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, h, watch } from 'vue';
import { NButton, NTag, NSpace, useMessage, useDialog } from 'naive-ui';
import axios from 'axios';
import { useUserStore } from '@/stores/user';

const message = useMessage();
const dialog = useDialog();

// 响应式数据
const loading = ref(false);
const saving = ref(false);
const batchProcessing = ref(false);
const tunnels = ref<any[]>([]);
const users = ref<any[]>([]);
const isAdmin = computed(() => (useUserStore().userInfo?.usergroup || '') === 'admin');
const nodes = ref<any[]>([]);
const searchKeyword = ref('');
const filterState = ref('');
const filterType = ref('');
const showDialog = ref(false);
const formRef = ref<any>(null);
const showBatchDialog = ref(false);
const editingTunnel = ref<any>(null);
const selectedTunnelIds = ref<number[]>([]);
const batchAction = ref('');
const selectedNode = ref<any>(null); // 新增：用于存储选中的节点详情

// 客户端配置相关
const showClientConfigDialog = ref(false);
const selectedUserId = ref<number | null>(null);
const clientConfigs = ref<any[]>([]);
const loadingClientConfig = ref(false);

// 个人客户端配置相关
const showMyClientConfigDialog = ref(false);
const myClientConfigs = ref<any[]>([]);
const loadingMyClientConfig = ref(false);

// 客户端状态相关
const showClientStatusDialog = ref(false);
const selectedStatusUserId = ref<number | null>(null);
const clientStatusData = ref<any>(null);
const loadingClientStatus = ref(false);

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
type TunnelForm = {
  name: string;
  userid: number | null;
  node_id: number | null;
  localip: string;
  localport: number;
  type: 'tcp' | 'udp' | 'http' | 'https';
  dorp: string;
  encryption: boolean;
  compression: boolean;
};

const tunnelForm = ref<TunnelForm>({
  name: '',
  userid: null,
  node_id: null,
  localip: '127.0.0.1',
  localport: 80,
  type: 'tcp',
  dorp: '',
  encryption: false,
  compression: false
});

// 表单验证规则
const formRules = {
  name: { required: true, message: '请输入隧道名称', trigger: 'blur' },
  userid: { required: false },
  node_id: {
    required: true,
    validator: (_: any, value: any) => {
      if (value === null || value === undefined || value === '') return new Error('请选择节点');
      return true;
    },
    trigger: ['blur', 'change']
  },
  localport: {
    required: true,
    validator: (_: any, value: any) => {
      const num = Number(value);
      if (!num || isNaN(num)) return new Error('请输入本地端口');
      if (num < 1 || num > 65535) return new Error('端口范围为 1-65535');
      return true;
    },
    trigger: ['blur', 'change']
  },
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
  nodes.value.map(n => ({
    label: `${n.name} (${n.location})`,
    value: Number(n.id),
    meta: {
      defense: !!n.defense,
      udp: !!n.udp,
      web: !!n.web,
      bandwidth: n.bandwidth || 0,
      status: n.status || 'offline'
    }
  }))
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
function getTypeColor(type: string): 'default' | 'primary' | 'success' | 'info' | 'warning' | 'error' {
  const colors: Record<string, 'default' | 'primary' | 'success' | 'info' | 'warning' | 'error'> = {
    tcp: 'primary',
    udp: 'success',
    http: 'warning',
    https: 'info'
  };
  return colors[type] || 'default';
}

function getStateColor(state: string): 'default' | 'primary' | 'success' | 'info' | 'warning' | 'error' {
  const colors: Record<string, 'default' | 'primary' | 'success' | 'info' | 'warning' | 'error'> = {
    online: 'success',
    offline: 'warning',
    error: 'error'
  };
  return colors[state] || 'default';
}

function getStateText(state: string) {
  const texts: Record<string, string> = { online: '在线', offline: '离线', error: '错误' };
  return texts[state] || state;
}

async function loadTunnels() {
  loading.value = true;
  try {
    const base = (import.meta as any).env?.VITE_API_BASE_URL || '';
    const token = useUserStore().userInfo?.usertoken || '';
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
    const token = useUserStore().userInfo?.usertoken || '';
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
    const token = useUserStore().userInfo?.usertoken || '';
    const resp = await axios.get(`${base}/nodes`, { params: { token, _: Date.now() } });
    if (resp.data?.code === 200) {
      nodes.value = resp.data.data || [];
      // 若对话框已打开且未选择节点，则默认选中第一个节点
      if (showDialog.value && !tunnelForm.value.node_id && nodes.value.length > 0) {
        tunnelForm.value.node_id = Number(nodes.value[0].id);
      }
    }
  } catch (e: any) {
    console.error('加载节点失败:', e);
  }
}



async function openCreateDialog() {
  editingTunnel.value = null;
  tunnelForm.value = {
    name: '',
    userid: isAdmin.value ? null : (useUserStore().userInfo?.id || null),
    node_id: null,
    localip: '127.0.0.1',
    localport: 80,
    type: 'tcp',
    dorp: '',
    encryption: false,
    compression: false
  };
  if (!nodes.value.length) await loadNodes();
  showDialog.value = true;
  if (!tunnelForm.value.node_id && nodes.value.length > 0) {
    tunnelForm.value.node_id = Number(nodes.value[0].id);
  }
}

function editTunnel(tunnel: any) {
  editingTunnel.value = tunnel;
  tunnelForm.value = {
    ...tunnel,
    node_id: tunnel.node_id != null ? Number(tunnel.node_id) : null,
    encryption: !!tunnel.encryption,
    compression: !!tunnel.compression
  } as any;
  showDialog.value = true;
}

async function saveTunnel() {
  saving.value = true;
  try {
    // 表单校验
    try {
      await formRef.value?.validate?.();
    } catch (ve) {
      saving.value = false;
      return;
    }
    const base = (import.meta as any).env?.VITE_API_BASE_URL || '';
    const token = useUserStore().userInfo?.usertoken || '';
    // 非管理员不传 userid，或确保为自己
    // 只保留后端需要的字段
    const payload: any = {
      name: tunnelForm.value.name,
      node_id: tunnelForm.value.node_id,
      userid: isAdmin.value ? tunnelForm.value.userid : undefined,
      localip: tunnelForm.value.localip || '127.0.0.1',
      localport: tunnelForm.value.localport,
      type: tunnelForm.value.type,
      dorp: tunnelForm.value.dorp || '',
      encryption: tunnelForm.value.encryption || false,
      compression: tunnelForm.value.compression || false
    };
    if (!isAdmin.value) delete payload.userid;
    // 过滤掉 undefined
    Object.keys(payload).forEach(k => payload[k] === undefined && delete payload[k]);
    if (editingTunnel.value) {
      await axios.put(`${base}/tunnels/${editingTunnel.value.id}?token=${token}`, payload);
      message.success('隧道更新成功');
    } else {
      const resp = await axios.post(`${base}/tunnels?token=${token}`, payload);
      if (resp.data && resp.data.data) {
        message.success(`隧道创建成功，端口：${resp.data.data.remoteport} 域名：${resp.data.data.domain}`);
      } else {
        message.success('隧道创建成功');
      }
    }
    showDialog.value = false;
    await loadTunnels();
  } catch (e: any) {
    const detail = e?.response?.data?.msg || e?.message || (typeof e === 'string' ? e : JSON.stringify(e));
    message.error('保存失败: ' + detail);
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
        const token = useUserStore().userInfo?.usertoken || '';
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
    const token = useUserStore().userInfo?.usertoken || '';
    
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
  if (isAdmin.value) loadUsers();
  loadNodes();
});

// 当节点数据异步返回或对话框打开时，若未选择节点则选中第一个
watch([showDialog, nodes], () => {
  if (showDialog.value && !tunnelForm.value.node_id && nodes.value.length > 0) {
    tunnelForm.value.node_id = Number(nodes.value[0].id);
  }
});

// 当隧道表单中的节点ID改变时，更新选中的节点详情
watch(() => tunnelForm.value.node_id, (newVal) => {
  if (newVal !== null && newVal !== undefined) {
    selectedNode.value = nodes.value.find(node => node.id === newVal);
  } else {
    selectedNode.value = null;
  }
});

// 客户端配置相关方法
function openClientConfigDialog() {
  showClientConfigDialog.value = true;
  selectedUserId.value = null;
  clientConfigs.value = [];
}

async function loadClientConfig(userId: number) {
  if (!userId) return;
  
  loadingClientConfig.value = true;
  try {
    const base = (import.meta as any).env?.VITE_API_BASE_URL || '';
    const token = useUserStore().userInfo?.usertoken || '';
    const resp = await axios.get(`${base}/tunnels/client-config/${userId}?token=${token}`);
    
    if (resp.data?.code === 200) {
      clientConfigs.value = resp.data.data.configs || [];
    } else {
      message.error('加载客户端配置失败: ' + (resp.data?.msg || '未知错误'));
    }
  } catch (e: any) {
    message.error('加载客户端配置失败: ' + (e?.message || e));
  } finally {
    loadingClientConfig.value = false;
  }
}

async function downloadConfig(config: any, format: string) {
  try {
    const base = (import.meta as any).env?.VITE_API_BASE_URL || '';
    const token = useUserStore().userInfo?.usertoken || '';
    const userId = selectedUserId.value;
    
    if (!userId) {
      message.error('请先选择用户');
      return;
    }
    
    // 创建下载链接
    const url = `${base}/tunnels/download-config/${userId}?token=${token}&format=${format}`;
    const link = document.createElement('a');
    link.href = url;
    link.download = `frpc_${config.user || userId}.${format}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    message.success(`${format.toUpperCase()}配置文件下载成功`);
  } catch (e: any) {
    message.error('下载配置文件失败: ' + (e?.message || e));
  }
}

function openMyClientConfigDialog() {
  showMyClientConfigDialog.value = true;
  myClientConfigs.value = [];
  loadMyClientConfig();
}

async function loadMyClientConfig() {
  loadingMyClientConfig.value = true;
  try {
    const base = (import.meta as any).env?.VITE_API_BASE_URL || '';
    const token = useUserStore().userInfo?.usertoken || '';
    const userId = useUserStore().userInfo?.id || null;

    if (!userId) {
      message.error('未登录或用户ID获取失败');
      loadingMyClientConfig.value = false;
      return;
    }

    const resp = await axios.get(`${base}/tunnels/client-config/${userId}?token=${token}`);
    
    if (resp.data?.code === 200) {
      myClientConfigs.value = resp.data.data.configs || [];
    } else {
      message.error('加载客户端配置失败: ' + (resp.data?.msg || '未知错误'));
    }
  } catch (e: any) {
    message.error('加载客户端配置失败: ' + (e?.message || e));
  } finally {
    loadingMyClientConfig.value = false;
  }
}

async function downloadMyConfig(config: any, format: string) {
  try {
    const base = (import.meta as any).env?.VITE_API_BASE_URL || '';
    const token = useUserStore().userInfo?.usertoken || '';
    const userId = useUserStore().userInfo?.id || null;
    
    if (!userId) {
      message.error('未登录或用户ID获取失败');
      return;
    }
    
    // 创建下载链接
    const url = `${base}/tunnels/download-config/${userId}?token=${token}&format=${format}`;
    const link = document.createElement('a');
    link.href = url;
    link.download = `frpc_${config.user || userId}.${format}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    message.success(`${format.toUpperCase()}配置文件下载成功`);
  } catch (e: any) {
    message.error('下载配置文件失败: ' + (e?.message || e));
  }
}

// 客户端状态相关方法
function openClientStatusDialog() {
  showClientStatusDialog.value = true;
  selectedStatusUserId.value = null;
  clientStatusData.value = null;
}

async function loadClientStatus(userId: number) {
  if (!userId) {
    clientStatusData.value = null;
    return;
  }

  loadingClientStatus.value = true;
  try {
    const base = (import.meta as any).env?.VITE_API_BASE_URL || '';
    const token = useUserStore().userInfo?.usertoken || '';
    const resp = await axios.get(`${base}/tunnels/client-status/${userId}?token=${token}`);
    
    if (resp.data?.code === 200) {
      clientStatusData.value = resp.data.data;
    } else {
      message.error('加载客户端状态失败: ' + (resp.data?.msg || '未知错误'));
    }
  } catch (e: any) {
    message.error('加载客户端状态失败: ' + (e?.message || e));
  } finally {
    loadingClientStatus.value = false;
  }
}

async function controlClient(nodeId: number, action: 'start' | 'stop' | 'restart', userId: number | null) {
  if (!userId) {
    message.error('请先选择用户');
    return;
  }

  if (!confirm(`确定要${action}此节点的客户端吗？`)) {
    return;
  }

  try {
    const base = (import.meta as any).env?.VITE_API_BASE_URL || '';
    const token = useUserStore().userInfo?.usertoken || '';
    await axios.post(`${base}/tunnels/client-control/${userId}?token=${token}`, {
      action: action,
      node_id: nodeId
    });
    message.success(`客户端${action}成功`);
    await loadClientStatus(userId); // 重新加载状态
  } catch (e: any) {
    message.error(`客户端${action}失败: ` + (e?.response?.data?.msg || e?.message || e));
  }
}
</script>

<style scoped>
.n-card {
  margin-bottom: 16px;
}

.config-group {
  margin-bottom: 16px;
}

.tunnel-item {
  padding: 8px;
  border: 1px solid var(--n-border-color);
  border-radius: 4px;
  background: var(--n-color);
}

.no-config {
  text-align: center;
  padding: 40px 0;
}

.status-group {
  margin-bottom: 16px;
}

.no-status {
  text-align: center;
  padding: 40px 0;
}
</style>
