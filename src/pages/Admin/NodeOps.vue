<template>
  <n-space vertical>
    <n-card title="节点列表">
      <n-space justify="space-between">
        <n-input v-model:value="keyword" placeholder="搜索节点名称/地区" style="max-width: 280px" />
        <n-button :loading="loading" @click="loadNodes">刷新</n-button>
      </n-space>
      <n-data-table :columns="columns" :data="filteredNodes" :loading="loading" style="margin-top: 12px" />
    </n-card>

    <n-card title="节点配置">
      <n-space>
        <n-select v-model:value="activeNodeId" :options="nodeOptions" placeholder="选择节点" style="min-width: 220px" />
        <n-button type="primary" :disabled="!activeNodeId" :loading="cfgLoading" @click="fetchConfig">读取配置</n-button>
        <n-button :disabled="!activeNodeId" :loading="cfgSaving" @click="saveConfig">保存配置</n-button>
        <n-button :disabled="!activeNodeId" tag="a" :href="logsUrl" target="_blank">查看日志(SSE)</n-button>
      </n-space>
      <n-input v-model:value="configText" type="textarea" rows="16" style="margin-top: 12px" placeholder="服务器配置(JSON 或 TOML 结构，按节点实现返回为准)" />
    </n-card>

    <n-grid cols="1 m:2" x-gap="12" y-gap="12">
      <n-grid-item>
        <n-card title="代理列表">
          <n-space>
            <n-select v-model:value="proxyType" :options="proxyTypeOptions" style="min-width: 180px" />
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
</template>

<script setup lang="ts">
import { ref, computed, h } from 'vue';
import { NButton, useMessage } from 'naive-ui';
import api from '@/api';

const message = useMessage();

const loading = ref(false);
const nodes = ref<any[]>([]);
const keyword = ref('');

const loadNodes = async () => {
  loading.value = true;
  try {
    const resp = await api.v2.node.getNodeList();
    // 容错：后端返回字段可能超出前端定义，直接保存
    // @ts-ignore
    nodes.value = Array.isArray(resp.data) ? resp.data : [];
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

const columns = [
  { title: 'ID', key: 'id', width: 80 },
  { title: '名称', key: 'name' },
  { title: '地区', key: 'location' },
  { title: '状态', key: 'status' },
  { title: '版本', key: 'version' },
  {
    title: '操作',
    key: 'actions',
    width: 260,
    render(row: any) {
      return h('div', { style: 'display:flex; gap:8px' }, [
        h(NButton, { size: 'small', onClick: () => selectNode(row) }, { default: () => '选择' }),
        h(NButton, { size: 'small', tag: 'a', href: logsStreamUrl(row.id), target: '_blank' }, { default: () => '日志' }),
        h(NButton, { size: 'small', onClick: () => showAgentStatus(row.id) }, { default: () => '状态' }),
      ]);
    },
  },
];

const activeNodeId = ref<number | null>(null);
const nodeOptions = computed(() => nodes.value.map((n) => ({ label: `${n.name} (#${n.id})`, value: n.id })));
function selectNode(row: any) { activeNodeId.value = row.id; }

// 配置
const cfgLoading = ref(false);
const cfgSaving = ref(false);
const configText = ref('');

const fetchConfig = async () => {
  if (!activeNodeId.value) return;
  cfgLoading.value = true;
  try {
    const resp = await api.v2.agent.getServerConfig(activeNodeId.value);
    configText.value = typeof resp.data === 'string' ? resp.data : JSON.stringify(resp.data, null, 2);
  } catch (e: any) {
    message.error('获取配置失败: ' + (e?.message || e));
  } finally {
    cfgLoading.value = false;
  }
};

const saveConfig = async () => {
  if (!activeNodeId.value) return;
  cfgSaving.value = true;
  try {
    let parsed: any = configText.value;
    try { parsed = JSON.parse(configText.value); } catch {}
    await api.v2.agent.setServerConfig(activeNodeId.value, parsed);
    message.success('保存成功');
  } catch (e: any) {
    message.error('保存失败: ' + (e?.message || e));
  } finally {
    cfgSaving.value = false;
  }
};

// 代理
const proxyType = ref('tcp');
const proxyTypeOptions = [
  { label: 'TCP', value: 'tcp' },
  { label: 'UDP', value: 'udp' },
  { label: 'HTTP', value: 'http' },
  { label: 'HTTPS', value: 'https' },
];
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
    const resp = await api.v2.agent.getProxies(activeNodeId.value, proxyType.value);
    // 后端透传 frps 的结构，做最小映射
    const list = Array.isArray(resp.data?.proxies) ? resp.data.proxies : [];
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
    const list = Array.isArray(resp.data?.clients) ? resp.data.clients : [];
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
    const resp = await api.v2.agent.getAgentStatus(node_id);
    message.info(JSON.stringify(resp.data));
  } catch (e: any) {
    message.error('读取状态失败: ' + (e?.message || e));
  }
}

loadNodes();
</script>


