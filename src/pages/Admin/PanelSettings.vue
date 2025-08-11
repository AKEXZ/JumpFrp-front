<template>
    <n-back-top :right="100" />
    <!-- 已移除：免费域名管理卡片 -->

    <n-card title="邮件配置" style="margin-top:16px">
        <n-form :model="mail" label-placement="left" label-width="120">
            <n-form-item label="SMTP 主机"><n-input v-model:value="mail.SMTP_HOST" /></n-form-item>
            <n-form-item label="SMTP 端口"><n-input v-model:value="mail.SMTP_PORT" /></n-form-item>
            <n-form-item label="SMTP 用户"><n-input v-model:value="mail.SMTP_USER" /></n-form-item>
            <n-form-item label="SMTP 密码"><n-input v-model:value="mail.SMTP_PASS" type="password" /></n-form-item>
            <n-form-item label="发件人邮箱"><n-input v-model:value="mail.FROM_EMAIL" /></n-form-item>
            <n-form-item label="发件人名称"><n-input v-model:value="mail.FROM_NAME" /></n-form-item>
            <n-form-item label="测试收件邮箱">
                <n-input v-model:value="testToEmail" placeholder="请输入用于测试的邮箱地址" style="width: 320px" />
            </n-form-item>
            <n-space>
                <n-button type="primary" :loading="savingMail" @click="saveMail">保存</n-button>
                <n-button type="default" tertiary :loading="testingMail" @click="testMail">发送测试邮件</n-button>
            </n-space>
        </n-form>
    </n-card>

    <n-card title="极验验证" style="margin-top:16px">
        <n-form :model="geetest" label-placement="left" label-width="120">
            <n-form-item label="启用"><n-switch v-model:value="geetest.ENABLED" /></n-form-item>
            <n-form-item label="GEETEST_ID"><n-input v-model:value="geetest.GEETEST_ID" /></n-form-item>
            <n-form-item label="GEETEST_KEY"><n-input v-model:value="geetest.GEETEST_KEY" type="password" /></n-form-item>
            <n-space>
                <n-button type="primary" :loading="savingGee" @click="saveGee">保存</n-button>
            </n-space>
        </n-form>
    </n-card>

    <n-card title="创建限制" style="margin-top:16px">
        <n-form :model="limits" label-placement="left" label-width="220">
            <n-form-item label="free: 最大隧道数"><n-input-number v-model:value="limits.limit_free_tunnels" :min="0" /></n-form-item>
            <n-form-item label="free: 允许端口范围"><n-input v-model:value="limits.limit_free_ports" placeholder="如 10000-20000" /></n-form-item>
            <n-form-item label="vip: 最大隧道数"><n-input-number v-model:value="limits.limit_vip_tunnels" :min="0" /></n-form-item>
            <n-form-item label="vip: 允许端口范围"><n-input v-model:value="limits.limit_vip_ports" /></n-form-item>
            <n-form-item label="svip: 最大隧道数"><n-input-number v-model:value="limits.limit_svip_tunnels" :min="0" /></n-form-item>
            <n-form-item label="svip: 允许端口范围"><n-input v-model:value="limits.limit_svip_ports" /></n-form-item>
            <n-space>
                <n-button type="primary" :loading="savingLimits" @click="saveLimits">保存</n-button>
            </n-space>
        </n-form>
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

// 已移除免费域名相关逻辑

// 邮件配置
const mail = ref({ SMTP_HOST:'', SMTP_PORT:'', SMTP_USER:'', SMTP_PASS:'', FROM_EMAIL:'', FROM_NAME:'' });
const savingMail = ref(false);
const testingMail = ref(false);
const testToEmail = ref('');
async function saveMail(){
  try{
    savingMail.value = true;
    const token = userStore.userInfo?.usertoken || '';
    await axios.post(`${apiBase}/admin/panel/settings`, { token, settings: mail.value });
    message.success('保存成功');
  } finally { savingMail.value = false; }
}

async function testMail(){
  try{
    if (!testToEmail.value) return message.warning('请填写测试收件邮箱');
    testingMail.value = true;
    const token = userStore.userInfo?.usertoken || '';
    // 直接用当前表单内的配置测试发送，不必先保存
    await axios.post(`${apiBase}/admin/panel/test_email`, { token, to: testToEmail.value, settings: mail.value });
    message.success('测试邮件已发送，请查收');
  } catch(e:any){
    message.error(e?.response?.data?.msg || '发送失败');
  } finally{ testingMail.value = false; }
}

// 极验配置
const geetest = ref({ ENABLED:false, GEETEST_ID:'', GEETEST_KEY:'' });
const savingGee = ref(false);
async function saveGee(){
  try{
    savingGee.value = true;
    const token = userStore.userInfo?.usertoken || '';
    await axios.post(`${apiBase}/admin/panel/settings`, { token, settings: geetest.value });
    message.success('保存成功');
  } finally{ savingGee.value=false; }
}

// 限制配置
const limits = ref({
  limit_free_tunnels: 5,
  limit_free_ports: '10000-20000',
  limit_vip_tunnels: 50,
  limit_vip_ports: '10000-60000',
  limit_svip_tunnels: 200,
  limit_svip_ports: '1-65535'
});
const savingLimits = ref(false);
async function saveLimits(){
  try{
    savingLimits.value = true;
    const token = userStore.userInfo?.usertoken || '';
    await axios.post(`${apiBase}/admin/panel/settings`, { token, settings: limits.value });
    message.success('保存成功');
  } finally{ savingLimits.value=false; }
}

onMounted(async () => {
  // 初始化拉取设置
  try{
    const token = userStore.userInfo?.usertoken || '';
    const res = await axios.get(`${apiBase}/admin/panel/settings`, { params: { token } });
    const s = res.data?.data || {};
    mail.value = { ...mail.value, ...pick(s, ['SMTP_HOST','SMTP_PORT','SMTP_USER','SMTP_PASS','FROM_EMAIL','FROM_NAME']) } as any;
    geetest.value = { ...geetest.value, ENABLED: !!s.ENABLED, GEETEST_ID: s.GEETEST_ID || '', GEETEST_KEY: s.GEETEST_KEY || '' } as any;
    limits.value = { ...limits.value, ...pick(s, ['limit_free_tunnels','limit_free_ports','limit_vip_tunnels','limit_vip_ports','limit_svip_tunnels','limit_svip_ports']) } as any;
  } catch {}
  // 已移除免费域名加载
});

function pick(obj:any, keys:string[]){ const out:any={}; keys.forEach(k=>{ if (obj[k]!==undefined) out[k]=obj[k]; }); return out; }
</script>
