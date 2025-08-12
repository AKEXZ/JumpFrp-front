<template>
  <n-space vertical>
    <n-card title="权限模板">
      <n-space>
        <n-button :loading="loading" @click="load">刷新</n-button>
        <n-button type="primary" @click="openEdit()">新增</n-button>
      </n-space>
      <n-data-table :columns="columns" :data="rows" :loading="loading" style="margin-top: 12px" />
    </n-card>

    <n-modal v-model:show="show" preset="dialog" :title="editing?.name ? '编辑模板' : '新增模板'">
      <n-form :model="form">
        <n-form-item label="标识(name)"><n-input v-model:value="form.name" placeholder="normal/vip/svip" /></n-form-item>
        <n-form-item label="显示名"><n-input v-model:value="form.display_name" placeholder="普通用户/VIP用户/SVIP用户" /></n-form-item>
        <n-form-item label="最大端口数"><n-input-number v-model:value="form.max_ports" :min="0" /></n-form-item>
        <n-form-item label="带宽上限(Mbps)"><n-input-number v-model:value="form.bandwidth_mbps" :min="0" /></n-form-item>
        <n-form-item label="节点访问范围">
          <n-select v-model:value="form.node_access" :options="[
            { label: '普通', value: 'user' },
            { label: '普通+VIP', value: 'user+vip' },
            { label: '全部', value: 'all' }
          ]" />
        </n-form-item>
      </n-form>
      <template #action>
        <n-space>
          <n-button @click="show=false">取消</n-button>
          <n-button type="primary" :loading="saving" @click="save">保存</n-button>
        </n-space>
      </template>
    </n-modal>

    <n-card title="批量应用到用户">
      <n-space>
        <n-select v-model:value="applyGroup" :options="[
          { label: '普通', value: 'normal' },
          { label: 'VIP', value: 'vip' },
          { label: 'SVIP', value: 'svip' }
        ]" style="min-width: 160px" />
        <n-input v-model:value="applyUserIds" placeholder="用户ID，逗号分隔" style="min-width: 260px" />
        <n-button type="primary" :loading="applying" @click="apply">应用</n-button>
      </n-space>
    </n-card>
  </n-space>
</template>

<script setup lang="ts">
import { ref, h } from 'vue';
import { NButton, useMessage } from 'naive-ui';
import axios from 'axios';

const message = useMessage();

const loading = ref(false);
const rows = ref<any[]>([]);

const columns = [
  { title: '标识', key: 'name' },
  { title: '显示名', key: 'display_name' },
  { title: '最大端口数', key: 'max_ports' },
  { title: '带宽(Mbps)', key: 'bandwidth_mbps' },
  { title: '访问范围', key: 'node_access' },
  { title: '更新时间', key: 'updated_at' },
  {
    title: '操作', key: 'actions', render(row: any) {
      return h(NButton, { size: 'small', onClick: () => openEdit(row) }, { default: () => '编辑' });
    }
  }
];

async function load() {
  loading.value = true;
  try {
    const base = (import.meta as any).env?.VITE_API_BASE_URL || '';
    const resp = await axios.get(base + '/perm/groups');
    if (resp.data?.code === 200) rows.value = resp.data.data || [];
  } catch (e: any) {
    message.error('加载失败: ' + (e?.message || e));
  } finally { loading.value = false; }
}

const show = ref(false);
const saving = ref(false);
const editing = ref<any | null>(null);
const form = ref<any>({ name: '', display_name: '', max_ports: 0, bandwidth_mbps: 0, node_access: 'user' });

function openEdit(row?: any) {
  editing.value = row || null;
  form.value = row ? { ...row } : { name: '', display_name: '', max_ports: 0, bandwidth_mbps: 0, node_access: 'user' };
  show.value = true;
}

async function save() {
  saving.value = true;
  try {
    const base = (import.meta as any).env?.VITE_API_BASE_URL || '';
    await axios.put(base + '/perm/groups', form.value);
    message.success('保存成功');
    show.value = false;
    await load();
  } catch (e: any) { message.error('保存失败: ' + (e?.message || e)); }
  finally { saving.value = false; }
}

const applying = ref(false);
const applyGroup = ref<'normal'|'vip'|'svip'|null>(null);
const applyUserIds = ref('');

async function apply() {
  if (!applyGroup.value || !applyUserIds.value.trim()) { message.warning('请选择模板并填写用户ID'); return; }
  applying.value = true;
  try {
    const ids = applyUserIds.value.split(',').map((s) => Number(s.trim())).filter((n) => !isNaN(n));
    const base = (import.meta as any).env?.VITE_API_BASE_URL || '';
    await axios.post(base + '/perm/apply_to_users', { group: applyGroup.value, user_ids: ids });
    message.success('已应用到用户');
  } catch (e: any) { message.error('应用失败: ' + (e?.message || e)); }
  finally { applying.value = false; }
}

load();
</script>


