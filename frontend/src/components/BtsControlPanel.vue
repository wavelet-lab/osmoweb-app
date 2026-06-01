<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
    name: 'BtsControlPanel',
});
</script>

<script setup lang="ts">
import { computed, ref } from 'vue';
import type { BtsState } from '@osmoweb/vue3-components';
import StatisticsModal from '@/components/StatisticsModal.vue';
import type { StatisticsValue } from '@/components/StatisticsModal.vue';

export interface BtsControlPanelProps {
    btsState: BtsState;
    disabled?: boolean;
    running?: boolean;
    rxFrequency?: number;
    txFrequency?: number;
    cloudConnected?: boolean;
    rxBytesReceived?: number;
    txBytesSent?: number;
    txLagSamples?: number;
    statistics?: StatisticsValue;
}

const props = withDefaults(defineProps<BtsControlPanelProps>(), {
    disabled: false,
    running: false,
    cloudConnected: false,
    rxBytesReceived: 0,
    txBytesSent: 0,
    txLagSamples: 0,
    statistics: () => ({}),
});

const emit = defineEmits<{
    (event: 'toggle-running'): void;
}>();

const isDisabled = computed(() => props.disabled);
const statisticsVisible = ref(false);
const buttonLabel = computed(() => props.running ? 'Stop' : 'Start');
const statusLabel = computed(() => {
    if (props.btsState === 'not-configured') return 'Not configured';
    if (props.running) return 'Running';
    return 'Stopped';
});

const byteFormatter = new Intl.NumberFormat();

const formatFrequency = (frequency?: number) => {
    if (frequency === undefined) return 'Not configured';
    return `${(frequency / 1000).toFixed(3)} MHz`;
};

const handleToggle = () => {
    if (isDisabled.value) return;
    emit('toggle-running');
};
</script>

<template>
    <section class="bts-control-panel" aria-label="BTS control panel">
        <div class="bts-control-panel__header">
            <div class="bts-control-panel__title">BTS Control</div>
            <div class="bts-control-panel__status" :data-state="props.btsState">
                {{ statusLabel }}
            </div>
        </div>

        <button class="bts-control-panel__button" :class="{ 'bts-control-panel__button--stop': props.running }"
            type="button" :disabled="isDisabled" :aria-pressed="props.running" @click="handleToggle">
            {{ buttonLabel }}
        </button>

        <dl class="bts-control-panel__metrics">
            <div class="bts-control-panel__metric">
                <dt>RX frequency</dt>
                <dd>{{ formatFrequency(props.rxFrequency) }}</dd>
            </div>
            <div class="bts-control-panel__metric">
                <dt>TX frequency</dt>
                <dd>{{ formatFrequency(props.txFrequency) }}</dd>
            </div>
            <div class="bts-control-panel__metric">
                <dt>Cloud connected</dt>
                <dd>{{ props.cloudConnected ? 'Yes' : 'No' }}</dd>
            </div>
            <div class="bts-control-panel__metric">
                <dt>RX bytes received</dt>
                <dd>{{ byteFormatter.format(props.rxBytesReceived) }}</dd>
            </div>
            <div class="bts-control-panel__metric">
                <dt>TX bytes sent</dt>
                <dd>{{ byteFormatter.format(props.txBytesSent) }}</dd>
            </div>
            <div class="bts-control-panel__metric">
                <dt>TX lag behind RX</dt>
                <dd>{{ byteFormatter.format(props.txLagSamples) }} samples</dd>
            </div>
            <div class="bts-control-panel__metric bts-control-panel__metric--action">
                <button class="bts-control-panel__statistics-button" type="button" @click="statisticsVisible = true">
                    Statistics
                </button>
            </div>
        </dl>

        <StatisticsModal v-model="statisticsVisible" title="BTS Statistics" :statistics="props.statistics" />
    </section>
</template>

<style lang="scss" src="@/styles/bts-control-panel.scss" />
