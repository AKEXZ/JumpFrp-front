<template>
  <n-back-top :right="100" />
  <n-card title="隧道管理" :bordered="false">
    <n-space align="center" justify="space-between">
      <n-input v-model:value="keyword" placeholder="搜索隧道名/节点/用户ID" clearable style="width: 320px" />
      <n-button type="error" :disabled="!selected" @click="remove">删除隧道</n-button>
    </n-space>
    <n-data-table :columns="columns" :data="filtered" :row-key="rowKey" :bordered="false" style="margin-top: 16px" @update:checked-row-keys="onCheck" />
  </n-card>
</template>

<script lang="ts" setup>
import { ref, computed, onMounted } from 'vue';
import axios from 'axios';
import { useUserStore } from '@/stores/user';
import { useMessage } from 'naive-ui';

const apiBase = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:3000';
const userStore = useUserStore();
const message = useMessage();

interface T { id:number; name:string; node:string; userid:number; type:string; state:string; nport:number; dorp:string; }
const list = ref<T[]>([]);
const keyword = ref('');
const selected = ref<number | null>(null);

const columns = [
  { title: 'ID', key: 'id' },
  { title: '名称', key: 'name' },
  { title: '节点', key: 'node' },
  { title: '用户ID', key: 'userid' },
  { title: '类型', key: 'type' },
  { title: '状态', key: 'state' },
  { title: '远程端口/域名', key: 'nport', render(row: T){ return row.type==='tcp'||row.type==='udp'?row.nport:row.dorp; } }
];

const filtered = computed(() => list.value.filter(t => [t.name, t.node, String(t.userid)].some(v => v?.toLowerCase().includes(keyword.value.toLowerCase()))));
const rowKey = (row: T) => row.id;
function onCheck(keys:any[]){ selected.value = keys?.[0] ?? null; }

async function load(){
  const token = userStore.userInfo?.usertoken || '';
  const res = await axios.get(`${apiBase}/tunnel`, { params: { token } });
  if (res.data?.code === 200) list.value = (res.data.data||[]) as any;
}

async function remove(){
  if (!selected.value) return;
  const token = userStore.userInfo?.usertoken || '';
  await axios.post(`${apiBase}/delete_tunnel`, { token, tunnelid: selected.value });
  message.success('已删除');
  load();
}

onMounted(load);
</script>
