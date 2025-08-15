<template>
  <n-space vertical>
    <n-card title="用户列表">
      <n-space>
        <n-input v-model:value="keyword" placeholder="搜索用户名/邮箱" style="max-width: 280px" />
        <n-select v-model:value="filterGroup" :options="groups" placeholder="用户组" style="min-width: 140px" />
        <n-button :loading="loading" @click="load">刷新</n-button>
        <n-button type="error" :disabled="sel.length===0" @click="openBatch('disable')">禁用</n-button>
        <n-button type="warning" :disabled="sel.length===0" @click="openBatch('enable')">启用</n-button>
        <n-button type="primary" :disabled="sel.length===0" @click="openBatchSetGroup">设置分组</n-button>
        <n-button type="error" :disabled="sel.length===0" @click="openBatch('delete')">删除</n-button>
      </n-space>
      <n-data-table
        :columns="columns"
        :data="filtered"
        :pagination="{pageSize: 20}"
        :row-key="(row: any) => row.id"
        style="min-width: 1000px"
      />
    </n-card>

    <n-modal v-model:show="showBatch" preset="dialog" :title="batchTitle">
      <n-space vertical>
        <div>选中 {{ sel.length }} 个用户，确认执行？</div>
        <n-select v-if="batchType==='set_group'" v-model:value="targetGroup" :options="groups" style="min-width: 160px" />
      </n-space>
      <template #action>
        <n-space>
          <n-button @click="showBatch=false">取消</n-button>
          <n-button type="primary" :loading="processing" @click="doBatch">执行</n-button>
        </n-space>
      </template>
    </n-modal>
  </n-space>
</template>
<script setup lang="ts">
import { ref, computed, h, watch } from 'vue';
import axios from 'axios';
import { useUserStore } from '@/stores/user';
import { NTag, useMessage } from 'naive-ui';

const message = useMessage();
const loading = ref(false);
const rows = ref<any[]>([]);
const keyword = ref('');
const filterGroup = ref('');
const sel = ref<number[]>([]);
const selectedMap = ref<Record<number, boolean>>({});
const groups = [
  { label: '全部', value: '' },
  { label: 'free', value: 'free' },
  { label: 'vip', value: 'vip' },
  { label: 'svip', value: 'svip' },
  { label: 'admin', value: 'admin' }
];

const columns = [
  {
    title: '',
    key: 'selection',
    width: 48,
    render: (row: any) => h('input', {
      type: 'checkbox',
      checked: !!selectedMap.value[row.id],
      onChange: (e: Event) => {
        const checked = (e.target as HTMLInputElement).checked;
        selectedMap.value[row.id] = checked;
        sel.value = Object.keys(selectedMap.value).filter(k => selectedMap.value[Number(k)]).map(Number);
      }
    })
  },
  { title: 'ID', key: 'id', width: 80 },
  { title: '用户名', key: 'username' },
  { title: '邮箱', key: 'email' },
  { title: '组', key: 'usergroup', render: (r:any)=> h(NTag, { type: 'info' }, { default:()=> r.usergroup }) },
  { title: '隧道数', key: 'tunnel_count' },
  { title: '已用端口', key: 'used_ports' },
  { title: '状态', key: 'status' },
  { title: '注册时间', key: 'regtime' }
];

watch(rows, (val) => {
  // 清理不存在的key
  const ids = val.map(v => v.id);
  Object.keys(selectedMap.value).forEach(k => {
    if (!ids.includes(Number(k))) delete selectedMap.value[Number(k)];
  });
  sel.value = Object.keys(selectedMap.value).filter(k => selectedMap.value[Number(k)]).map(Number);
});

const filtered = computed(()=>{
  let r = rows.value;
  if (keyword.value) {
    const k = keyword.value.toLowerCase();
    r = r.filter(x => String(x.username).toLowerCase().includes(k) || String(x.email||'').toLowerCase().includes(k));
  }
  if (filterGroup.value) r = r.filter(x => x.usergroup === filterGroup.value);
  return r;
});

async function load() {
  loading.value = true;
  try {
    const base = (import.meta as any).env?.VITE_API_BASE_URL || '';
    const token = useUserStore().userInfo?.usertoken || '';
    const resp = await axios.get(`${base}/admin/users?token=${token}`);
    if (resp.data?.code === 200) rows.value = resp.data.data || [];
  } catch(e:any){ message.error('加载失败: '+(e?.message||e)); }
  finally{ loading.value=false; }
}

const showBatch = ref(false);
const batchType = ref<'enable'|'disable'|'delete'|'set_group'>('enable');
const batchTitle = computed(()=> ({enable:'启用',disable:'禁用',delete:'删除','set_group':'设置分组'}[batchType.value]+'（批量）'));
const targetGroup = ref('free');
const processing = ref(false);

function openBatch(type: 'enable'|'disable'|'delete') { batchType.value = type; showBatch.value = true; }
function openBatchSetGroup() { batchType.value = 'set_group'; showBatch.value = true; }

async function doBatch(){
  processing.value = true;
  try {
    const base = (import.meta as any).env?.VITE_API_BASE_URL || '';
    const token = localStorage.getItem('token');
    const payload:any = { token, action: batchType.value, user_ids: sel.value };
    if (batchType.value === 'set_group') payload.group = targetGroup.value;
    await axios.post(`${base}/admin/users/batch`, payload);
    message.success('执行成功');
    showBatch.value = false; sel.value=[]; await load();
  } catch(e:any){ message.error('执行失败: '+(e?.message||e)); }
  finally{ processing.value=false; }
}

load();
</script>
