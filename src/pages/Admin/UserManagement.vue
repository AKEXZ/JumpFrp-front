<template>
  <n-back-top :right="100" />
  <n-card title="用户管理" :bordered="false">
    <n-space align="center" justify="space-between">
      <n-input v-model:value="keyword" placeholder="搜索用户名/邮箱/令牌" clearable style="width: 320px" />
      <n-space>
        <n-button type="primary" @click="openCreate">新增用户</n-button>
        <n-button @click="resetPwd" :disabled="!selected">重置密码</n-button>
        <n-button @click="resetToken" :disabled="!selected">重置Token</n-button>
        <n-button type="warning" @click="banUser" :disabled="!selected">禁用</n-button>
        <n-button type="error" @click="deleteUser" :disabled="!selected">删除用户</n-button>
        <n-button type="primary" @click="upgradeVip" :disabled="!selected">设为VIP(+1月)</n-button>
      </n-space>
    </n-space>
    <n-data-table :columns="columns" :data="filtered" :row-key="rowKey" :bordered="false" style="margin-top: 16px" @update:checked-row-keys="onCheck" />
  </n-card>

  <!-- 新增用户弹窗 -->
  <n-modal v-model:show="showModal" title="新增用户">
    <n-form :model="form">
      <n-form-item label="用户名"><n-input v-model:value="form.username" /></n-form-item>
      <n-form-item label="密码"><n-input v-model:value="form.password" type="password" /></n-form-item>
      <n-form-item label="邮箱"><n-input v-model:value="form.email" /></n-form-item>
      <n-form-item label="分组"><n-select v-model:value="form.usergroup" :options="groupOptions" /></n-form-item>
    </n-form>
    <template #action>
      <n-button @click="showModal=false">取消</n-button>
      <n-button type="primary" :loading="creating" @click="createUser">保存</n-button>
    </template>
  </n-modal>
</template>

<script lang="ts" setup>
import { ref, computed, onMounted, h } from 'vue';
import { useMessage, NTag, NModal, NForm, NFormItem, NInput, NSelect } from 'naive-ui';
import axios from 'axios';
import { useUserStore } from '@/stores/user';

const apiBase = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:3000';
const message = useMessage();
const userStore = useUserStore();

interface U { id: number; username: string; email: string; usertoken: string; usergroup: string; term: string; status: string; }
const list = ref<U[]>([]);
const keyword = ref('');
const selected = ref<number | null>(null);
const showModal = ref(false);
const creating = ref(false);
const form = ref({ username: '', password: '', email: '', usergroup: 'free' });
const groupOptions = [
  { label: 'free', value: 'free' },
  { label: 'vip', value: 'vip' },
  { label: 'svip', value: 'svip' },
  { label: 'admin', value: 'admin' }
];

const columns = [
  { type: 'selection' },
  { title: 'ID', key: 'id' },
  { title: '用户名', key: 'username' },
  { title: '邮箱', key: 'email' },
  { title: '令牌', key: 'usertoken', ellipsis: true },
  { title: '分组', key: 'usergroup', render(row: U) { return h(NTag, { type: row.usergroup === 'admin' ? 'error' : row.usergroup === 'vip' ? 'success' : 'default' }, { default: () => row.usergroup }); } },
  { title: '到期', key: 'term' },
  { title: '状态', key: 'status' }
];

const filtered = computed(() => list.value.filter(u => [u.username, u.email, u.usertoken].some(v => v?.toLowerCase().includes(keyword.value.toLowerCase()))));
const rowKey = (row: U) => row.id;
function onCheck(keys: any[]) { selected.value = keys?.[0] ?? null; }

async function load() {
  const res = await axios.get(`${apiBase}/admin/users`, { params: { token: userStore.userInfo?.usertoken || '' } });
  if (res.data?.code === 200) list.value = res.data.data;
}

async function resetPwd() {
  if (!selected.value) return; const newpwd = prompt('输入新密码'); if (!newpwd) return;
  await axios.post(`${apiBase}/admin/users/reset_password`, { token: userStore.userInfo?.usertoken || '', id: selected.value, new_password: newpwd });
  message.success('已重置');
}
async function resetToken() {
  if (!selected.value) return;
  await axios.post(`${apiBase}/admin/users/reset_token`, { token: userStore.userInfo?.usertoken || '', id: selected.value });
  message.success('已重置'); load();
}
async function banUser() {
  if (!selected.value) return;
  await axios.post(`${apiBase}/admin/users/ban`, { token: userStore.userInfo?.usertoken || '', id: selected.value });
  message.success('已禁用'); load();
}
async function upgradeVip() {
  if (!selected.value) return;
  await axios.post(`${apiBase}/admin/users/upgrade_vip`, { token: userStore.userInfo?.usertoken || '', id: selected.value, months: 1 });
  message.success('已升级'); load();
}

onMounted(load);

function openCreate(){ showModal.value = true; form.value = { username: '', password: '', email: '', usergroup: 'free' }; }
async function createUser(){
  try {
    creating.value = true;
    const token = userStore.userInfo?.usertoken || '';
    await axios.post(`${apiBase}/admin/users/create`, { token, ...form.value });
    message.success('创建成功'); showModal.value = false; load();
  } catch (e:any) { message.error(e?.response?.data?.msg || '创建失败'); }
  finally { creating.value = false; }
}

async function deleteUser(){
  if (!selected.value) return;
  const token = userStore.userInfo?.usertoken || '';
  await axios.post(`${apiBase}/admin/users/delete`, { token, id: selected.value });
  message.success('删除成功');
  load();
}
</script>
