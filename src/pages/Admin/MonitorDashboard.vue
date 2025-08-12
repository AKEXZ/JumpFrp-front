<template>
  <n-space vertical>
    <!-- 概览卡片 -->
    <n-grid :cols="4" :x-gap="12" :y-gap="12">
      <n-grid-item>
        <n-card>
          <n-statistic label="总用户数" :value="dashboard.users?.total_users || 0">
            <template #suffix>
              <n-icon><UserOutlined /></n-icon>
            </template>
          </n-statistic>
        </n-card>
      </n-grid-item>
      <n-grid-item>
        <n-card>
          <n-statistic label="在线节点" :value="dashboard.nodes?.online_nodes || 0">
            <template #suffix>
              <n-icon><ServerOutlined /></n-icon>
            </template>
          </n-statistic>
        </n-card>
      </n-grid-item>
      <n-grid-item>
        <n-card>
          <n-statistic label="在线隧道" :value="dashboard.tunnels?.online_tunnels || 0">
            <template #suffix>
              <n-icon><ApiOutlined /></n-icon>
            </template>
          </n-statistic>
        </n-card>
      </n-grid-item>
      <n-grid-item>
        <n-card>
          <n-statistic label="今日流量" :value="formatBytes(dashboard.tunnels?.total_traffic || 0)">
            <template #suffix>
              <n-icon><CloudOutlined /></n-icon>
            </template>
          </n-statistic>
        </n-card>
      </n-grid-item>
    </n-grid>

    <!-- 详细统计 -->
    <n-grid :cols="2" :x-gap="12" :y-gap="12">
      <!-- 用户统计 -->
      <n-grid-item>
        <n-card title="用户统计">
          <n-space vertical>
            <n-statistic label="付费用户" :value="dashboard.users?.paid_users || 0" />
            <n-statistic label="活跃用户" :value="dashboard.users?.active_users || 0" />
            <n-progress 
              type="line" 
              :percentage="getPaidUserPercentage()" 
              :color="getProgressColor(getPaidUserPercentage())"
            />
            <n-text depth="3">付费用户占比: {{ getPaidUserPercentage() }}%</n-text>
          </n-space>
        </n-card>
      </n-grid-item>

      <!-- 系统状态 -->
      <n-grid-item>
        <n-card title="系统状态">
          <n-space vertical>
            <n-statistic label="CPU负载" :value="getCpuLoad()" suffix="%" />
            <n-statistic label="内存使用" :value="getMemoryUsage()" suffix="%" />
            <n-statistic label="运行时间" :value="formatUptime(dashboard.system?.uptime || 0)" />
            <n-progress 
              type="line" 
              :percentage="getMemoryUsage()" 
              :color="getProgressColor(getMemoryUsage())"
            />
          </n-space>
        </n-card>
      </n-grid-item>
    </n-grid>

    <!-- 图表区域 -->
    <n-grid :cols="2" :x-gap="12" :y-gap="12">
      <!-- 节点状态分布 -->
      <n-grid-item>
        <n-card title="节点状态分布">
          <div ref="nodeChartRef" style="height: 300px;"></div>
        </n-card>
      </n-grid-item>

      <!-- 隧道类型分布 -->
      <n-grid-item>
        <n-card title="隧道类型分布">
          <div ref="tunnelChartRef" style="height: 300px;"></div>
        </n-card>
      </n-grid-item>
    </n-grid>

    <!-- 实时监控 -->
    <n-card title="实时监控">
      <n-space vertical>
        <n-space>
          <n-button :loading="loading" @click="refreshData">刷新数据</n-button>
          <n-button @click="startAutoRefresh" :disabled="autoRefresh">开始自动刷新</n-button>
          <n-button @click="stopAutoRefresh" :disabled="!autoRefresh">停止自动刷新</n-button>
        </n-space>
        
        <n-grid :cols="3" :x-gap="12" :y-gap="12">
          <n-grid-item>
            <n-card title="节点延迟测试" size="small">
              <n-space vertical>
                <n-statistic label="平均延迟" :value="latencyStats.averageLatency" suffix="ms" />
                <n-statistic label="测试成功" :value="latencyStats.successful" />
                <n-statistic label="测试失败" :value="latencyStats.failed" />
                <n-button size="small" @click="testLatency" :loading="latencyTesting">
                  开始测试
                </n-button>
              </n-space>
            </n-card>
          </n-grid-item>
          
          <n-grid-item>
            <n-card title="系统负载" size="small">
              <n-space vertical>
                <n-statistic label="1分钟" :value="dashboard.system?.cpu?.[0]?.toFixed(2) || 0" />
                <n-statistic label="5分钟" :value="dashboard.system?.cpu?.[1]?.toFixed(2) || 0" />
                <n-statistic label="15分钟" :value="dashboard.system?.cpu?.[2]?.toFixed(2) || 0" />
              </n-space>
            </n-card>
          </n-grid-item>
          
          <n-grid-item>
            <n-card title="内存使用" size="small">
              <n-space vertical>
                <n-statistic label="总内存" :value="formatBytes(dashboard.system?.memory?.total || 0)" />
                <n-statistic label="已使用" :value="formatBytes(dashboard.system?.memory?.used || 0)" />
                <n-statistic label="可用" :value="formatBytes(dashboard.system?.memory?.free || 0)" />
              </n-space>
            </n-card>
          </n-grid-item>
        </n-grid>
      </n-space>
    </n-card>

    <!-- 节点延迟详情 -->
    <n-card title="节点延迟详情" v-if="latencyData.length > 0">
      <n-data-table 
        :columns="latencyColumns" 
        :data="latencyData" 
        :pagination="{ pageSize: 10 }"
      />
    </n-card>
  </n-space>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue';
import { useMessage } from 'naive-ui';
import { UserOutlined, ServerOutlined, ApiOutlined, CloudOutlined } from '@vicons/antd';
import * as echarts from 'echarts';
import axios from 'axios';

const message = useMessage();

// 响应式数据
const loading = ref(false);
const autoRefresh = ref(false);
const latencyTesting = ref(false);
const dashboard = ref<any>({});
const latencyData = ref<any[]>([]);
const latencyStats = ref<any>({});
const autoRefreshInterval = ref<any>(null);

// 图表引用
const nodeChartRef = ref<HTMLElement>();
const tunnelChartRef = ref<HTMLElement>();
let nodeChart: echarts.ECharts | null = null;
let tunnelChart: echarts.ECharts | null = null;

// 延迟测试表格列
const latencyColumns = [
  { title: '节点名称', key: 'name' },
  { title: '地址', key: 'host' },
  { title: '端口', key: 'port' },
  { title: '延迟', key: 'latency', render: (row: any) => 
    row.status === 'success' ? `${row.latency}ms` : '超时'
  },
  { title: '状态', key: 'status', render: (row: any) => 
    row.status === 'success' ? '成功' : '失败'
  }
];

// 方法
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${days}天 ${hours}小时 ${minutes}分钟`;
}

function getPaidUserPercentage(): number {
  if (!dashboard.value.users?.total_users) return 0;
  return Math.round((dashboard.value.users.paid_users / dashboard.value.users.total_users) * 100);
}

function getCpuLoad(): number {
  const load = dashboard.value.system?.cpu?.[0] || 0;
  return Math.round(load * 100);
}

function getMemoryUsage(): number {
  const memory = dashboard.value.system?.memory;
  if (!memory?.total) return 0;
  return Math.round((memory.used / memory.total) * 100);
}

function getProgressColor(percentage: number): string {
  if (percentage < 50) return '#18a058';
  if (percentage < 80) return '#f0a020';
  return '#d03050';
}

async function loadDashboard() {
  loading.value = true;
  try {
    const base = (import.meta as any).env?.VITE_API_BASE_URL || '';
    const token = localStorage.getItem('token');
    const resp = await axios.get(`${base}/monitor/dashboard?token=${token}`);
    
    if (resp.data?.code === 200) {
      dashboard.value = resp.data.data;
      await nextTick();
      updateCharts();
    }
  } catch (e: any) {
    message.error('加载监控数据失败: ' + (e?.message || e));
  } finally {
    loading.value = false;
  }
}

async function testLatency() {
  latencyTesting.value = true;
  try {
    const base = (import.meta as any).env?.VITE_API_BASE_URL || '';
    const token = localStorage.getItem('token');
    const resp = await axios.get(`${base}/monitor/latency?token=${token}`);
    
    if (resp.data?.code === 200) {
      latencyData.value = resp.data.data.nodes || [];
      latencyStats.value = resp.data.data.statistics || {};
      message.success('延迟测试完成');
    }
  } catch (e: any) {
    message.error('延迟测试失败: ' + (e?.message || e));
  } finally {
    latencyTesting.value = false;
  }
}

function refreshData() {
  loadDashboard();
  testLatency();
}

function startAutoRefresh() {
  autoRefresh.value = true;
  autoRefreshInterval.value = setInterval(() => {
    refreshData();
  }, 30000); // 30秒刷新一次
  message.success('已开启自动刷新');
}

function stopAutoRefresh() {
  autoRefresh.value = false;
  if (autoRefreshInterval.value) {
    clearInterval(autoRefreshInterval.value);
    autoRefreshInterval.value = null;
  }
  message.success('已停止自动刷新');
}

function updateCharts() {
  // 更新节点状态图表
  if (nodeChart && dashboard.value.nodes) {
    const nodeData = [
      { value: dashboard.value.nodes.online_nodes || 0, name: '在线' },
      { value: (dashboard.value.nodes.total_nodes || 0) - (dashboard.value.nodes.online_nodes || 0), name: '离线' }
    ];
    
    nodeChart.setOption({
      series: [{
        data: nodeData
      }]
    });
  }

  // 更新隧道类型图表
  if (tunnelChart && dashboard.value.tunnels?.byType) {
    const tunnelData = dashboard.value.tunnels.byType.map((item: any) => ({
      value: item.total,
      name: item.type.toUpperCase()
    }));
    
    tunnelChart.setOption({
      series: [{
        data: tunnelData
      }]
    });
  }
}

function initCharts() {
  // 初始化节点状态图表
  if (nodeChartRef.value) {
    nodeChart = echarts.init(nodeChartRef.value);
    nodeChart.setOption({
      title: { text: '节点状态分布' },
      tooltip: { trigger: 'item' },
      legend: { orient: 'vertical', left: 'left' },
      series: [{
        type: 'pie',
        radius: '50%',
        data: [],
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.5)'
          }
        }
      }]
    });
  }

  // 初始化隧道类型图表
  if (tunnelChartRef.value) {
    tunnelChart = echarts.init(tunnelChartRef.value);
    tunnelChart.setOption({
      title: { text: '隧道类型分布' },
      tooltip: { trigger: 'item' },
      legend: { orient: 'vertical', left: 'left' },
      series: [{
        type: 'pie',
        radius: '50%',
        data: [],
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.5)'
          }
        }
      }]
    });
  }
}

// 生命周期
onMounted(() => {
  initCharts();
  refreshData();
});

onUnmounted(() => {
  stopAutoRefresh();
  if (nodeChart) {
    nodeChart.dispose();
  }
  if (tunnelChart) {
    tunnelChart.dispose();
  }
});
</script>

<style scoped>
.n-card {
  margin-bottom: 16px;
}
</style>
