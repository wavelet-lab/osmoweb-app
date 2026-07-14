<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
    name: 'StatisticsModal',
});
</script>

<script setup lang="ts">
import { computed, h, nextTick, onBeforeUnmount, ref, watch } from 'vue';

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

const modalRef = ref<HTMLElement | null>(null);
const closeButtonRef = ref<HTMLButtonElement | null>(null);
let previouslyFocusedElement: HTMLElement | null = null;

const close = () => {
    emit('update:modelValue', false);
    emit('close');
};

const focusableSelector = [
    'a[href]',
    'button:not([disabled])',
    'textarea:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'details summary',
    '[tabindex]:not([tabindex="-1"])',
].join(',');

const getFocusableElements = () => {
    if (!modalRef.value) return [];
    return Array.from(modalRef.value.querySelectorAll<HTMLElement>(focusableSelector))
        .filter(element => !element.hasAttribute('disabled') && element.offsetParent !== null);
};

const focusInitialElement = async () => {
    await nextTick();
    closeButtonRef.value?.focus();
};

const handleKeydown = (event: KeyboardEvent) => {
    event.stopPropagation();

    if (event.key === 'Escape') {
        event.preventDefault();
        close();
        return;
    }

    if (event.key !== 'Tab') return;

    const focusableElements = getFocusableElements();
    if (focusableElements.length === 0) {
        event.preventDefault();
        modalRef.value?.focus();
        return;
    }

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    const activeElement = document.activeElement;

    if (event.shiftKey && activeElement === firstElement) {
        event.preventDefault();
        lastElement?.focus();
    } else if (!event.shiftKey && activeElement === lastElement) {
        event.preventDefault();
        firstElement?.focus();
    }
};

watch(() => props.modelValue, async (isOpen) => {
    if (isOpen) {
        previouslyFocusedElement = document.activeElement instanceof HTMLElement
            ? document.activeElement
            : null;
        await focusInitialElement();
    } else {
        previouslyFocusedElement?.focus();
        previouslyFocusedElement = null;
    }
});

onBeforeUnmount(() => {
    previouslyFocusedElement?.focus();
});

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
        <div v-if="props.modelValue" ref="modalRef" class="statistics-modal" role="dialog" aria-modal="true"
            aria-labelledby="statistics-modal-title" tabindex="-1" @click.self="close" @keydown="handleKeydown">
            <section class="statistics-modal__dialog" role="document">
                <header class="statistics-modal__header">
                    <h2 id="statistics-modal-title" class="statistics-modal__title">{{ props.title }}</h2>
                    <button ref="closeButtonRef" class="statistics-modal__close" type="button"
                        aria-label="Close statistics" @click="close">
                        <span aria-hidden="true">×</span>
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
