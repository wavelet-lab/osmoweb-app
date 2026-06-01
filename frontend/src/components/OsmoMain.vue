<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
    name: 'OsmoMain',
});
</script>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { configureARFCN, GSMBand, RadioTechnology } from '@osmoweb/core/radio';
import type { MobileBand } from '@osmoweb/core/radio';
import type { JournalLogItem } from '@websdr/core/utils';
import { SdrInput, LogArea } from '@websdr/vue3-components';
import type { DropdownOptionProps } from '@websdr/vue3-components';
import { BtsInput } from '@osmoweb/vue3-components';
import type { BtsParams, BtsState } from '@osmoweb/vue3-components';
import { releaseBts, updateBts } from '@osmoweb/frontend-core/services';
import ThemeToggle from '@/components/ThemeToggle.vue';
import BtsControlPanel from '@/components/BtsControlPanel.vue';
import type { StatisticsValue } from '@/components/StatisticsModal.vue';
import type { RequestDeviceInfo } from '@websdr/frontend-core/webusb';
import { StreamMeter } from '@websdr/frontend-core/telemetry';
import type { StreamMeterState } from '@websdr/frontend-core/telemetry';
import { OsmoBtsTrx } from '@/osmoBtsTrx';
import type { BtsStatsGroup } from '@/osmoBtsTrx';
import { normalizeBtsStats } from '@/osmoBtsStats';

const streamMeterData = new StreamMeter();
const osmoBtsTrx: OsmoBtsTrx = new OsmoBtsTrx({ streamMeterData });
const btsInstanceId = globalThis.crypto?.randomUUID?.() ?? `tab-${Date.now()}-${Math.random().toString(36).slice(2)}`;
const BTS_CONFIG_STORAGE_KEY = 'osmoweb:bts-config';
const BTS_STATS_GROUPS: BtsStatsGroup[] = ['stats', 'rate-counters', 'bts', 'trx', 'transceiver', 'websdr'];

const defaultBtsConfig: BtsParams = configureARFCN({
    technology: RadioTechnology.GSM,
    band: GSMBand.EGSM_900,
    arfcn: 975,
});

const isStoredBtsConfig = (value: unknown): value is Pick<BtsParams, 'technology' | 'band' | 'arfcn'> => {
    if (!value || typeof value !== 'object') return false;
    const candidate = value as Partial<BtsParams>;

    return candidate.technology === RadioTechnology.GSM
        && typeof candidate.band === 'string'
        && Object.values(GSMBand).includes(candidate.band as GSMBand)
        && typeof candidate.arfcn === 'number';
};

const createBtsConfig = (config: Pick<BtsParams, 'technology' | 'band' | 'arfcn'>): BtsParams => {
    return configureARFCN({
        technology: config.technology,
        band: config.band as MobileBand,
        arfcn: config.arfcn,
    });
};

const loadBtsConfig = (): BtsParams => {
    try {
        const storedConfig = globalThis.localStorage?.getItem(BTS_CONFIG_STORAGE_KEY);
        if (!storedConfig) return defaultBtsConfig;

        const parsedConfig = JSON.parse(storedConfig);
        return isStoredBtsConfig(parsedConfig) ? createBtsConfig(parsedConfig) : defaultBtsConfig;
    } catch (error) {
        console.warn('Failed to load BTS config:', error);
        return defaultBtsConfig;
    }
};

const saveBtsConfig = (config: BtsParams) => {
    if (!isStoredBtsConfig(config)) return;

    try {
        globalThis.localStorage?.setItem(BTS_CONFIG_STORAGE_KEY, JSON.stringify({
            technology: config.technology,
            band: config.band,
            arfcn: config.arfcn,
        }));
    } catch (error) {
        console.warn('Failed to save BTS config:', error);
    }
};

const logArea = ref<InstanceType<typeof LogArea> | null>(null);
const subSystems = ref<Array<DropdownOptionProps>>([]);
const subSystemsSet = new Set<string>()

const btsConfig = ref<BtsParams>(loadBtsConfig());
const btsState = ref<BtsState>('configured'); 
const device = ref<RequestDeviceInfo>({ devName: '', vendorId: 0, productId: 0 });
const rxBytesReceived = ref(0);
const txBytesSent = ref(0);
const txLagSamples = ref(0);
const cloudConnected = ref(false);
const osmoBtsStats = ref<StatisticsValue>({});
const osmoBusy = ref(false);
const osmoError = ref<string | null>(null);

const deviceSelected = computed(() => device.value.vendorId !== 0 && device.value.productId !== 0);
const btsControlDisabled = computed(() => btsState.value === 'not-configured' || !deviceSelected.value || osmoBusy.value);
const btsRunning = computed(() => btsState.value === 'connected');
const inputsDisabled = computed(() => btsRunning.value || osmoBusy.value);
const rxFrequency = computed(() => btsConfig.value.uplinkFrequency);
const txFrequency = computed(() => btsConfig.value.downlinkFrequency);
const btsStatistics = computed<StatisticsValue>(() => ({
    state: {
        bts: btsState.value,
        running: btsRunning.value,
        cloudConnected: cloudConnected.value,
        busy: osmoBusy.value,
        error: osmoError.value,
    },
    device: {
        selected: deviceSelected.value,
        name: device.value.devName || 'not selected',
        vendorId: device.value.vendorId,
        productId: device.value.productId,
    },
    radio: {
        technology: btsConfig.value.technology ?? 'not configured',
        band: btsConfig.value.band ?? 'not configured',
        arfcn: btsConfig.value.arfcn ?? null,
        frequencies: {
            rxKhz: rxFrequency.value ?? null,
            txKhz: txFrequency.value ?? null,
        },
    },
    traffic: {
        rx: {
            bytesReceived: rxBytesReceived.value,
        },
        tx: {
            bytesSent: txBytesSent.value,
            lagBehindRxSamples: txLagSamples.value,
        },
    },
    osmoBts: osmoBtsStats.value,
}));

const handleBtsUpdate = (config: BtsParams) => {
    console.log('BTS Config updated:', config);
    btsConfig.value = config;
    saveBtsConfig(config);
    btsState.value = 'configured';
};

const getBtsUpdatePayload = () => {
    const { technology, band, arfcn } = btsConfig.value;
    if (technology !== RadioTechnology.GSM) {
        throw new Error('Only GSM BTS configuration is supported');
    }
    if (!band || !Object.values(GSMBand).includes(band as GSMBand)) {
        throw new Error('Select a GSM band');
    }
    if (typeof arfcn !== 'number') {
        throw new Error('Select an ARFCN');
    }
    return {
        instanceId: btsInstanceId,
        band: band as GSMBand,
        arfcn,
    };
};

const releaseCurrentBts = async () => {
    try {
        await releaseBts(btsInstanceId);
    } catch (error) {
        console.warn('Failed to release BTS:', error);
    }
};

const stopAndReleaseBts = async () => {
    await osmoBtsTrx.stop();
    await releaseCurrentBts();
    btsState.value = 'configured';
};

const handlePageHide = () => {
    if (!btsRunning.value) return;
    osmoBtsTrx.stop().catch(error => console.warn('Failed to stop BTS on pagehide:', error));
    releaseCurrentBts();
};

const handleBtsToggle = async () => {
    if (btsControlDisabled.value) return;

    osmoBusy.value = true;
    osmoError.value = null;

    try {
        if (btsRunning.value) {
            await stopAndReleaseBts();
        } else {
            const bts = await updateBts(getBtsUpdatePayload());
            await osmoBtsTrx.configure({
                vendorId: device.value.vendorId,
                productId: device.value.productId,
                btsConfig: bts,
            });
            await osmoBtsTrx.start();
            btsState.value = 'connected';
        }
    } catch (error) {
        osmoError.value = error instanceof Error ? error.message : String(error);
        btsState.value = 'disconnected';
        console.error('BTS toggle failed:', error);
    } finally {
        osmoBusy.value = false;
    }
};

let num = 0;

function addSubSystem(subSystem: string) {
    if (!subSystemsSet.has(subSystem)) {
        subSystemsSet.add(subSystem);
        subSystems.value.push({ value: subSystem, label: subSystem });
    }
}

const addLineToLogArea = (log: JournalLogItem) => {
    const logkey = { key: num++, log: log };
    addSubSystem(log.subSystem);
    logArea.value?.addLogItem(logkey);
}

const handleStreamMeterUpdate = (state: Readonly<StreamMeterState>) => {
    cloudConnected.value = state.cloud_is_up;
    rxBytesReceived.value = state.downloaded;
    txBytesSent.value = state.uploaded;
    txLagSamples.value = state.wr_ahead_avg;
};

let unsubscribeStreamMeter: (() => void) | undefined;
let btsStatsInterval: ReturnType<typeof setInterval> | undefined;

const refreshBtsStats = async () => {
    if (!btsRunning.value) return;
    const entries = await Promise.all(BTS_STATS_GROUPS.map(async group => {
        try {
            return [group, normalizeBtsStats(group, await osmoBtsTrx.getBtsStats(group))] as const;
        } catch (error) {
            return [group, error instanceof Error ? error.message : String(error)] as const;
        }
    }));
    osmoBtsStats.value = Object.fromEntries(entries);
};

const stopBtsStatsPolling = () => {
    if (btsStatsInterval !== undefined) {
        clearInterval(btsStatsInterval);
        btsStatsInterval = undefined;
    }
};

const startBtsStatsPolling = () => {
    stopBtsStatsPolling();
    void refreshBtsStats();
    btsStatsInterval = setInterval(() => void refreshBtsStats(), 2000);
};

const size = ref<'small' | 'medium' | 'large'>('large');

watch(device, (newValue) => {
    console.log('Selected device updated:', newValue);
    if (newValue.vendorId !== 0 && newValue.productId !== 0) {
        osmoBtsTrx.configure({
            vendorId: newValue.vendorId,
            productId: newValue.productId,
        }).catch(error => {
            osmoError.value = error instanceof Error ? error.message : String(error);
            console.error('Failed to configure WebUSB device:', error);
        });
    }
}, { deep: true });

watch(btsRunning, (running) => {
    if (running) {
        startBtsStatsPolling();
    } else {
        stopBtsStatsPolling();
        osmoBtsStats.value = {};
    }
});

onMounted(() => {
    unsubscribeStreamMeter = streamMeterData.subscribe(handleStreamMeterUpdate);
    osmoBtsTrx.onLogItem = addLineToLogArea;
    window.addEventListener('pagehide', handlePageHide);
    osmoBtsTrx.reinitialize().catch(error => {
        osmoError.value = error instanceof Error ? error.message : String(error);
        console.error('Failed to initialize Osmo BTS TRX:', error);
    });
});

onBeforeUnmount(() => {
    unsubscribeStreamMeter?.();
    stopBtsStatsPolling();
    window.removeEventListener('pagehide', handlePageHide);
    osmoBtsTrx.onLogItem = undefined;
    if (btsRunning.value) {
        releaseCurrentBts();
    }
    osmoBtsTrx.destroy();
});

</script>

<template>
    <div class="osmo-main-header">
        <h1>Osmo WebSDR Demo Application</h1>
        <ThemeToggle size="medium" />
    </div>
    <div class="osmo-main">
        <SdrInput v-model:device="device" :size="size" :disabled="inputsDisabled" />
        <BtsInput :bts="btsConfig" :size="size" :bts-state="btsState"
            :supported-technologies="[RadioTechnology.GSM]" :disabled="inputsDisabled" searchable @update="handleBtsUpdate" />
        <BtsControlPanel :bts-state="btsState" :disabled="btsControlDisabled" :running="btsRunning" :rx-frequency="rxFrequency"
            :tx-frequency="txFrequency" :cloud-connected="cloudConnected" :rx-bytes-received="rxBytesReceived"
            :tx-bytes-sent="txBytesSent" :tx-lag-samples="txLagSamples" :statistics="btsStatistics"
            @toggle-running="handleBtsToggle" />
        <LogArea class="osmo-main__log-area" :subSystems="subSystems" ref="logArea" autoscroll />
    </div>
</template>

<style lang="css" src="@websdr/vue3-components/styles/variables.css" />
<style lang="css" src="@websdr/vue3-components/styles/list.css" />
<style lang="css" src="@websdr/vue3-components/styles/dropdown.css" />
<style lang="css" src="@websdr/vue3-components/styles/log-area.css" />
<style lang="css" src="@websdr/vue3-components/styles/sdr-input.css" />
<style lang="css" src="@osmoweb/vue3-components/styles/bts-input.css" />
<!-- <style lang="css" src="@osmoweb/vue3-components/styles/index.css" /> -->

<style lang="scss" src="@/styles/osmo-main.scss" />
