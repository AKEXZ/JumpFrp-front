<template>
  <n-back-top :right="100" />
  <n-card title="免费域名管理" :bordered="false">
    <n-space align="center" justify="space-between">
      <div />
      <n-space>
        <n-input v-model:value="subdomain" placeholder="输入子域名前缀，如 blog" style="width: 220px" />
        <n-select v-model:value="rootDomain" :options="rootOptions" style="width: 240px" placeholder="选择根域名" />
        <n-button type="primary" :loading="creating" @click="apply">申请</n-button>
      </n-space>
    </n-space>
    <n-data-table :columns="columns" :data="list" :bordered="false" style="margin-top:16px" />
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
const subdomain = ref('');
const creating = ref(false);
const rootDomain = ref<string | null>(null);
const rootOptions = ref<{label:string,value:string}[]>([]);

const columns = [
  { title: '域名', key: 'domain' },
  { title: '类型', key: 'type' },
  { title: '状态', key: 'status' },
  { title: '创建时间', key: 'created_at' }
];

async function load() {
  const token = userStore.userInfo?.usertoken || '';
  const res = await axios.get(`${apiBase}/domains`, { params: { token } });
  if (res.data?.code === 200) list.value = res.data.data;
  // 系统域名下拉
  const sys = await axios.get(`${apiBase}/domains`, { params: { type: 'system' } });
  if (sys.data?.code === 200) rootOptions.value = (sys.data.data || []).map((d:any) => ({ label: d.domain, value: d.domain }));
}

async function apply() {
  try {
    creating.value = true;
    const token = userStore.userInfo?.usertoken || '';
    if (!subdomain.value) return message.warning('请输入子域名前缀');
    await axios.post(`${apiBase}/apply_domain`, { token, subdomain: subdomain.value, root_domain: rootDomain.value });
    message.success('申请成功');
    subdomain.value = '';
    rootDomain.value = null;
    load();
  } catch (e: any) {
    message.error(e?.response?.data?.msg || '申请失败');
  } finally {
    creating.value = false;
  }
}

onMounted(load);
</script>
