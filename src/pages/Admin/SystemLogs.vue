<template>
  <n-space vertical>
    <n-card title="系统日志">
      <n-space>
        <n-select v-model:value="filterType" :options="types" placeholder="类型" style="min-width: 140px" />
        <n-input-number v-model:value="pageSize" :min="10" :max="200" />
        <n-button :loading="loading" @click="load">刷新</n-button>
      </n-space>
      <n-data-table :columns="columns" :data="rows" :loading="loading" :pagination="pagination" @update:page="p=>{page=p; load();}" />
    </n-card>
  </n-space>
</template>
<script setup lang="ts">
import { ref } from 'vue';
import axios from 'axios';
import { useMessage } from 'naive-ui';

const message = useMessage();
const loading = ref(false);
const rows = ref<any[]>([]);
const page = ref(1);
const pageSize = ref(50);
const total = ref(0);
const filterType = ref('');
const types = [
  { label: '全部', value: '' },
  { label: 'tunnel', value: 'tunnel' },
  { label: 'user', value: 'user' },
  { label: 'backup', value: 'backup' },
  { label: 'maintenance', value: 'maintenance' }
];

const columns = [
  { title: '时间', key: 'created_at' },
  { title: '类型', key: 'type' },
  { title: '动作', key: 'action' },
  { title: '用户ID', key: 'user_id' },
  { title: '详情', key: 'details' }
];

const pagination = { page: page.value, pageSize: pageSize.value, itemCount: total.value, showSizePicker: false } as any;

async function load(){
  loading.value = true;
  try {
    const base = (import.meta as any).env?.VITE_API_BASE_URL || '';
    const token = localStorage.getItem('token');
    const params = new URLSearchParams();
    params.set('token', token||'');
    params.set('page', String(page.value));
    params.set('limit', String(pageSize.value));
    if (filterType.value) params.set('type', filterType.value);
    const resp = await axios.get(`${base}/system/logs?`+params.toString());
    if (resp.data?.code === 200) {
      rows.value = resp.data.data.logs || [];
      total.value = resp.data.data.pagination?.total || 0;
      (pagination as any).itemCount = total.value;
    }
  } catch(e:any){ message.error('加载失败: '+(e?.message||e)); }
  finally{ loading.value=false; }
}

load();
</script>
