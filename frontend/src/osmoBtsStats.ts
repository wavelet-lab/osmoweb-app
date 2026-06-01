import type { StatisticsValue } from '@/components/StatisticsModal.vue';
import type { BtsStatsGroup } from '@/osmoBtsTrx';

const toStatisticsValue = (value: unknown): StatisticsValue => {
    if (value === null || ['string', 'number', 'boolean'].includes(typeof value)) {
        return value as StatisticsValue;
    }
    if (Array.isArray(value)) {
        return normalizeStatsArray(value);
    }
    if (typeof value === 'object') {
        return Object.fromEntries(
            Object.entries(value as Record<string, unknown>).map(([key, item]) => [key, normalizeStatsField(key, item)]),
        );
    }
    return String(value);
};

const normalizeStatsField = (key: string, value: unknown): StatisticsValue => {
    if (key === 'transceivers' && Array.isArray(value)) {
        return keyedStatsArray(value, trxStatsKey);
    }
    if (key === 'timeslots' && Array.isArray(value)) {
        return keyedStatsArray(value, timeslotStatsKey);
    }
    if (key === 'channels' && Array.isArray(value)) {
        return keyedStatsArray(value, channelStatsKey);
    }
    if (key === 'ungrouped_counters' && Array.isArray(value)) {
        return normalizeNamedCounters(value);
    }
    if (key === 'rate_ctr_groups' && Array.isArray(value)) {
        return normalizeRateCounterGroups(value);
    }
    if (key === 'stat_item_groups' && Array.isArray(value)) {
        return normalizeRateCounterGroups(value);
    }
    return toStatisticsValue(value);
};

const normalizeStatsArray = (value: unknown[]): StatisticsValue => {
    if (value.every(isStatsCounter)) {
        return normalizeFlatCounterArray(value);
    }
    if (value.every(isNamedCounter)) {
        return normalizeNamedCounters(value);
    }
    return value.map(toStatisticsValue);
};

const isStatsCounter = (value: unknown): value is { group: string; name: string; current: unknown } => {
    if (!value || typeof value !== 'object') return false;
    const counter = value as Record<string, unknown>;
    return typeof counter.group === 'string'
        && typeof counter.name === 'string'
        && 'current' in counter;
};

const isNamedCounter = (value: unknown): value is { name: string; current: unknown } => {
    if (!value || typeof value !== 'object') return false;
    const counter = value as Record<string, unknown>;
    return typeof counter.name === 'string' && 'current' in counter;
};

const normalizeFlatCounterArray = (counters: Array<{ group: string; name: string; current: unknown }>): StatisticsValue => {
    const result: Record<string, StatisticsValue> = {};

    counters.forEach(counter => {
        result[counter.group] ??= {};
        (result[counter.group] as Record<string, StatisticsValue>)[counter.name] = toStatisticsValue(counter.current);
    });

    return result;
};

const normalizeNamedCounters = (counters: Array<{ name: string; current: unknown }>): StatisticsValue => {
    return Object.fromEntries(counters.map(counter => [counter.name, toStatisticsValue(counter.current)]));
};

const normalizeRateCounterGroups = (groups: unknown[]): StatisticsValue => {
    const result: Record<string, StatisticsValue> = {};
    const seen = new Map<string, number>();

    groups.forEach((group, index) => {
        if (!group || typeof group !== 'object') {
            result[`Group ${index}`] = toStatisticsValue(group);
            return;
        }

        const item = group as Record<string, unknown>;
        const baseName = String(item.group_description ?? item.name ?? `Group ${index}`);
        const count = (seen.get(baseName) ?? 0) + 1;
        seen.set(baseName, count);
        const name = count === 1 ? baseName : `${baseName} ${count}`;
        const counters = item.counters;

        if (Array.isArray(counters) && counters.every(isNamedCounter)) {
            result[name] = normalizeNamedCounters(counters);
        } else {
            result[name] = toStatisticsValue(item);
        }
    });

    return result;
};

const keyedStatsArray = (items: unknown[], keyFactory: (item: Record<string, unknown>, index: number) => string): StatisticsValue => {
    return Object.fromEntries(items.map((item, index) => {
        if (!item || typeof item !== 'object') return [`Item ${index}`, toStatisticsValue(item)];
        const record = item as Record<string, unknown>;
        return [keyFactory(record, index), toStatisticsValue(record)];
    }));
};

const trxStatsKey = (item: Record<string, unknown>, index: number) => {
    return typeof item.nr === 'number' ? `TRX ${item.nr}` : `TRX ${index}`;
};

const timeslotStatsKey = (item: Record<string, unknown>, index: number) => {
    const tn = typeof item.tn === 'number' ? item.tn : index;
    return typeof item.mf === 'string' ? `TN ${tn} ${item.mf}` : `TN ${tn}`;
};

const channelStatsKey = (item: Record<string, unknown>, index: number) => {
    return typeof item.idx === 'number' ? `Channel ${item.idx}` : `Channel ${index}`;
};

export const normalizeBtsStats = (group: BtsStatsGroup, value: unknown): StatisticsValue => {
    if (Array.isArray(value) && value.every(isStatsCounter)) {
        return normalizeFlatCounterArray(value);
    }

    if (value && typeof value === 'object' && !Array.isArray(value)) {
        const entries = Object.entries(value as Record<string, unknown>);
        if (entries.length === 1) {
            const [, nestedValue] = entries[0]!;
            if (Array.isArray(nestedValue) && nestedValue.every(isStatsCounter)) {
                return normalizeFlatCounterArray(nestedValue);
            }
            if (group === 'rate-counters') {
                return normalizeBtsStats(group, nestedValue);
            }
        }
    }

    return toStatisticsValue(value);
};
