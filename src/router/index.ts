import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router';
import { useProviderStore } from '../stores/provider';
import { useUserStore } from '../stores/user';

const routes: Array<RouteRecordRaw> = [
    {
        path: '/',
        redirect: '/home',
        component: () => import('@/views/HomeView.vue'),
        children: [
            {
                path: '/tunnels',
                name: '隧道管理',
                component: () => import('@/pages/Admin/TunnelManagement.vue'),
                meta: { title: '隧道管理 - JumpFrp', requiresAuth: true },
            },
            {
                path: '/tunnel/list',
                name: '隧道列表',
                component: () => import('@/pages/Admin/TunnelManagement.vue'),
                meta: { title: '隧道列表 - JumpFrp', requiresAuth: true },
            },
            {
                path: '/tunnel/config',
                name: '配置文件',
                component: () => import('@/pages/Tunnel/ConfigPage.vue'),
                meta: { title: '配置文件 - JumpFrp', requiresAuth: true },
            },
            {
                path: '/tunnel/status',
                name: '隧道状态',
                component: () => import('@/pages/Tunnel/StatusPage.vue'),
                meta: { title: '隧道状态 - JumpFrp', requiresAuth: true },
            },
            {
                path: '/tunnel/info',
                name: '隧道详情',
                component: () => import('@/views/TunnelInfo.vue'),
                meta: {
                    title: '隧道详情 - JumpFrp',
                    keywords: 'JumpFrp, 隧道详情, 内网穿透, 端口映射, frp, 免费frp, 映射',
                    description:
                        'JumpFrp用户隧道详情，这里会展示隧道连接数，今日流量，节点负载信息，隧道基础信息及关联程序等。',
                },
            },
            {
                path: '/home',
                name: '首页',
                component: () => import('@/pages/HomePage.vue'),
                meta: {
                    title: 'JumpFrp - 控制台首页',
                    keywords: 'JumpFrp, 内网穿透, 端口映射, frp, 免费frp, 映射',
                    description: 'JumpFrp控制台首页，您可以在这里查看您的JumpFrp账户预览',
                    requiresAuth: true,
                },
            },
            {
                path: '/user',
                name: '个人资料',
                component: () => import('@/pages/UserPage.vue'),
                meta: {
                    title: '个人资料 - JumpFrp',
                    keywords: 'JumpFrp, 个人资料, 用户信息, 内网穿透, 端口映射, frp, 免费frp, 映射',
                    description: '管理和查看您的JumpFrp个人资料和账户信息。',
                    requiresAuth: true,
                },
            },
        ],
    },
    // 移除隧道管理相关路由
    // 移除扩展功能相关路由
    // 移除增值中心相关路由
    {
        path: '/',
    name: '后台管理',
        component: () => import('@/views/HomeView.vue'),
        children: [
            {
                path: '/admin/node-ops',
                name: '节点管理',
                component: () => import('@/pages/Admin/NodeOps.vue'),
                meta: { title: '节点管理 - JumpFrp', requiresAuth: true },
            },
            // 已移除权限模板入口（后端接口仍保留，前端不再暴露）
            
            {
                path: '/admin/monitor',
                name: '监控面板',
                component: () => import('@/pages/Admin/MonitorDashboard.vue'),
                meta: { title: '监控面板 - JumpFrp', requiresAuth: true, requiresAdmin: true },
            },
            {
                path: '/admin/system-settings',
                name: '系统设置',
                component: () => import('@/pages/Admin/SystemSettings.vue'),
                meta: { title: '系统设置 - JumpFrp', requiresAuth: true, requiresAdmin: true },
            },
            {
                path: '/admin/users',
                name: '用户管理',
                component: () => import('@/pages/Admin/UsersAdmin.vue'),
                meta: { title: '用户管理 - JumpFrp', requiresAuth: true, requiresAdmin: true },
            },
            {
                path: '/admin/system-logs',
                name: '系统日志',
                component: () => import('@/pages/Admin/SystemLogs.vue'),
                meta: { title: '系统日志 - JumpFrp', requiresAuth: true, requiresAdmin: true },
            },
            {
                path: '/other/about', name: '关于面板', component: () => import('@/pages/Other/AboutPage.vue'),
                meta: { title: '关于面板 - JumpFrp' },
            },
            
            {
                path: '/node/info',
                name: '节点详情',
                component: () => import('@/views/NodeInfo.vue'),
                meta: {
                    title: '节点详情 - JumpFrp',
                    keywords: 'JumpFrp, 节点详情, 内网穿透, 端口映射, frp, 免费frp, 映射',
                    description: 'JumpFrp单个节点详情，这里会展示映射节点关联数据。',
                },
            },
        ],
    },
    {
        path: '/sign',
        name: '登录',
        component: () => import('@/views/SignView.vue'),
        meta: {
            title: '登录 - JumpFrp',
            keywords: 'JumpFrp, 登录, 用户认证, 内网穿透, 端口映射, frp, 免费frp, 映射',
            description: '登录到JumpFrp控制台管理面板',
        },
    },
    // 移除管理面板相关路由
    {
        path: '/:pathMatch(.*)*',
        name: 'NotFound',
        component: () => import('@/views/NotFound.vue'),
    },
];

const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes,
});

router.beforeEach((to, from, next) => {
    void from;

    useProviderStore().loadingBar?.start();

    const userStore = useUserStore();
    const isAuthenticated = !!userStore.userInfo; // 检查是否存在用户信息

    if (to.meta.requiresAuth && !isAuthenticated) {
        // 如果路由需要认证且用户未登录
        next({ path: '/sign' });
    } else {
        next();
    }
});

router.afterEach(() => {
    useProviderStore().loadingBar?.finish();
});

export default router;
