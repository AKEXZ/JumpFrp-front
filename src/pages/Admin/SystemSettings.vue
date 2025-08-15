<template>
  <n-space vertical>
    <n-card title="系统设置">
      <n-form :model="form">
        <n-grid cols="1 m:2" x-gap="12">
          <n-grid-item>
            <n-form-item label="系统名称"><n-input v-model:value="form.SYSTEM_NAME" /></n-form-item>
          </n-grid-item>
          <n-grid-item>
            <n-form-item label="维护模式"><n-switch v-model:value="form.MAINTENANCE_MODE" /></n-form-item>
          </n-grid-item>
          <n-grid-item>
            <n-form-item label="允许注册"><n-switch v-model:value="form.REGISTRATION_ENABLED" /></n-form-item>
          </n-grid-item>
          <n-grid-item>
            <n-form-item label="Agent Token"><n-input v-model:value="form.NODE_AGENT_TOKEN" /></n-form-item>
          </n-grid-item>
          <n-grid-item>
            <n-form-item label="SMTP 主机"><n-input v-model:value="form.SMTP_HOST" placeholder="smtp.example.com" /></n-form-item>
          </n-grid-item>
          <n-grid-item>
            <n-form-item label="SMTP 端口"><n-input v-model:value="form.SMTP_PORT" placeholder="587" /></n-form-item>
          </n-grid-item>
          <n-grid-item>
            <n-form-item label="SMTP 用户"><n-input v-model:value="form.SMTP_USER" placeholder="user@example.com" /></n-form-item>
          </n-grid-item>
          <n-grid-item>
            <n-form-item label="SMTP 密码"><n-input v-model:value="form.SMTP_PASS" type="password" /></n-form-item>
          </n-grid-item>
          <n-grid-item>
            <n-form-item label="发件邮箱"><n-input v-model:value="form.FROM_EMAIL" placeholder="noreply@example.com" /></n-form-item>
          </n-grid-item>
          <n-grid-item>
            <n-form-item label="发件人名称"><n-input v-model:value="form.FROM_NAME" placeholder="JumpFrp" /></n-form-item>
          </n-grid-item>
        </n-grid>
      </n-form>
      <n-space>
        <n-button :loading="loading" @click="load">刷新</n-button>
        <n-button type="primary" :loading="saving" @click="save">保存</n-button>
      </n-space>
    </n-card>
  </n-space>
</template>
<script setup lang="ts">
import { ref } from 'vue';
import axios from 'axios';
import { useMessage } from 'naive-ui';
import { useUserStore } from '@/stores/user';

const message = useMessage();
const loading = ref(false);
const saving = ref(false);
const form = ref<any>({});

async function load() {
  loading.value = true;
  try {
    const base = (import.meta as any).env?.VITE_API_BASE_URL || '';
    const token = useUserStore().userInfo?.usertoken || '';
    const resp = await axios.get(`${base}/system/settings?token=${token}`);
    if (resp.data?.code === 200) {
      const data = resp.data.data || {};
      form.value = {
        SYSTEM_NAME: data.SYSTEM_NAME?.value || 'JumpFrp管理面板',
        MAINTENANCE_MODE: (data.MAINTENANCE_MODE?.value || 'false') === 'true',
        REGISTRATION_ENABLED: (data.REGISTRATION_ENABLED?.value || 'true') === 'true',
        NODE_AGENT_TOKEN: data.NODE_AGENT_TOKEN?.value || '',
        SMTP_HOST: data.SMTP_HOST?.value || '',
        SMTP_PORT: data.SMTP_PORT?.value || '587',
        SMTP_USER: data.SMTP_USER?.value || '',
        SMTP_PASS: data.SMTP_PASS?.value || '',
        FROM_EMAIL: data.FROM_EMAIL?.value || '',
        FROM_NAME: data.FROM_NAME?.value || 'JumpFrp'
      };
    }
  } catch (e: any) {
    message.error('加载失败: ' + (e?.message || e));
  } finally { loading.value = false; }
}

async function save() {
  saving.value = true;
  try {
    const base = (import.meta as any).env?.VITE_API_BASE_URL || '';
    const token = useUserStore().userInfo?.usertoken || '';
    const payload = {
      settings: {
        SYSTEM_NAME: form.value.SYSTEM_NAME,
        MAINTENANCE_MODE: String(!!form.value.MAINTENANCE_MODE),
        REGISTRATION_ENABLED: String(!!form.value.REGISTRATION_ENABLED),
        NODE_AGENT_TOKEN: form.value.NODE_AGENT_TOKEN,
        SMTP_HOST: form.value.SMTP_HOST,
        SMTP_PORT: form.value.SMTP_PORT,
        SMTP_USER: form.value.SMTP_USER,
        SMTP_PASS: form.value.SMTP_PASS,
        FROM_EMAIL: form.value.FROM_EMAIL,
        FROM_NAME: form.value.FROM_NAME
      }
    };
    await axios.put(`${base}/system/settings?token=${token}`, payload);
    message.success('保存成功');
  } catch (e: any) {
    message.error('保存失败: ' + (e?.message || e));
  } finally { saving.value = false; }
}

load();
</script>
