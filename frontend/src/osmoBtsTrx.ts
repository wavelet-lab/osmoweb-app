import { COMPLEX_INT16_SIZE, OSMO_TRX_PKT_SIZE } from '@osmoweb/core/osmo'
import { getOsmoTrxManagerInstance, OsmoTrxWorkerInitialParams } from '@osmoweb/frontend-core/osmo';
import type { BtsStatsGroup, OsmoTrxWorkerParams, OsmoWSUrls } from '@osmoweb/frontend-core/osmo';
import type { BtsConfig } from '@osmoweb/frontend-core/services';
import type { JournalLogItem } from '@websdr/core/utils';
import { isDebugMode } from '@websdr/frontend-core/common';
import type { StreamMeter } from '@websdr/frontend-core/telemetry';

const osmoBtsTrxDebug = false;

export type { BtsStatsGroup };

export class OsmoBtsTrx {
    static PACKET_SIZE = COMPLEX_INT16_SIZE * OSMO_TRX_PKT_SIZE;
    protected _onWriteLog: (msg: string) => void;
    protected _onLog: (log: JournalLogItem) => void;
    protected _onChangeParameter: (param: string, value: any) => void;
    protected _vendorId?: number;
    protected _productId?: number;
    protected _workerStarted: boolean = false;
    onLogItem?: (log: JournalLogItem) => void;
    bts?: number;
    btsConfig?: BtsConfig;
    urls?: Partial<OsmoWSUrls>;
    streamMeterData?: StreamMeter;

    constructor(params = OsmoBtsTrxInitialParams) {
        this.bts = params.bts;
        this.btsConfig = params.btsConfig;
        this.urls = params.urls ?? OsmoTrxWorkerInitialParams.urls;
        this.streamMeterData = params.streamMeterData;
        if (this.streamMeterData !== undefined) {
            getOsmoTrxManagerInstance({ streamMeterData: this.streamMeterData });
        }
        this._onWriteLog = this.onWriteLog.bind(this);
        this._onLog = this.onLog.bind(this);
        this._onChangeParameter = this.onChangeParameter.bind(this);
    }

    async open_bts(bts: BtsConfig | undefined) {
        this.btsConfig = bts;
        this.bts = bts?.id;
        if (bts !== undefined) {
            getOsmoTrxManagerInstance().open_bts(bts.id, bts.band, bts.arfcn, bts.ipa, bts.osmux_port);
        }
    }

    async configure(params: Partial<OsmoBtsTrxParams>) {
        if (params.vendorId !== undefined) {
            this._vendorId = params.vendorId;
        }
        if (params.productId !== undefined) {
            this._productId = params.productId;
        }
        if (params.btsConfig !== undefined) {
            await this.open_bts(params.btsConfig);
        }
        if (params.urls !== undefined) {
            this.urls = params.urls;
            getOsmoTrxManagerInstance().setParameter('urls', this.urls);
        }
    }

    async start() {
        try {
            const osmoTrxManager = getOsmoTrxManagerInstance();
            console.log('OsmoTrx.start: startWorker', { bts: this.bts, urls: this.urls });
            if (this.urls) {
                await osmoTrxManager.open_ws(this.urls);
                await osmoTrxManager.open_usb(this._vendorId, this._productId);
            }
        } catch (err) {
            console.error('OsmoTrx:', err);
            throw err;
        }
    }

    async stop() {
        const osmoTrxManager = getOsmoTrxManagerInstance();
        osmoTrxManager.close();
    }

    async getBtsStats(group: BtsStatsGroup): Promise<unknown> {
        const stats = await getOsmoTrxManagerInstance().getBtsStats(group);
        if (!stats) return null;
        try {
            return JSON.parse(stats);
        } catch {
            return stats;
        }
    }

    onWriteLog(msg: string) {
        if (isDebugMode() || osmoBtsTrxDebug) console.log(`OsmoTrx.onWriteLog(${msg})`)
    }

    onLog(log: JournalLogItem) {
        if (isDebugMode() || osmoBtsTrxDebug) console.log('OsmoTrx.onLog(', log, ')')
        this.onLogItem?.(log);
    }

    onChangeParameter(param: string, value: any) {
        if (isDebugMode() || osmoBtsTrxDebug) console.log('OsmoTrx.onChangeParameter(', param, ',', value, ')')
    }

    async reinitialize(): Promise<void> {
        const osmoTrxManager = getOsmoTrxManagerInstance();
        osmoTrxManager.onWriteLog = this._onWriteLog;
        osmoTrxManager.onLog = this._onLog;
        osmoTrxManager.onChangeParameter = this._onChangeParameter;
        await osmoTrxManager.startWorker({ bts: this.bts, urls: this.urls });
        if (this.btsConfig !== undefined) this.configure({ btsConfig: this.btsConfig });
    }

    destroy() {
        this.stop();
        const osmoTrxManager = getOsmoTrxManagerInstance();
        osmoTrxManager.stopWorker();
    }
}

interface OsmoBtsTrxParams extends Partial<OsmoTrxWorkerParams> {
    btsConfig?: BtsConfig;
    streamMeterData?: StreamMeter;
};

const OsmoBtsTrxInitialParams: OsmoBtsTrxParams = {
    ...OsmoTrxWorkerInitialParams,
};
