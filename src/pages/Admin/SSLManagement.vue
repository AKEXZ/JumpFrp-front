<template>
  <n-back-top :right="100" />
  <n-card title="免费 SSL 管理" :bordered="false">
    <n-data-table :columns="columns" :data="list" :bordered="false" />
  </n-card>
</template>

<script lang="ts" setup>
import { ref, onMounted, h } from 'vue';
import { useMessage, NButton } from 'naive-ui';
import axios from 'axios';
import { useUserStore } from '@/stores/user';

const apiBase = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:3000';
const userStore = useUserStore();
const message = useMessage();

const list = ref<any[]>([]);

const columns = [
  { title: '域名', key: 'domain' },
  { title: '类型', key: 'type' },
  { title: '状态', key: 'status' },
  { title: '证书到期', key: 'ssl_expire' },
  {
    title: '操作',
    key: 'actions',
    render(row: any) {
      return h(NButton, { size: 'small', type: 'primary', onClick: () => clearSSL(row) }, { default: () => '清空证书' });
    }
  }
];

async function load() {
  const res = await axios.get(`${apiBase}/domains`);
  if (res.data?.code === 200) list.value = res.data.data;
}

async function clearSSL(row: any) {
  try {
    const token = userStore.userInfo?.usertoken || '';
    await axios.post(`${apiBase}/domains/update_ssl`, { token, id: row.id, ssl_cert: null, ssl_key: null, ssl_expire: null });
    message.success('已清空证书');
    load();
  } catch (e: any) {
    message.error(e?.response?.data?.msg || '操作失败');
  }
}

onMounted(load);
</script>
