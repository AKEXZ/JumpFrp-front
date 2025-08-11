<template>
  <n-back-top :right="100" />
  <n-space vertical size="large">
    <n-card title="系统概览" :bordered="false">
      <n-grid cols="1 s:3 m:4 l:6" :x-gap="12" :y-gap="12">
        <n-grid-item>
          <n-card size="small" :bordered="false" class="metric-card">
            <div class="metric-title">用户总数</div>
            <div class="metric-value">{{ stats.user_amount }}</div>
          </n-card>
        </n-grid-item>
        <n-grid-item>
          <n-card size="small" :bordered="false" class="metric-card">
            <div class="metric-title">隧道总数</div>
            <div class="metric-value">{{ stats.tunnel_amount }}</div>
          </n-card>
        </n-grid-item>
        <n-grid-item>
          <n-card size="small" :bordered="false" class="metric-card">
            <div class="metric-title">节点总数</div>
            <div class="metric-value">{{ stats.node_amount }}</div>
          </n-card>
        </n-grid-item>
        <n-grid-item>
          <n-card size="small" :bordered="false" class="metric-card">
            <div class="metric-title">free 用户</div>
            <div class="metric-value">{{ stats.user_breakdown.free }}</div>
          </n-card>
        </n-grid-item>
        <n-grid-item>
          <n-card size="small" :bordered="false" class="metric-card">
            <div class="metric-title">vip 用户</div>
            <div class="metric-value">{{ stats.user_breakdown.vip }}</div>
          </n-card>
        </n-grid-item>
        <n-grid-item>
          <n-card size="small" :bordered="false" class="metric-card">
            <div class="metric-title">svip 用户</div>
            <div class="metric-value">{{ stats.user_breakdown.svip }}</div>
          </n-card>
        </n-grid-item>
        <n-grid-item>
          <n-card size="small" :bordered="false" class="metric-card">
            <div class="metric-title">管理员</div>
            <div class="metric-value">{{ stats.user_breakdown.admin }}</div>
          </n-card>
        </n-grid-item>
        <n-grid-item>
          <n-card size="small" :bordered="false" class="metric-card">
            <div class="metric-title">系统域名</div>
            <div class="metric-value">{{ stats.domain_stats?.system ?? 0 }}</div>
          </n-card>
        </n-grid-item>
        <n-grid-item>
          <n-card size="small" :bordered="false" class="metric-card">
            <div class="metric-title">用户域名</div>
            <div class="metric-value">{{ stats.domain_stats?.user ?? 0 }}</div>
          </n-card>
        </n-grid-item>
      </n-grid>
    </n-card>

    <n-card title="API状态" :bordered="false">
      <div>站点：{{ serverStatus.serverName }}</div>
      <div>总负载：{{ serverStatus.load }}%</div>
      <div>CPU：{{ serverStatus.metrics.cpu }}%，内存：{{ serverStatus.metrics.memory }}%</div>
    </n-card>
  </n-space>
</template>

<script lang="ts" setup>
import { ref, onMounted, h } from 'vue';
import { useMessage, NButton } from 'naive-ui';
import axios from 'axios';
import { useUserStore } from '@/stores/user';

const apiBase = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:3000';
const message = useMessage();
const userStore = useUserStore();

const stats = ref<any>({ user_amount: 0, tunnel_amount: 0, node_amount: 0, user_breakdown: { free:0,vip:0,svip:0,admin:0 } });
const serverStatus = ref({ serverName: '-', load: 0, metrics: { cpu: 0, memory: 0, steal: 0, ioLatency: 0, threadContention: 0 } });

// 已从系统总览中移除系统域名管理

async function fetchStats() {
  try {
    const res = await axios.get(`${apiBase}/panelinfo`);
    if (res.data?.code === 200) {
      stats.value = {
        user_amount: res.data.data.user_amount,
        tunnel_amount: res.data.data.tunnel_amount,
        node_amount: res.data.data.node_amount,
        user_breakdown: res.data.data.user_breakdown || { free: 0, vip: 0, svip: 0, admin: 0 },
        domain_stats: res.data.data.domain_stats || { system: 0, user: 0 }
      } as any;
    }
  } catch {}
}

async function fetchServerStatus() {
  try {
    const res = await axios.get(`${apiBase}/api/server-status`);
    serverStatus.value = res.data;
  } catch {}
}


onMounted(() => { fetchStats(); fetchServerStatus(); });
</script>

<style scoped>
.metric-card { text-align: center; }
.metric-title { font-size: 12px; color: #909399; }
.metric-value { font-size: 20px; font-weight: 700; margin-top: 4px; }
</style>
