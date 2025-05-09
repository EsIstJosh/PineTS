// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2025 Ala-eddine KADDOURI
import { transpile } from '@pinets/transpiler/index';
import { Context } from '@pinets/index';

import { IProvider } from '@pinets/marketData/IProvider';

/**
 * This class is a wrapper for the Pine Script language, it allows to run Pine Script code in a JavaScript environment
 */
export class PineTS {
    public data: any = [];
    //#region [Pine Script built-in variables]
    public open: any = [];
    public high: any = [];
    public low: any = [];
    public close: any = [];
    public volume: any = [];
    public hl2: any = [];
    public hlc3: any = [];
    public ohlc4: any = [];
    public openTime: any = [];
    public closeTime: any = [];
    //#endregion

    //#region run context
    private _periods: number = undefined;
    public get periods() {
        return this._periods;
    }
    //#endregion


    public pineTSCode:  Function | String
    public fn: Function;
    private _readyPromise: Promise<any> = null;

    private _ready = false;

    constructor(
        private source: IProvider | any[],
        private tickerId?: string,
        private timeframe?: string,
        private limit?: number,
        private sDate?: number,
        private eDate?: number,
        public title?: string

    ) {
        this._readyPromise = new Promise((resolve) => {
            this.loadMarketData(source, tickerId, timeframe, limit, sDate, eDate, title).then((data) => {
                const marketData = data.reverse();

                this._periods = marketData.length;
                this.data = marketData;

                const _open = marketData.map((d) => d.open);
                const _close = marketData.map((d) => d.close);
                const _high = marketData.map((d) => d.high);
                const _low = marketData.map((d) => d.low);
                const _volume = marketData.map((d) => d.volume);
                const _hlc3 = marketData.map((d) => (d.high + d.low + d.close) / 3);
                const _hl2 = marketData.map((d) => (d.high + d.low) / 2);
                const _ohlc4 = marketData.map((d) => (d.high + d.low + d.open + d.close) / 4);
                const _openTime = marketData.map((d) => d.openTime);
                const _closeTime = marketData.map((d) => d.closeTime);

                this.open = _open;
                this.close = _close;
                this.high = _high;
                this.low = _low;
                this.volume = _volume;
                this.hl2 = _hl2;
                this.hlc3 = _hlc3;
                this.ohlc4 = _ohlc4;
                this.openTime = _openTime;
                this.closeTime = _closeTime;

                this._ready = true;
                resolve(true);
            });
        });
    }

    private async loadMarketData(source: IProvider | any[], tickerId: string, timeframe: string, limit?: number, sDate?: number, eDate?: number, title?: string) {
        if (Array.isArray(source)) {
            return source;
        } else {
            return (source as IProvider).getMarketData(tickerId, timeframe, limit, sDate, eDate, title);
        }
    }

    public async ready() {
        if (this._ready) return true;
        if (!this._readyPromise) throw new Error('PineTS is not ready');
        return this._readyPromise;
    }

    public updateData(newData: any): void {
        if (!newData) {
            throw new Error("Invalid data: newData must be a valid object.");
        }
        
        // Prepend the new record to the main data array.
        this.data = [newData, ...this.data];
        this._periods = this.data.length;
        
        // Update built-in arrays by prepending the corresponding values.
        this.open = [newData.open, ...this.open];
        this.close = [newData.close, ...this.close];
        this.high = [newData.high, ...this.high];
        this.low = [newData.low, ...this.low];
        this.volume = [newData.volume, ...this.volume];
        this.hl2 = [(newData.high + newData.low) / 2, ...this.hl2];
        this.hlc3 = [(newData.high + newData.low + newData.close) / 3, ...this.hlc3];
        this.ohlc4 = [(newData.high + newData.low + newData.open + newData.close) / 4, ...this.ohlc4];
        this.openTime = [newData.openTime, ...this.openTime];
        this.closeTime = [newData.closeTime, ...this.closeTime];
    }


    public async run(pineTSCode?: Function | String, n?: number, useTACache?: boolean): Promise<Context> {
        await this.ready();
        if (!n) n = this._periods;
        if (!this.pineTSCode && !pineTSCode) {
            throw new Error("Invalid PineTS Code: No pineTSCode supplied/stored.");
          }
          
          // Use the new pineTSCode if provided, otherwise fall back to the cached version.
          pineTSCode = pineTSCode || this.pineTSCode;
          
        const context = new Context({
            marketData: this.data,
            source: this.source,
            tickerId: this.tickerId,
            timeframe: this.timeframe,
            limit: this.limit,
            sDate: this.sDate,
            eDate: this.eDate,
            title: this.title,
        }); 

        context.pineTSCode = pineTSCode;
        context.useTACache = useTACache;

        // Check if the passed pineTSCode is the same as the cached one.
        if (!this.fn || pineTSCode && this.pineTSCode !== pineTSCode) {
            const transformer = transpile.bind(this);
            this.fn = transformer(pineTSCode);
            this.pineTSCode = pineTSCode;
        }
        const transpiledFn = this.fn;


        const contextVarNames = ['const', 'var', 'let', 'params'];
        for (let i = this._periods - n, idx = n - 1; i < this._periods; i++, idx--) {
            context.idx = i;

            context.data.close = this.close.slice(idx);
            context.data.open = this.open.slice(idx);
            context.data.high = this.high.slice(idx);
            context.data.low = this.low.slice(idx);
            context.data.volume = this.volume.slice(idx);
            context.data.hl2 = this.hl2.slice(idx);
            context.data.hlc3 = this.hlc3.slice(idx);
            context.data.ohlc4 = this.ohlc4.slice(idx);
            context.data.openTime = this.openTime.slice(idx);
            context.data.closeTime = this.closeTime.slice(idx);

            const result = await transpiledFn(context);

            //collect results
            if (typeof result === 'object') {
                if (typeof context.result !== 'object') {
                    context.result = {};
                }
                for (let key in result) {
                    if (context.result[key] === undefined) {
                        context.result[key] = [];
                    }

                    const val = Array.isArray(result[key]) ? result[key][0] : result[key];
                    context.result[key].push(val);
                }
            } else {
                if (!Array.isArray(context.result)) {
                    context.result = [];
                }

                context.result.push(result);
            }

            //shift context
            for (let ctxVarName of contextVarNames) {
                for (let key in context[ctxVarName]) {
                    if (Array.isArray(context[ctxVarName][key])) {
                        const val = context[ctxVarName][key][0];

                        context[ctxVarName][key].unshift(val);
                    } else {
                        //console.error('>>> invalid entry format, should be an array: ', ctxVarName, key);
                    }
                }
            }
        }
        return context;
    }
}

export default PineTS;
