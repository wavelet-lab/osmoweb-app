<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
    name: 'StatisticsModal',
});
</script>

<script setup lang="ts">
import { computed, h } from 'vue';

export type StatisticsValue = string | number | boolean | null | StatisticsValue[] | {
    [key: string]: StatisticsValue;
};

export interface StatisticsModalProps {
    modelValue: boolean;
    title?: string;
    statistics?: StatisticsValue;
}

const props = withDefaults(defineProps<StatisticsModalProps>(), {
    title: 'Statistics',
    statistics: () => ({}),
});

const emit = defineEmits<{
    (event: 'update:modelValue', value: boolean): void;
    (event: 'close'): void;
}>();

const close = () => {
    emit('update:modelValue', false);
    emit('close');
};

const rootEntries = computed(() => normalizeEntries(props.statistics));

const isRecord = (value: StatisticsValue): value is { [key: string]: StatisticsValue } => {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
};

const normalizeEntries = (value: StatisticsValue) => {
    if (Array.isArray(value)) {
        return value.map((item, index) => ({
            key: `[${index}]`,
            value: item,
        }));
    }

    if (isRecord(value)) {
        return Object.entries(value).map(([key, item]) => ({
            key,
            value: item,
        }));
    }

    return [{ key: 'value', value }];
};

const formatLabel = (key: string) => {
    return key
        .replace(/[_-]+/g, ' ')
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .replace(/\b\w/g, char => char.toUpperCase());
};

const formatValue = (value: StatisticsValue) => {
    if (value === null) return 'null';
    if (typeof value === 'boolean') return value ? 'true' : 'false';
    return String(value);
};

const JsonStatisticsNode = defineComponent({
    name: 'JsonStatisticsNode',
    props: {
        itemKey: {
            type: String,
            required: true,
        },
        value: {
            type: [String, Number, Boolean, Object, Array, null],
            default: null,
        },
        depth: {
            type: Number,
            default: 0,
        },
    },
    setup(nodeProps) {
        const renderNode = (key: string, value: StatisticsValue, depth: number): any => {
            if (Array.isArray(value) || isRecord(value)) {
                const entries = normalizeEntries(value);

                return h('details', {
                    class: 'statistics-modal__group',
                    open: depth < 2,
                }, [
                    h('summary', { class: 'statistics-modal__group-summary' }, [
                        h('span', { class: 'statistics-modal__group-title' }, formatLabel(key)),
                        h('span', { class: 'statistics-modal__group-count' }, `${entries.length} items`),
                    ]),
                    h('div', { class: 'statistics-modal__group-content' }, entries.map(entry =>
                        renderNode(entry.key, entry.value, depth + 1)
                    )),
                ]);
            }

            return h('div', { class: 'statistics-modal__row' }, [
                h('dt', { class: 'statistics-modal__row-key' }, formatLabel(key)),
                h('dd', { class: 'statistics-modal__row-value' }, formatValue(value)),
            ]);
        };

        return () => renderNode(nodeProps.itemKey, nodeProps.value as StatisticsValue, nodeProps.depth);
    },
});
</script>

<template>
    <Teleport to="body">
        <div v-if="props.modelValue" class="statistics-modal" role="dialog" aria-modal="true"
            :aria-label="props.title" @click.self="close">
            <section class="statistics-modal__dialog">
                <header class="statistics-modal__header">
                    <h2 class="statistics-modal__title">{{ props.title }}</h2>
                    <button class="statistics-modal__close" type="button" aria-label="Close statistics" @click="close">
                        x
                    </button>
                </header>

                <div class="statistics-modal__body">
                    <div v-if="rootEntries.length === 0" class="statistics-modal__empty">
                        No statistics
                    </div>
                    <dl v-else class="statistics-modal__tree">
                        <JsonStatisticsNode v-for="entry in rootEntries" :key="entry.key" :item-key="entry.key"
                            :value="entry.value" />
                    </dl>
                </div>
            </section>
        </div>
    </Teleport>
</template>

<style lang="scss" src="@/styles/statistics-modal.scss" />
