// SPDX-License-Identifier: AGPL-3.0-only

export class Core {
    private script: string 
    private pane: number = 0
    
    public color = {
        param: (source, index = 0) => {
            if (Array.isArray(source)) {
                return source[index];
            }
            return source;
        },
        rgb: (r: number, g: number, b: number, a?: number) => (a ? `rgba(${r}, ${g}, ${b}, ${a})` : `rgb(${r}, ${g}, ${b})`),
        new: (color: string, a?: number) => {
            // Handle hexadecimal colors
            if (color && color.startsWith('#')) {
                // Remove # and convert to RGB
                const hex = color.slice(1);
                const r = parseInt(hex.slice(0, 2), 16);
                const g = parseInt(hex.slice(2, 4), 16);
                const b = parseInt(hex.slice(4, 6), 16);

                return a ? `rgba(${r}, ${g}, ${b}, ${a})` : `rgb(${r}, ${g}, ${b})`;
            }
            // Handle existing RGB format
            return a ? `rgba(${color}, ${a})` : color;
        },
        white: 'white',
        lime: 'lime',
        green: 'green',
        red: 'red',
        maroon: 'maroon',

        black: 'black',

        gray: 'gray',
        blue: 'blue',
    };
    constructor(private context: any) {}
    private extractPlotOptions(options: PlotCharOptions | PlotCandleOptions | PlotBarOptions | FillOptions  | PlotOptions | IndicatorOptions) {
        const _options: any = {};
        for (let key in options) {
            if (Array.isArray(options[key])) {
                _options[key] = options[key][0];
            } else {
                _options[key] = options[key];
            }
        }
        return _options;
    }
    indicator(title?: string, shorttitle?: string, options?: IndicatorOptions) {
        this.script = title?? shorttitle ?? "PineTS Script"
        if (options) { 
            this.pane = options.overlay?0:1
            }}

    //in the current implementation, plot functions are only used to collect data for the plots array and map it to the market data
    plotchar(series: number[], title: string, options: PlotCharOptions) {
        if (!this.context.plots[title]) {
            this.context.plots[title] = { data: [], options: this.extractPlotOptions(options), title };
        }

        this.context.plots[title].data.push({
            time: this.context.marketData[this.context.marketData.length - this.context.idx - 1].openTime,
            value: series[0],
            options: { ...this.extractPlotOptions(options), style: 'char' },
        });
    }

    plot(series: any, title: string, options: PlotOptions) {
        if (this.script) { 
            options.group = this.script
        }
        if (!this.context.plots[title]) {
            this.context.plots[title] = { data: [], options: this.extractPlotOptions(options), title, pane: this.pane };
        }

        this.context.plots[title].data.push({
            time: this.context.marketData[this.context.marketData.length - this.context.idx - 1].openTime,
            value: series[0],
            options: this.extractPlotOptions(options),
        });
    }

    na(series: any) {
        return Array.isArray(series) ? isNaN(series[0]) : isNaN(series);
    }
    nz(series: any, replacement: number = 0) {
        const val = Array.isArray(series) ? series[0] : series;
        const rep = Array.isArray(series) ? replacement[0] : replacement;
        return isNaN(val) ? rep : val;
    }
    plotcandle(open: number[], high: number[], low: number[], close: number[], title: string, options: any) {
        if (this.script) {
          options.group = this.script;
        }
        if (!this.context.candles[title]) {
          this.context.candles[title] = {
            data: [],
            options: this.extractPlotOptions(options),
            title,
            pane: this.pane
          };
        }
        const time = this.context.marketData[this.context.marketData.length - this.context.idx - 1].openTime;
        const o = open[0], h = high[0], l = low[0], c = close[0];
      
        this.context.candles[title].data.push({
          time,
          open: o,
          high: h,
          low: l,
          close: c,
          pane: this.pane,
          options: this.extractPlotOptions(options)
        });
      }
      
      plotbar(open: number[], high: number[], low: number[], close: number[], title: string, options: any) {
        if (this.script) {
          options.group = this.script;
        }
        if (!this.context.bars[title]) {
          this.context.bars[title] = {
            data: [],
            options: this.extractPlotOptions(options),
            title,
            pane: this.pane
          };
        }
        const time = this.context.marketData[this.context.marketData.length - this.context.idx - 1].openTime;
        const o = open[0], h = high[0], l = low[0], c = close[0];
      
        this.context.bars[title].data.push({
          time,
          open: o,
          high: h,
          low: l,
          close: c,
          pane: this.pane,
          options: this.extractPlotOptions(options)
        });
      }
      fill(plot1: string | number , plot2: string | number , options?: FillOptions) { 
        if (!this.context.fills[plot1]) {
            this.context.fills[plot1] = {
                plot1,
                plot2,
                options: this.extractPlotOptions(options),
            };
          }
         
    }
      hline(price: number, title: string, options?: HLineOptions) {
        // Extract the plot options.
        const extractedOptions = this.extractPlotOptions(options);
        const value = Array.isArray(price) ? price[0] : price;
        if (this.context.hlines[title]) {
        this.context.hlines[title].price = value;
        this.context.hlines[title].options = extractedOptions;
        } else {
        this.context.hlines[title] = {
            price: value,
            options: extractedOptions,
            pane: this.pane,
        };
        }
        }
}
