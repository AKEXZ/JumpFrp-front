import { h, Component, computed } from 'vue';
import { RouterLink } from 'vue-router';
import { NIcon } from 'naive-ui';
import { useUserStore } from '@/stores/user';
import { HomeOutline, PersonCircleOutline, DocumentsOutline, InformationCircleOutline, EllipsisHorizontalCircleOutline, ServerOutline, KeyOutline, ListOutline, StatsChartOutline } from '@vicons/ionicons5';

const userStore = useUserStore();
const userInfo = computed(() => userStore.userInfo);

// 菜单图标渲染函数
function renderIcon(icon: Component) {
    return () => h(NIcon, null, { default: () => h(icon) });
}

// 基本菜单选项
export const computedMenuOptionsUser = computed(() => [
    {
        label: () =>
            h(
                RouterLink,
                {
                    to: { name: '首页' },
                },
                { default: () => '首页' }
            ),
        key: '首页',
        icon: renderIcon(HomeOutline),
    },
    {
        type: 'divider',
        props: {
            style: { marginLeft: '32px' },
        },
    },
    {
        label: () =>
            h(
                RouterLink,
                {
                    to: { name: '个人资料' },
                },
                { default: () => '个人资料' }
            ),
        key: '个人资料',
        icon: renderIcon(PersonCircleOutline),
    },
    // 移除隧道管理、扩展功能、增值中心
    {
        label: '其他信息',
        key: '其他信息',
        icon: renderIcon(EllipsisHorizontalCircleOutline),
        children: [
            {
                label: () =>
                    h(
                        RouterLink,
                        {
                            to: { name: '关于面板' },
                        },
                        { default: () => '关于面板' }
                    ),
                key: '关于面板',
                icon: renderIcon(InformationCircleOutline),
            },
            {
                label: () =>
                    h(
                        'a',
                        {
                            href: 'https://docs.chcat.cn',
                            target: '_blank',
                            rel: 'noopenner noreferrer',
                        },
                        { default: () => '帮助文档' }
                    ),
                key: '帮助文档',
                icon: renderIcon(DocumentsOutline),
            },
        ],
    },
]);

// 管理员菜单选项
export const computedMenuOptionsAdmin = computed(() => []);
// 管理功能菜单（仅管理员可见）
export const computedAdminOps = computed(() => [
    {
        label: '集中管理',
        key: '集中管理',
        icon: renderIcon(ServerOutline),
        children: [
            {
                label: () => h(RouterLink, { to: { name: '节点运维' } }, { default: () => '节点运维' }),
                key: '节点运维',
                icon: renderIcon(ServerOutline),
            },
            {
                label: () => h(RouterLink, { to: { name: '权限模板' } }, { default: () => '权限模板' }),
                key: '权限模板',
                icon: renderIcon(KeyOutline),
            },
            {
                label: () => h(RouterLink, { to: { name: '隧道管理' } }, { default: () => '隧道管理' }),
                key: '隧道管理',
                icon: renderIcon(ListOutline),
            },
            {
                label: () => h(RouterLink, { to: { name: '监控面板' } }, { default: () => '监控面板' }),
                key: '监控面板',
                icon: renderIcon(StatsChartOutline),
            },
            {
                label: () => h(RouterLink, { to: { name: '系统设置' } }, { default: () => '系统设置' }),
                key: '系统设置',
                icon: renderIcon(KeyOutline),
            },
            {
                label: () => h(RouterLink, { to: { name: '用户管理' } }, { default: () => '用户管理' }),
                key: '用户管理',
                icon: renderIcon(PersonCircleOutline),
            },
            {
                label: () => h(RouterLink, { to: { name: '系统日志' } }, { default: () => '系统日志' }),
                key: '系统日志',
                icon: renderIcon(DocumentsOutline),
            },
        ],
    },
]);

// 访客菜单选项
export const computedMenuOptionsGuest = computed(() => [
    {
        label: '隧道管理',
        key: '隧道管理',
        icon: renderIcon(ListOutline),
        children: [
            {
                label: () =>
                    h(
                        RouterLink,
                        {
                            to: { name: '节点状态' },
                        },
                        { default: () => '节点状态' }
                    ),
                key: '节点状态',
                icon: renderIcon(StatsChartOutline),
            },
        ],
    },
    // {
    //   label: '扩展功能',
    //   key: '扩展功能',
    //   icon: renderIcon(ExtensionPuzzleOutline),
    //   children: [
    //     {
    //       label: () => h(
    //         RouterLink,
    //         {
    //           to: { name: '应用市场' }
    //         },
    //         { default: () => '应用市场' }
    //       ),
    //       key: '应用市场',
    //       icon: renderIcon(BagHandleOutline)
    //     }
    //   ]
    // },
    {
        label: '其他信息',
        key: '其他信息',
        icon: renderIcon(EllipsisHorizontalCircleOutline),
        children: [
            {
                label: () =>
                    h(
                        RouterLink,
                        {
                            to: { name: '关于面板' },
                        },
                        { default: () => '关于面板' }
                    ),
                key: '关于面板',
                icon: renderIcon(InformationCircleOutline),
            },
            {
                label: () =>
                    h(
                        'a',
                        {
                            href: 'https://docs.chcat.cn',
                            target: '_blank',
                            rel: 'noopenner noreferrer',
                        },
                        { default: () => '帮助文档' }
                    ),
                key: '帮助文档',
                icon: renderIcon(DocumentsOutline),
            },
        ],
    },
]);

export const computedMenuOptions = computed(() => {
    // 兼容英文分组（后端使用 admin/vip/...）
    const group = userInfo.value?.usergroup;
    const isAdmin = group === '管理员' || group === 'admin';
    if (isAdmin) {
        return [...computedMenuOptionsUser.value, ...computedAdminOps.value];
    } else if (!userInfo.value) {
        return computedMenuOptionsGuest.value;
    } else {
        return computedMenuOptionsUser.value;
    }
});
