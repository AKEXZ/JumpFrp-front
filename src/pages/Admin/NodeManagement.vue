<template>
  <n-back-top :right="100" />
  <n-card title="节点管理" :bordered="false">
    <n-space align="center" justify="space-between">
      <n-space>
        <n-input v-model:value="keyword" placeholder="搜索名称/Host/位置" clearable style="width: 260px" />
        <n-button type="primary" @click="fetchNodes">搜索</n-button>
      </n-space>
      <n-button type="primary" @click="openCreate">新增节点</n-button>
    </n-space>

    <n-data-table :columns="columns" :data="filtered" :bordered="false" style="margin-top: 16px" />
  </n-card>

  <n-modal v-model:show="showModal" preset="dialog" :title="isEdit ? '编辑节点' : '新增节点'">
    <n-form :model="form" label-placement="left" label-width="90">
      <n-form-item label="名称"><n-input v-model:value="form.name" /></n-form-item>
      <n-form-item label="Host"><n-input v-model:value="form.host" /></n-form-item>
      <n-form-item label="端口"><n-input-number v-model:value="form.port" :min="1" :max="65535" /></n-form-item>
      <n-form-item label="SSH端口"><n-input-number v-model:value="form.ssh_port" :min="1" :max="65535" /></n-form-item>
      <n-form-item label="SSH用户"><n-input v-model:value="form.ssh_user" placeholder="root" /></n-form-item>
      <n-form-item label="SSH密码"><n-input v-model:value="form.ssh_pass" type="password" show-password-on="click" /></n-form-item>
      <n-form-item label="位置"><n-input v-model:value="form.location" /></n-form-item>
      <n-form-item label="带宽(Mbps)"><n-input-number v-model:value="form.bandwidth" :min="1" /></n-form-item>
      <n-form-item label="区域">
        <n-select v-model:value="form.region" :options="regionOptions" />
      </n-form-item>
      <n-form-item label="优先级"><n-input-number v-model:value="form.priority" :min="0" /></n-form-item>
      <n-form-item label="权限组">
        <n-select v-model:value="form.nodegroup" :options="nodeGroupOptions" />
      </n-form-item>
      <n-form-item label="防御"><n-switch v-model:value="form.defense" /></n-form-item>
      <n-form-item label="建站"><n-switch v-model:value="form.web" /></n-form-item>
      <n-form-item label="UDP"><n-switch v-model:value="form.udp" /></n-form-item>
      <n-form-item label="IPv6"><n-switch v-model:value="form.ipv6" /></n-form-item>
      <n-form-item label="描述"><n-input v-model:value="form.description" type="textarea" /></n-form-item>
    </n-form>
    <template #action>
      <n-space>
        <n-button @click="showModal = false">取消</n-button>
        <n-button type="primary" :loading="saving" @click="submit">保存</n-button>
      </n-space>
    </template>
  </n-modal>

  <n-modal v-model:show="showSSH" preset="dialog" title="SSH 连接">
    <n-form>
      <n-form-item label="主机"><n-input v-model:value="sshHost" disabled /></n-form-item>
      <n-form-item label="用户名"><n-input v-model:value="sshUser" /></n-form-item>
      <n-form-item label="端口"><n-input-number v-model:value="sshPort" :min="1" :max="65535" /></n-form-item>
      <n-form-item label="命令"><n-input v-model:value="sshCommand" type="textarea" autosize disabled /></n-form-item>
      <n-space>
        <n-button @click="copySSH">复制命令</n-button>
        <a :href="`ssh://${sshUser}@${sshHost}:${sshPort}`" target="_blank">
          <n-button type="primary">打开终端</n-button>
        </a>
      </n-space>
    </n-form>
  </n-modal>

  <n-modal v-model:show="showInstall" preset="dialog" title="FRPS 安装脚本">
    <n-form>
      <n-form-item label="说明">
        <div>未检测到该节点的 FRPS 监听，复制下方脚本到目标服务器执行。</div>
      </n-form-item>
      <n-form-item label="脚本">
        <n-input v-model:value="installScript" type="textarea" :autosize="{ minRows: 10 }" />
      </n-form-item>
      <n-space>
        <n-button @click="copyInstall">复制脚本</n-button>
      </n-space>
    </n-form>
  </n-modal>
</template>

<script lang="ts" setup>
import { ref, computed, onMounted, h } from 'vue';
import { useMessage, NButton } from 'naive-ui';
import { useUserStore } from '@/stores/user';
import axios from 'axios';

const message = useMessage();
const userStore = useUserStore();
const apiBase = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:3000';

interface NodeItem {
  id: number;
  name: string;
  host: string;
  port: number;
  location: string;
  bandwidth: number;
  status: 'online' | 'offline' | 'maintenance';
  region: 'domestic' | 'overseas';
  priority: number;
  description: string;
  nodegroup?: string;
  defense?: boolean;
  web?: boolean;
  udp?: boolean;
  ipv6?: boolean | null;
}

const list = ref<NodeItem[]>([]);
const keyword = ref('');
const showModal = ref(false);
const isEdit = ref(false);
const saving = ref(false);
const currentId = ref<number | null>(null);

const form = ref({
  name: '', host: '', port: 7000, location: '', bandwidth: 100,
  region: 'domestic' as 'domestic' | 'overseas', description: '', priority: 1,
  nodegroup: 'user', defense: false, web: true, udp: true, ipv6: false as boolean | null,
  ssh_port: 22, ssh_user: 'root', ssh_pass: ''
});

const regionOptions = [
  { label: '国内', value: 'domestic' },
  { label: '海外', value: 'overseas' }
];

// 状态改为自动获取，不再提供编辑选项

const nodeGroupOptions = [
  { label: '普通', value: 'user' },
  { label: 'VIP', value: 'vip' },
  { label: 'SVIP', value: 'svip' },
  { label: '管理员', value: 'admin' }
];

const columns = [
  { title: '名称', key: 'name' },
  { title: 'Host', key: 'host' },
  { title: '端口', key: 'port' },
  { title: '位置', key: 'location' },
  { title: '带宽(Mbps)', key: 'bandwidth' },
  { title: '区域', key: 'region' },
  { title: '状态', key: 'status' },
  { title: '优先级', key: 'priority' },
  { title: '描述', key: 'description', ellipsis: true },
  {
    title: '操作',
    key: 'actions',
    render(row: NodeItem) {
      return [
        h(NButton, { size: 'small', type: 'default', onClick: () => openSSH(row) }, { default: () => 'SSH连接' }),
        h('span', { style: 'display:inline-block;width:8px' }),
        h(NButton, { size: 'small', type: 'warning', onClick: () => checkFrps(row) }, { default: () => '检测/安装FRPS' }),
        h('span', { style: 'display:inline-block;width:8px' }),
        h(NButton, { size: 'small', type: 'primary', onClick: () => openEdit(row) }, { default: () => '编辑' }),
        h('span', { style: 'display:inline-block;width:8px' }),
        h(NButton, { size: 'small', type: 'error', onClick: () => remove(row) }, { default: () => '删除' })
      ];
    }
  }
];

const filtered = computed(() =>
  list.value.filter(n =>
    [n.name, n.host, n.location].some(v => v?.toLowerCase().includes(keyword.value.toLowerCase()))
  )
);

async function fetchNodes() {
  try {
    const res = await axios.get(`${apiBase}/nodes`);
    if (res.data?.code === 200) list.value = res.data.data;
  } catch (e) { message.error('加载节点失败'); }
}

function openCreate() {
  isEdit.value = false; currentId.value = null; showModal.value = true;
  form.value = { name: '', host: '', port: 7000, ssh_port: 22, ssh_user: 'root', ssh_pass: '', location: '', bandwidth: 100, region: 'domestic', description: '', priority: 1, nodegroup: 'user', defense: false, web: true, udp: true, ipv6: false } as any;
}

function openEdit(row: NodeItem) {
  isEdit.value = true; currentId.value = row.id; showModal.value = true;
  form.value = { ...row } as any;
}

async function submit() {
  try {
    saving.value = true;
    const token = userStore.userInfo?.usertoken || '';
    if (!token) { message.error('未登录'); return; }
    if (isEdit.value && currentId.value) {
      const res = await axios.post(`${apiBase}/nodes/update`, { token, id: currentId.value, ...form.value });
      if (res.data?.code !== 200) { message.error(res.data?.msg || '保存失败'); return; }
      message.success('保存成功');
    } else {
      const res = await axios.post(`${apiBase}/nodes/create`, { token, ...form.value });
      if (res.data?.code !== 200) { message.error(res.data?.msg || '创建失败'); return; }
      message.success('创建成功');
    }
    showModal.value = false;
    fetchNodes();
  } catch (e: any) {
    const msg = e?.response?.data?.msg || e?.message || '操作失败';
    message.error(msg);
  } finally {
    saving.value = false;
  }
}

async function remove(row: NodeItem) {
  try {
    const token = userStore.userInfo?.usertoken || '';
    await axios.post(`${apiBase}/nodes/delete`, { token, id: row.id });
    message.success('删除成功');
    fetchNodes();
  } catch (e: any) {
    message.error(e?.response?.data?.msg || '删除失败');
  }
}

onMounted(fetchNodes);

// SSH 连接弹窗
const showSSH = ref(false);
const sshUser = ref('root');
const sshPort = ref(22);
const sshHost = ref('');
const sshCommand = computed(() => `ssh ${sshUser.value}@${sshHost.value} -p ${sshPort.value}`);

function openSSH(row: NodeItem) {
  sshHost.value = row.host;
  sshUser.value = 'root';
  sshPort.value = 22;
  showSSH.value = true;
}

async function copySSH() {
  try {
    await navigator.clipboard.writeText(sshCommand.value);
    message.success('已复制');
  } catch { message.error('复制失败'); }
}

// FRPS 安装脚本弹窗
const showInstall = ref(false);
const installScript = ref('');

async function checkFrps(row: NodeItem) {
  try {
    const res = await axios.get(`${apiBase}/nodes/check_frps`, { params: { id: row.id } });
    if (res.data?.code !== 200) { message.error(res.data?.msg || '检测失败'); return; }
    const exists = res.data?.data?.exists;
    if (exists) {
      message.success('FRPS 已就绪');
    } else {
      installScript.value = res.data?.data?.install_script || '';
      showInstall.value = true;
    }
  } catch (e:any) {
    message.error(e?.response?.data?.msg || e?.message || '检测失败');
  }
}

async function copyInstall() {
  try {
    await navigator.clipboard.writeText(installScript.value);
    message.success('已复制');
  } catch { message.error('复制失败'); }
}
</script>
