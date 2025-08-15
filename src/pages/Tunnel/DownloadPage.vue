<template>
    <n-back-top :right="100" />
    <n-card>
        <div style="display: flex; align-items: center">
            <div style="margin-left: 10px">
                <n-h1 prefix="bar">ChmlFrp-下载中心</n-h1>
                <div>
                    <n-p>
                        此处下载的程序为ChmlFrp核心程序，需通过终端启动，无操作UI，全平台兼容，bug最少。
                    </n-p>
                </div>
                <n-button
                    v-if="!isHidden"
                    text
                    tag="a"
                    target="_blank"
                    type="primary"
                    href="https://docs.chcat.cn/docs/chmlfrp/%E4%BD%BF%E7%94%A8%E6%96%87%E6%A1%A3/tutorial"
                >
                    如果您是初次使用，请点击此链接查看教程！
                </n-button>
                <div v-if="!isHidden">
                    <n-button
                        text
                        tag="a"
                        target="_blank"
                        type="primary"
                        href="https://chaojixyz.lanzoub.com/b04jwt94d"
                    >
                        下载速度慢？点击前往蓝奏云下载。访问密码：1234
                    </n-button>
                </div>
            </div>
        </div>
        <n-grid :x-gap="20" :y-gap="20" cols="1 s:2 m:4" style="margin-top: 32px" responsive="screen">
            <n-grid-item v-for="os in osList" :key="os.name">
                <n-card
                    style="text-align: center"
                    @click="showCard(os.name)"
                    :class="{ 'card-selected': selectedOS === os.name }"
                    hoverable
                >
                    <n-icon :size="60" :component="os.icon" :color="os.color" />
                    <n-divider></n-divider>
                    <h2>{{ os.label }}</h2>
                </n-card>
            </n-grid-item>
        </n-grid>
        <n-infinite-scroll v-if="loading" :distance="1" @load="handleLoad">
            <n-skeleton
                v-for="i in count"
                :key="i"
                style="margin-top: 20px; height: 64px; border-radius: 10px"
                :sharp="false"
                size="medium"
            />
        </n-infinite-scroll>
        <div v-else-if="selectedOSData.length" :loading="loading">
            <n-card style="margin-top: 20px" v-for="item in selectedOSData" :key="item.route">
                <n-icon :size="18" style="top: 4px" :component="osIcon[selectedOS]" :color="osColors[selectedOS]" />
                <n-divider vertical />
                <span>{{ item.architecture }}</span>
                <n-divider vertical v-if="!isHidden" />
                <span style="color: #909399" v-if="!isHidden">{{ time }}</span>
                <n-button
                    v-if="!isHidden"
                    text
                    tag="a"
                    target="_blank"
                    type="primary"
                    :href="link + item.route"
                    style="float: right; padding: 3px 0"
                >
                    {{ link }}{{ item.route }}
                </n-button>
                <n-button
                    v-else
                    text
                    tag="a"
                    target="_blank"
                    type="primary"
                    :href="link + item.route"
                    style="float: right; padding: 3px 0"
                    >下载</n-button
                >
            </n-card>
        </div>
    </n-card>
</template>

<script lang="ts" setup>
// ...existing code from ChmlFrp-Panel-v3 DownloadPage.vue script部分...
</script>

<style lang="scss" scoped>
/* ...existing code from ChmlFrp-Panel-v3 DownloadPage.vue style部分... */
</style>
