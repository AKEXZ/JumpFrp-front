<template>
  <n-space vertical>
    <n-card title="节点列表">
      <n-space justify="space-between">
        <n-input v-model:value="keyword" placeholder="搜索节点名称/地区" style="max-width: 280px" />
        <n-space>
          <n-button :loading="loading" @click="loadNodes">刷新</n-button>
          <n-button type="primary" @click="openCreate">新增节点</n-button>
        </n-space>
      </n-space>
      <n-data-table :columns="nodeColumns" :data="filteredNodes" :row-key="rowKey" :loading="loading" style="margin-top: 12px" />
    </n-card>

    <n-card title="节点配置">
      <n-space>
        <n-select v-model:value="activeNodeId" :options="nodeOptions" placeholder="选择节点" style="min-width: 220px" />
  <!-- 读取配置/保存配置按钮已移除 -->
        <n-button :disabled="!activeNodeId" tag="a" :href="logsUrl" target="_blank">查看日志(SSE)</n-button>
      </n-space>
  <!-- 配置内容输入已移除 -->
    </n-card>

    <n-grid cols="1 m:2" x-gap="12" y-gap="12">
      <n-grid-item>
        <n-card title="代理列表">
          <n-space>
            <!-- 代理类型选择已移除 -->
            <n-button :disabled="!activeNodeId" :loading="proxyLoading" @click="loadProxies">加载</n-button>
          </n-space>
          <n-data-table :columns="proxyColumns" :data="proxies" :loading="proxyLoading" style="margin-top: 12px" />
        </n-card>
      </n-grid-item>
      <n-grid-item>
        <n-card title="客户端">
          <n-space>
            <n-button :disabled="!activeNodeId" :loading="clientLoading" @click="loadClients">加载</n-button>
          </n-space>
          <n-data-table :columns="clientColumns" :data="clients" :loading="clientLoading" style="margin-top: 12px" />
        </n-card>
      </n-grid-item>
    </n-grid>
  </n-space>
  <n-modal v-model:show="show" preset="dialog" :title="editing? '编辑节点': '新增节点'">
    <n-space vertical>
      <n-alert v-if="lastError" type="error" :show-icon="true">{{ lastError }}</n-alert>
      <n-alert type="info" :show-icon="true">
        若目标服务器的 SSH 未开启或非 22 端口，请填写下方 SSH 端口/用户名/密码；
        未填写时将仅探测 TCP 22 端口，无法连通会报错。
      </n-alert>
    </n-space>
    <n-form :model="form" :rules="formRules" ref="formRef">
      <n-form-item label="名称"><n-input v-model:value="form.name" /></n-form-item>
      <n-form-item label="Host"><n-input v-model:value="form.host" /></n-form-item>
      <n-form-item label="Port"><n-input-number v-model:value="form.port" :min="1" :max="65535" /></n-form-item>
      <n-form-item label="frps.toml 路径"><n-input v-model:value="form.frps_conf_path" placeholder="如 /etc/frp/frps.toml" /></n-form-item>
      <n-form-item label="frps 进程 PID">
        <n-input-number v-model:value="form.frps_pid" placeholder="如 12345" style="width: 180px; margin-right: 8px;" />
        <n-button size="small" @click="fetchFrpsPid" :loading="fetchingPid">自动获取</n-button>
      </n-form-item>
      <n-form-item label="管理端口"><n-input-number v-model:value="form.admin_port" :min="1" :max="65535" placeholder="可选，不填则按 +1 偏移" /></n-form-item>
      <n-form-item label="管理用户名"><n-input v-model:value="form.admin_user" placeholder="可选" /></n-form-item>
      <n-form-item label="管理密码"><n-input v-model:value="form.admin_pass" type="password" placeholder="可选" /></n-form-item>
      <n-form-item label="地区" path="location"><n-input v-model:value="form.location" placeholder="例如：华东-上海" /></n-form-item>
      <n-form-item label="带宽(Mbps)"><n-input-number v-model:value="form.bandwidth" :min="1" /></n-form-item>
      <n-form-item label="区域">
        <n-select v-model:value="form.region" :options="[{label:'国内',value:'domestic'},{label:'海外',value:'overseas'}]" />
      </n-form-item>
      <n-form-item label="优先级"><n-input-number v-model:value="form.priority" :min="0" /></n-form-item>
      <n-form-item label="权限组">
        <n-select v-model:value="form.nodegroup" :options="[{label:'普通',value:'user'},{label:'VIP',value:'vip'},{label:'SVIP',value:'svip'},{label:'管理',value:'admin'}]" />
      </n-form-item>
      <n-form-item label="防御"><n-switch v-model:value="form.defense" /></n-form-item>
      <n-form-item label="建站"><n-switch v-model:value="form.web" /></n-form-item>
      <n-form-item label="UDP"><n-switch v-model:value="form.udp" /></n-form-item>
      <n-form-item label="IPv6"><n-switch v-model:value="form.ipv6" /></n-form-item>
      <n-form-item label="SSH 端口"><n-input-number v-model:value="form.ssh_port" :min="1" :max="65535" placeholder="默认 22" /></n-form-item>
      <n-form-item label="SSH 用户名"><n-input v-model:value="form.ssh_user" placeholder="可选，填写则进行账号密码认证" /></n-form-item>
      <n-form-item label="SSH 密码"><n-input v-model:value="form.ssh_pass" type="password" placeholder="可选" /></n-form-item>
    </n-form>
    <template #action>
      <n-space>
        <n-button @click="show=false">取消</n-button>
        <n-button type="primary" :loading="saving" @click="save">保存</n-button>
      </n-space>
    </template>
  </n-modal>
</template>

<script setup lang="ts">
import { ref, computed, h } from 'vue';
import { NButton, useMessage, useDialog } from 'naive-ui';
import api from '@/api';
import axios from 'axios';
import { useUserStore } from '@/stores/user';

const message = useMessage();
const dialog = useDialog();

const loading = ref(false);
const nodes = ref<any[]>([]);
const keyword = ref('');

const loadNodes = async () => {
  loading.value = true;
  try {
    // 直接请求后端 /nodes，避免旧 /node 路由兼容差异；附带 token 与时间戳避免 304 缓存
    const base = (import.meta as any).env?.VITE_API_BASE_URL || '';
    const userStore = useUserStore();
    const token = userStore.userInfo?.usertoken || '';
    const resp = await axios.get(`${base}/nodes`, { params: { token, _: Date.now() } });
    const payload = resp?.data;
    const list = Array.isArray(payload?.data) ? payload.data : (Array.isArray(payload) ? payload : []);
    nodes.value = list;
    // 如果未选择当前节点，默认选择第一条，避免“配置处选择节点存在数据但列表空”的体验差
    if (!activeNodeId.value && nodes.value.length > 0) {
      activeNodeId.value = nodes.value[0].id;
    }
  } catch (e: any) {
    message.error('加载节点失败: ' + (e?.message || e));
  } finally {
    loading.value = false;
  }
};

const filteredNodes = computed(() => {
  const k = keyword.value.trim().toLowerCase();
  if (!k) return nodes.value;
  return nodes.value.filter((n) =>
    [n.name, n.location, n.area].filter(Boolean).some((v: string) => String(v).toLowerCase().includes(k))
  );
});

const nodeColumns = [
  { title: 'ID', key: 'id', width: 80 },
  { title: '名称', key: 'name' },
  { title: '地区', key: 'location' },
  { title: '状态', key: 'status' },
  { title: '版本', key: 'version' },
  {
    title: '操作',
    key: 'actions',
    width: 320,
    render(row: any) {
      return h('div', { style: 'display:flex; gap:8px' }, [
        h(NButton, { size: 'small', onClick: () => selectNode(row) }, { default: () => '选择' }),
        h(NButton, { size: 'small', onClick: () => openEdit(row) }, { default: () => '编辑' }),
        h(NButton, { size: 'small', tag: 'a', href: api.v2.agent.logsStreamUrl(row.id), target: '_blank' }, { default: () => '日志' }),
        h(NButton, { size: 'small', onClick: () => showAgentStatus(row.id) }, { default: () => '状态' }),
        h(NButton, { size: 'small', type: 'error', onClick: () => onDeleteNode(row) }, { default: () => '删除' }),
      ]);
    },
  },
];

const activeNodeId = ref<number | null>(null);
const rowKey = (row: any) => row.id;
const nodeOptions = computed(() => nodes.value.map((n) => ({ label: `${n.name} (#${n.id})`, value: n.id })));
function selectNode(row: any) { activeNodeId.value = row.id; }

// 创建/编辑
const show = ref(false);
const saving = ref(false);
const editing = ref(false);
const form = ref<any>({
  name: '',
  host: '',
  port: 7000,
  admin_port: null,
  admin_user: '',
  admin_pass: '',
  location: '',
  bandwidth: 100,
  region: 'domestic',
  description: '',
  priority: 1,
  nodegroup: 'user',
  defense: false,
  web: true,
  udp: true,
  ipv6: false,
  ssh_port: 22,
  ssh_user: '',
  ssh_pass: '',
  frps_conf_path: '',
  frps_pid: null
});
const formRef = ref<any>(null);
const lastError = ref('');
const formRules = {
  name: { required: true, message: '请输入名称', trigger: 'blur' },
  host: { required: true, message: '请输入 Host', trigger: 'blur' },
  port: {
    required: true,
    validator: (_: any, value: any) => {
      const num = Number(value);
      if (!num || isNaN(num)) return new Error('请输入端口');
      if (num < 1 || num > 65535) return new Error('端口范围为 1-65535');
      return true;
    },
    trigger: ['blur', 'change']
  },
  admin_port: {
    required: true,
    validator: (_: any, value: any) => {
      const num = Number(value);
      if (!num || isNaN(num)) return new Error('请输入管理端口');
      if (num < 1 || num > 65535) return new Error('管理端口范围为 1-65535');
      return true;
    },
    trigger: ['blur', 'change']
  },
  admin_user: { required: true, message: '请输入管理用户名', trigger: 'blur' },
  admin_pass: { required: true, message: '请输入管理密码', trigger: 'blur' },
  location: { required: true, message: '请输入地区', trigger: 'blur' },
  bandwidth: {
    required: true,
    validator: (_: any, value: any) => Number(value) > 0 ? true : new Error('带宽需为正整数'),
    trigger: ['blur', 'change']
  },
  region: { required: true, message: '请选择区域', trigger: 'change' },
  priority: { required: true, message: '请输入优先级', trigger: 'blur' },
  nodegroup: { required: true, message: '请选择权限组', trigger: 'change' },
  defense: { required: true, message: '请选择防御开关', trigger: 'change' },
  web: { required: true, message: '请选择建站开关', trigger: 'change' },
  udp: { required: true, message: '请选择UDP开关', trigger: 'change' },
  ipv6: { required: true, message: '请选择IPv6开关', trigger: 'change' },
  ssh_port: {
    required: true,
    validator: (_: any, value: any) => {
      const num = Number(value);
      if (!num || isNaN(num)) return new Error('请输入SSH端口');
      if (num < 1 || num > 65535) return new Error('SSH端口范围为 1-65535');
      return true;
    },
    trigger: ['blur', 'change']
  },
  ssh_user: { required: true, message: '请输入SSH用户名', trigger: 'blur' },
  ssh_pass: { required: true, message: '请输入SSH密码', trigger: 'blur' },
  description: { required: true, message: '请输入描述', trigger: 'blur' }
};

function openCreate(){ editing.value=false; form.value={ name:'', host:'', port:7000, admin_port:null, admin_user:'', admin_pass:'', location:'', bandwidth:100, region:'domestic', description:'', priority:1, nodegroup:'user', defense:false, web:true, udp:true, ipv6:false, ssh_port:22, ssh_user:'', ssh_pass:'' }; lastError.value=''; show.value=true; }
function openEdit(row:any){
  editing.value=true;
  form.value={
    ...row,
    defense: !!row.defense,
    web: !!row.web,
    udp: !!row.udp,
    ipv6: !!row.ipv6
  };
  lastError.value='';
  show.value=true;
}

// 配置
// ...已移除未用变量...

// 保留唯一 save 方法，直接保存节点
const save = async () => {
  saving.value = true;
  lastError.value = '';
  try {
    await formRef.value?.validate?.();
    const base = (import.meta as any).env?.VITE_API_BASE_URL || '';
    const userStore = useUserStore();
    const token = userStore.userInfo?.usertoken || '';
    let resp;
    if (editing.value) {
      resp = await axios.post(base + '/nodes/update', { token, id: form.value.id, ...form.value });
      if (resp.data?.code !== 200) throw new Error(resp.data?.msg || '更新失败');
    } else {
      resp = await axios.post(base + '/nodes/create', { token, ...form.value });
      if (resp.data?.code !== 200) throw new Error(resp.data?.msg || '创建失败');
    }
    message.success('保存成功');
    show.value = false; await loadNodes();
  } catch (e: any) {
    lastError.value = e?.message || e;
    message.error('保存失败: ' + lastError.value);
  } finally {
    saving.value = false;
  }
};

const fetchingPid = ref(false);
async function fetchFrpsPid() {
  fetchingPid.value = true;
  try {
    // 假设后端提供 /nodes/fetch_frps_pid 接口，参数：host, ssh_port, ssh_user, ssh_pass
    const base = (import.meta as any).env?.VITE_API_BASE_URL || '';
    const resp = await axios.post(base + '/nodes/fetch_frps_pid', {
      host: form.value.host,
      ssh_port: form.value.ssh_port || 22,
      ssh_user: form.value.ssh_user,
      ssh_pass: form.value.ssh_pass
    });
    if (resp.data?.code === 200 && resp.data.pid) {
      form.value.frps_pid = Number(resp.data.pid);
      message.success('获取成功');
    } else {
      throw new Error(resp.data?.msg || '获取失败');
    }
  } catch (e: any) {
    message.error('获取 frps 进程 PID 失败: ' + (e?.message || e));
  } finally {
    fetchingPid.value = false;
  }
}
const proxyLoading = ref(false);
const proxies = ref<any[]>([]);
const proxyColumns = [
  { title: '名称', key: 'name' },
  { title: '类型', key: 'type' },
  { title: '本地', key: 'local' },
  { title: '远端', key: 'remote' },
];
const loadProxies = async () => {
  if (!activeNodeId.value) return;
  proxyLoading.value = true;
  try {
  // 代理类型选择已移除，直接获取全部代理
  const resp = await api.v2.agent.getProxies(activeNodeId.value, 'all');
    // 后端透传 frps 的结构，做最小映射
    const list = Array.isArray((resp as any)?.proxies) ? (resp as any).proxies : [];
    proxies.value = list.map((p: any) => ({
      name: p.name || p.ProxyName,
      type: p.type || p.ProxyType,
      local: p.local || `${p.LocalIP || ''}:${p.LocalPort || ''}`,
      remote: p.remote || `${p.RemoteAddr || ''}:${p.RemotePort || ''}`,
    }));
  } catch (e: any) {
    message.error('加载代理失败: ' + (e?.message || e));
  } finally {
    proxyLoading.value = false;
  }
};

// 客户端
const clientLoading = ref(false);
const clients = ref<any[]>([]);
const clientColumns = [
  { title: 'ID', key: 'id' },
  { title: '名称', key: 'name' },
  { title: '版本', key: 'version' },
  { title: '连接时间', key: 'connectedAt' },
];
const loadClients = async () => {
  if (!activeNodeId.value) return;
  clientLoading.value = true;
  try {
    const resp = await api.v2.agent.getClients(activeNodeId.value);
    const list = Array.isArray((resp as any)?.clients) ? (resp as any).clients : [];
    clients.value = list;
  } catch (e: any) {
    message.error('加载客户端失败: ' + (e?.message || e));
  } finally {
    clientLoading.value = false;
  }
};

// 日志
const logsUrl = computed(() => (activeNodeId.value ? api.v2.agent.logsStreamUrl(activeNodeId.value) : '#'));

// Agent 状态弹出
async function showAgentStatus(node_id: number) {
  try {
    // 查找节点信息，获取管理端口
    const node = nodes.value.find((n) => n.id === node_id);
    let params: any = node_id;
    if (node && node.admin_port) {
      // 假如后端支持，可传递 { node_id, admin_port }，否则只传 node_id
      params = node_id;
    }
    const resp = await api.v2.agent.getAgentStatus(params);
    message.info(JSON.stringify(resp.data));
  } catch (e: any) {
    const detail = e?.response?.data?.detail || e?.message || e;
    if (typeof detail === 'string' && detail.includes('ECONNREFUSED')) {
      message.error('无法连接到节点服务器（管理端口未开放或防火墙拦截），请检查节点主机和管理端口设置。');
    } else {
      message.error('读取状态失败: ' + detail);
    }
  }
}

loadNodes();

// 删除节点（统一带确认）
function onDeleteNode(row: any) {
  const base = (import.meta as any).env?.VITE_API_BASE_URL || '';
  const token = useUserStore().userInfo?.usertoken || '';
  dialog.warning({
    title: '确认删除',
    content: `确定要删除节点「${row.name}」(#${row.id}) 吗？此操作不可恢复。`,
    positiveText: '删除',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await axios.post(base + '/nodes/delete', { token, id: row.id });
        message.success('删除成功');
        if (activeNodeId.value === row.id) activeNodeId.value = null;
        await loadNodes();
      } catch (e: any) {
        message.error('删除失败: ' + (e?.response?.data?.msg || e?.message || e));
      }
    },
  });
}
</script>


