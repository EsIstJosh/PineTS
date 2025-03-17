// SPDX-License-Identifier: AGPL-3.0-only
export class TechnicalAnalysis {
  // Keeps track of the highest period/length encountered.
  public max_period: number | null = null;

  constructor(private context: any) {}

  /**
   * Updates max_period if the provided value is larger.
   * @param value - A period or length value.
   */
  private updateMaxPeriod(value: number): void {
    if (this.context.max_period === null || value > this.context.max_period) {
      this.context.max_period = value;
    }
  }

  /**
   * If the given value is an array, returns the maximum number within it;
   * otherwise, returns the number itself.
   * @param value - A number or an array of numbers.
   */
  private extractMaxValue(value: number | number[]): number {
    return Array.isArray(value) ? Math.max(...value) : value;
  }

  public get tr() {
    const val = this.context.math.max(
      this.context.data.high[0] - this.context.data.low[0],
      this.context.math.abs(this.context.data.high[0] - this.context.data.close[1]),
      this.context.math.abs(this.context.data.low[0] - this.context.data.close[1])
    );
    return val;
  }

  param(source: any, index: any, name?: string) {
    if (!this.context.params[name]) this.context.params[name] = [];
    if (Array.isArray(source)) {
      if (index) {
        this.context.params[name] = source.slice(index);
        this.context.params[name].length = source.length; //ensure length is correct
        return this.context.params[name];
      }
      this.context.params[name] = source.slice(0);
      return this.context.params[name];
    } else {
      this.context.params[name][0] = source;
      return this.context.params[name];
    }
  }

  ema(source: any, _period: number | number[]) {
    const period = Array.isArray(_period) ? _period[0] : _period;
    this.updateMaxPeriod(this.extractMaxValue(_period));
    const result = ema(source.slice(0).reverse(), period);
    const idx = this.context.idx;
    return this.context.precision(result[idx]);
  }

  sma(source: any, _period: number | number[], _cacheId?: any) {
    const period = Array.isArray(_period) ? _period[0] : _period;
    this.updateMaxPeriod(this.extractMaxValue(_period));
    const reversedSource = source.slice(0).reverse();
    if (this.context.useTACache && _cacheId) {
      if (!this.context.cache[_cacheId]) {
        this.context.cache[_cacheId] = {};
      }
      const cacheObj = this.context.cache[_cacheId];
      if (cacheObj) {
        const result = sma_cache(reversedSource, period, cacheObj);
        const idx = this.context.idx;
        return this.context.precision(result[idx]);
      }
    }
    const result = sma(reversedSource, period);
    const idx = this.context.idx;
    return this.context.precision(result[idx]);
  }

  vwma(source: any, _period: number | number[]) {
    const period = Array.isArray(_period) ? _period[0] : _period;
    this.updateMaxPeriod(this.extractMaxValue(_period));
    const volume = this.context.data.volume;
    const result = vwma(source.slice(0).reverse(), volume.slice(0).reverse(), period);
    const idx = this.context.idx;
    return this.context.precision(result[idx]);
  }

  wma(source: any, _period: number | number[]) {
    const period = Array.isArray(_period) ? _period[0] : _period;
    this.updateMaxPeriod(this.extractMaxValue(_period));
    const result = wma(source.slice(0).reverse(), period);
    const idx = this.context.idx;
    return this.context.precision(result[idx]);
  }

  hma(source: any, _period: number | number[]) {
    const period = Array.isArray(_period) ? _period[0] : _period;
    this.updateMaxPeriod(this.extractMaxValue(_period));
    const result = hma(source.slice(0).reverse(), period);
    const idx = this.context.idx;
    return this.context.precision(result[idx]);
  }

  rma(source: any, _period: number | number[]) {
    const period = Array.isArray(_period) ? _period[0] : _period;
    this.updateMaxPeriod(this.extractMaxValue(_period));
    const result = rma(source.slice(0).reverse(), period);
    const idx = this.context.idx;
    return this.context.precision(result[idx]);
  }

  change(source: any, _length: number | number[] = 1) {
    const length = Array.isArray(_length) ? _length[0] : _length;
    this.updateMaxPeriod(this.extractMaxValue(_length));
    const result = change(source.slice(0).reverse(), length);
    const idx = this.context.idx;
    return this.context.precision(result[idx]);
  }

  rsi(source: any, _period: number | number[]) {
    const period = Array.isArray(_period) ? _period[0] : _period;
    this.updateMaxPeriod(this.extractMaxValue(_period));
    const result = rsi(source.slice(0).reverse(), period);
    const idx = this.context.idx;
    return this.context.precision(result[idx]);
  }

  atr(_period: number | number[]) {
    const period = Array.isArray(_period) ? _period[0] : _period;
    this.updateMaxPeriod(this.extractMaxValue(_period));
    const high = this.context.data.high.slice().reverse();
    const low = this.context.data.low.slice().reverse();
    const close = this.context.data.close.slice().reverse();
    const result = atr(high, low, close, period);
    const idx = this.context.idx;
    return this.context.precision(result[idx]);
  }

  mom(source: any, _length: number | number[]) {
    const length = Array.isArray(_length) ? _length[0] : _length;
    this.updateMaxPeriod(this.extractMaxValue(_length));
    const result = mom(source.slice(0).reverse(), length);
    const idx = this.context.idx;
    return this.context.precision(result[idx]);
  }

  roc(source: any, _length: number | number[]) {
    const length = Array.isArray(_length) ? _length[0] : _length;
    this.updateMaxPeriod(this.extractMaxValue(_length));
    const result = roc(source.slice(0).reverse(), length);
    const idx = this.context.idx;
    return this.context.precision(result[idx]);
  }

  dev(source: any, _length: number | number[]) {
    const length = Array.isArray(_length) ? _length[0] : _length;
    this.updateMaxPeriod(this.extractMaxValue(_length));
    const result = dev(source.slice(0).reverse(), length);
    const idx = this.context.idx;
    return this.context.precision(result[idx]);
  }

  variance(source: any, _length: number | number[]) {
    const length = Array.isArray(_length) ? _length[0] : _length;
    this.updateMaxPeriod(this.extractMaxValue(_length));
    const result = variance(source.slice(0).reverse(), length);
    const idx = this.context.idx;
    return this.context.precision(result[idx]);
  }

  highest(source: any, _length: number | number[]) {
    const length = Array.isArray(_length) ? _length[0] : _length;
    this.updateMaxPeriod(this.extractMaxValue(_length));
    const result = highest(source.slice(0).reverse(), length);
    const idx = this.context.idx;
    return this.context.precision(result[idx]);
  }

  lowest(source: any, _length: number | number[]) {
    const length = Array.isArray(_length) ? _length[0] : _length;
    this.updateMaxPeriod(this.extractMaxValue(_length));
    const result = lowest(source.slice(0).reverse(), length);
    const idx = this.context.idx;
    return this.context.precision(result[idx]);
  }

  median(source: any, _length: number | number[]) {
    const length = Array.isArray(_length) ? _length[0] : _length;
    this.updateMaxPeriod(this.extractMaxValue(_length));
    const result = median(source.slice(0).reverse(), length);
    const idx = this.context.idx;
    return this.context.precision(result[idx]);
  }

  stdev(source: any, _length: number | number[], _bias: boolean | boolean[] = true) {
    const length = Array.isArray(_length) ? _length[0] : _length;
    this.updateMaxPeriod(this.extractMaxValue(_length));
    const bias = Array.isArray(_bias) ? _bias[0] : _bias;
    const result = stdev(source.slice(0).reverse(), length, bias);
    const idx = this.context.idx;
    return this.context.precision(result[idx]);
  }

  linreg(source: any, _length: number | number[], _offset: number | number[]) {
    const length = Array.isArray(_length) ? _length[0] : _length;
    this.updateMaxPeriod(this.extractMaxValue(_length));
    const offset = Array.isArray(_offset) ? _offset[0] : _offset;
    const result = linreg(source.slice(0).reverse(), length, offset);
    const idx = this.context.idx;
    return this.context.precision(result[idx]);
  }

  supertrend(_factor, _atrPeriod) {
    const factor = Array.isArray(_factor) ? _factor[0] : _factor;
    const atrPeriod = Array.isArray(_atrPeriod) ? _atrPeriod[0] : _atrPeriod;
    this.updateMaxPeriod(this.extractMaxValue(atrPeriod));

    const high = this.context.data.high.slice().reverse();
    const low = this.context.data.low.slice().reverse();
    const close = this.context.data.close.slice().reverse();
    const [supertrend, direction] = calculateSupertrend(high, low, close, factor, atrPeriod);

    const idx = this.context.idx;
    return [[this.context.precision(supertrend[idx]), direction[idx]]];
}

  vwap(source: number[], anchor?: boolean[], stdev_mult?: number): number | [number, number, number] {
    const result = vwapFunction(source, this.context.data.volume, anchor, stdev_mult);
    const idx = this.context.idx;
    if (stdev_mult !== undefined && Array.isArray(result)) {
      const [v, up, low] = result as [number[], number[], number[]];
      return [
        this.context.precision(v[idx]),
        this.context.precision(up[idx]),
        this.context.precision(low[idx])
      ];
    } else {
      return this.context.precision((result as number[])[idx]);
    }
  }

    swma(source: number[]): number {
        const arr = swmaFunction(source);
        const idx = this.context.idx;
        return this.context.precision(arr[idx]);
    }
    }
    




//Here we did not use indicatorts implementation because it uses a different smoothing method which gives slightly different results that pine script
function atr(high: number[], low: number[], close: number[], period: number): number[] {
    // Calculate True Range first
    const tr = new Array(high.length);
    tr[0] = high[0] - low[0]; // First TR is just the first day's high-low range

    // Calculate subsequent TR values
    for (let i = 1; i < high.length; i++) {
        const hl = high[i] - low[i];
        const hc = Math.abs(high[i] - close[i - 1]);
        const lc = Math.abs(low[i] - close[i - 1]);
        tr[i] = Math.max(hl, hc, lc);
    }

    // Calculate ATR using RMA (Rolling Moving Average)
    const atr = new Array(high.length).fill(NaN);
    let sum = 0;

    // First ATR is SMA of first 'period' TR values
    for (let i = 0; i < period; i++) {
        sum += tr[i];
    }
    atr[period - 1] = sum / period;

    // Calculate subsequent ATR values using the RMA formula:
    // RMA = (previous RMA * (period-1) + current TR) / period
    for (let i = period; i < tr.length; i++) {
        atr[i] = (atr[i - 1] * (period - 1) + tr[i]) / period;
    }

    return atr;
}

function ema(source: number[], period: number): number[] {
    const result = new Array(source.length).fill(NaN);
    const alpha = 2 / (period + 1);

    // Initialize EMA with SMA for first value
    let sum = 0;
    for (let i = 0; i < period; i++) {
        sum += source[i] || 0; //handle NaN values
    }
    result[period - 1] = sum / period;

    // Calculate EMA for remaining values
    for (let i = period; i < source.length; i++) {
        result[i] = source[i] * alpha + result[i - 1] * (1 - alpha);
    }

    return result;
}

function rsi(source: number[], period: number): number[] {
    const result = new Array(source.length).fill(NaN);
    const gains = new Array(source.length).fill(0);
    const losses = new Array(source.length).fill(0);

    // Calculate initial gains and losses
    for (let i = 1; i < source.length; i++) {
        const diff = source[i] - source[i - 1];
        gains[i] = diff > 0 ? diff : 0;
        losses[i] = diff < 0 ? -diff : 0;
    }

    // Calculate first RSI using simple averages
    let avgGain = 0;
    let avgLoss = 0;
    for (let i = 1; i <= period; i++) {
        avgGain += gains[i];
        avgLoss += losses[i];
    }
    avgGain /= period;
    avgLoss /= period;

    // Calculate first RSI
    result[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);

    // Calculate subsequent RSIs using the smoothed averages
    for (let i = period + 1; i < source.length; i++) {
        avgGain = (avgGain * (period - 1) + gains[i]) / period;
        avgLoss = (avgLoss * (period - 1) + losses[i]) / period;
        result[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
    }

    return result;
}

function rma(source: number[], period: number): number[] {
    const result = new Array(source.length).fill(NaN);
    const alpha = 1 / period;

    // Initialize RMA with SMA for first value
    let sum = 0;
    for (let i = 0; i < period; i++) {
        sum += source[i] || 0; // Handle NaN values
    }
    result[period - 1] = sum / period;

    // Calculate RMA for remaining values
    for (let i = period; i < source.length; i++) {
        const currentValue = source[i] || 0; // Handle NaN values
        result[i] = currentValue * alpha + result[i - 1] * (1 - alpha);
    }

    return result;
}

function sma_cache(
    source: number[],
    period: number,
    cacheObj: {
        previousSum?: number;
        lastProcessedIndex?: number;
        previousResult?: number[];
    }
) {
    const result = cacheObj.previousResult || new Array(source.length).fill(NaN);
    const lastProcessedIndex = cacheObj.lastProcessedIndex || -1;
    let previousSum = cacheObj.previousSum || 0;

    if (lastProcessedIndex === -1 || source.length !== lastProcessedIndex + 1) {
        // Initialize cache or handle reset/different length source
        previousSum = 0;
        for (let i = 0; i < period; i++) {
            previousSum += source[i] || 0;
        }
        result[period - 1] = previousSum / period;

        // Fill initial values with NaN for cache initialization as well
        for (let i = 0; i < period - 1; i++) {
            result[i] = NaN;
        }

        for (let i = period; i < source.length; i++) {
            previousSum = previousSum - (source[i - period] || 0) + (source[i] || 0);
            result[i] = previousSum / period;
        }
    } else if (source.length === lastProcessedIndex + 2) {
        // Optimized calculation for new element
        const newIndex = source.length - 1;
        previousSum = previousSum - (source[newIndex - period] || 0) + (source[newIndex] || 0);
        result[newIndex] = previousSum / period;
    } else {
        // Fallback to full calculation if cache is inconsistent or source length changed unexpectedly
        return sma(source, period);
    }

    cacheObj.previousSum = previousSum;
    cacheObj.lastProcessedIndex = source.length - 1;
    cacheObj.previousResult = result;

    return result;
}

function sma(source: number[], period: number): number[] {
    const result = new Array(source.length).fill(NaN);

    // First (period-1) elements will remain NaN
    for (let i = period - 1; i < source.length; i++) {
        let sum = 0;
        for (let j = 0; j < period; j++) {
            sum += source[i - j] || 0;
        }
        result[i] = sum / period;
    }

    return result;
}

function vwma(source: number[], volume: number[], period: number): number[] {
    const result = new Array(source.length).fill(NaN);

    for (let i = period - 1; i < source.length; i++) {
        let sumVol = 0;
        let sumVolPrice = 0;

        for (let j = 0; j < period; j++) {
            sumVol += volume[i - j];
            sumVolPrice += source[i - j] * volume[i - j];
        }

        result[i] = sumVolPrice / sumVol;
    }

    return result;
}

function hma(source, period) {
    const halfPeriod = Math.floor(period / 2);
    const wma1 = wma(source, halfPeriod);
    const wma2 = wma(source, period);
    const rawHma = wma1.map((value, index) => 2 * value - wma2[index]);
    const sqrtPeriod = Math.floor(Math.sqrt(period));
    const result = wma(rawHma, sqrtPeriod);
    return result;
}

function wma(source, period) {
    const result = new Array(source.length);

    for (let i = period - 1; i < source.length; i++) {
        let numerator = 0;
        let denominator = 0;

        for (let j = 0; j < period; j++) {
            numerator += source[i - j] * (period - j);
            denominator += period - j;
        }

        result[i] = numerator / denominator;
    }

    // Fill initial values with NaN or null
    for (let i = 0; i < period - 1; i++) {
        result[i] = NaN;
    }

    return result;
}

function change(source: number[], length: number = 1): number[] {
    const result = new Array(source.length).fill(NaN);

    for (let i = length; i < source.length; i++) {
        result[i] = source[i] - source[i - length];
    }

    return result;
}

// DEMA = 2 * EMA(source, length) - EMA(EMA(source, length), length)
function dema(source: number[], length: number): number[] {
    const ema1 = ema(source, length);
    const ema2 = ema(ema1, length);
    return source.map((_, i) => 2 * ema1[i] - ema2[i]);
}

// TEMA = 3 * EMA1 - 3 * EMA2 + EMA3
function tema(source: number[], length: number): number[] {
    const ema1 = ema(source, length);
    const ema2 = ema(ema1, length);
    const ema3 = ema(ema2, length);
    return source.map((_, i) => 3 * ema1[i] - 3 * ema2[i] + ema3[i]);
}

// Momentum = current price - price 'length' periods ago
function mom(source: number[], length: number): number[] {
    const result = new Array(source.length).fill(NaN);
    for (let i = length; i < source.length; i++) {
        result[i] = source[i] - source[i - length];
    }
    return result;
}

function roc(source: number[], length: number): number[] {
    const result = new Array(source.length).fill(NaN);
    for (let i = length; i < source.length; i++) {
        result[i] = ((source[i] - source[i - length]) / source[i - length]) * 100;
    }
    return result;
}

function dev(source: number[], length: number): number[] {
    const result = new Array(source.length).fill(NaN);

    // Calculate SMA first
    const smaValues = sma(source, length);

    // Calculate deviation
    for (let i = length - 1; i < source.length; i++) {
        let sumDeviation = 0;

        // Sum up absolute deviations from SMA
        for (let j = 0; j < length; j++) {
            sumDeviation += Math.abs(source[i - j] - smaValues[i]);
        }

        // Calculate average deviation
        result[i] = sumDeviation / length;
    }

    return result;
}

function variance(source: number[], length: number): number[] {
    const result = new Array(source.length).fill(NaN);

    for (let i = length - 1; i < source.length; i++) {
        let sum = 0;
        let sumSquares = 0;

        for (let j = 0; j < length; j++) {
            sum += source[i - j];
            sumSquares += source[i - j] * source[i - j];
        }

        const mean = sum / length;
        result[i] = sumSquares / length - mean * mean;
    }

    return result;
}

// Highest value for a given length
function highest(source: number[], length: number): number[] {
    const result = new Array(source.length).fill(NaN);

    for (let i = length - 1; i < source.length; i++) {
        let max = -Infinity;
        for (let j = 0; j < length; j++) {
            const value = source[i - j];
            if (isNaN(value)) {
                max = max === -Infinity ? NaN : max;
            } else {
                max = Math.max(max, value);
            }
        }
        result[i] = max;
    }

    return result;
}

// Lowest value for a given length
function lowest(source: number[], length: number): number[] {
    const result = new Array(source.length).fill(NaN);

    for (let i = length - 1; i < source.length; i++) {
        let min = Infinity;
        for (let j = 0; j < length; j++) {
            const value = source[i - j];
            if (isNaN(value) || value === undefined) {
                min = min === Infinity ? NaN : min;
            } else {
                min = Math.min(min, value);
            }
        }
        result[i] = min;
    }

    return result;
}

// Median over a given length
function median(source: number[], length: number): number[] {
    const result = new Array(source.length).fill(NaN);

    for (let i = length - 1; i < source.length; i++) {
        const window = source.slice(i - length + 1, i + 1);
        const sorted = window.slice().sort((a, b) => a - b);
        const mid = Math.floor(length / 2);

        result[i] = length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
    }

    return result;
}

function stdev(source: number[], length: number, biased: boolean = true): number[] {
    const result = new Array(source.length).fill(NaN);
    const smaValues = sma(source, length);

    for (let i = length - 1; i < source.length; i++) {
        let sum = 0;
        for (let j = 0; j < length; j++) {
            sum += Math.pow(source[i - j] - smaValues[i], 2);
        }
        // If biased is true, divide by n. If false (unbiased), divide by (n-1)
        const divisor = biased ? length : length - 1;
        result[i] = Math.sqrt(sum / divisor);
    }

    return result;
}

function linreg(source, length, offset) {
    const size = source.length;
    const output = new Array(size).fill(NaN);

    // We can only compute a regression starting at index = (length - 1)
    // because we need 'length' bars of history to look back.
    for (let i = length - 1; i < size; i++) {
        let sumX = 0;
        let sumY = 0;
        let sumXY = 0;
        let sumXX = 0;
        const n = length;

        // The oldest bar in the window => x=0 => source[i - length + 1]
        // The newest bar in the window => x=length - 1 => source[i]
        //
        // j goes from 0..(length-1), so:
        //   x = j
        //   y = source[i - length + 1 + j]
        for (let j = 0; j < length; j++) {
            const x = j;
            const y = source[i - length + 1 + j];
            sumX += x;
            sumY += y;
            sumXY += x * y;
            sumXX += x * x;
        }

        // slope = (n*sum(xy) - sum(x)*sum(y)) / (n*sum(x^2) - (sum(x))^2)
        const denominator = n * sumXX - sumX * sumX;
        if (denominator === 0) {
            // Edge case: all x the same? Should never happen when length>1,
            // but just in case we handle divide-by-zero
            output[i] = NaN;
            continue;
        }
        const slope = (n * sumXY - sumX * sumY) / denominator;

        // intercept = (sum(y) - slope * sum(x)) / n
        const intercept = (sumY - slope * sumX) / n;

        // Pine formula => intercept + slope*(length - 1 - offset)
        const linRegValue = intercept + slope * (length - 1 - offset);

        output[i] = linRegValue;
    }

    return output;
}

function calculateSupertrend(high: number[], low: number[], close: number[], factor: number, atrPeriod: number): [number[], number[]] {
    const length = high.length;
    const supertrend = new Array(length).fill(NaN);
    const direction = new Array(length).fill(0);

    // Calculate ATR
    const atrValues = atr(high, low, close, atrPeriod);

    // Calculate basic upper and lower bands
    const upperBand = new Array(length).fill(NaN);
    const lowerBand = new Array(length).fill(NaN);

    // Calculate initial bands
    for (let i = 0; i < length; i++) {
        const hl2 = (high[i] + low[i]) / 2;
        const atrValue = atrValues[i];

        if (!isNaN(atrValue)) {
            upperBand[i] = hl2 + factor * atrValue;
            lowerBand[i] = hl2 - factor * atrValue;
        }
    }

    // Initialize first valid values
    let prevUpperBand = upperBand[atrPeriod];
    let prevLowerBand = lowerBand[atrPeriod];
    let prevSupertrend = close[atrPeriod] <= prevUpperBand ? prevUpperBand : prevLowerBand;
    let prevDirection = close[atrPeriod] <= prevUpperBand ? -1 : 1;

    supertrend[atrPeriod] = prevSupertrend;
    direction[atrPeriod] = prevDirection;

    // Calculate Supertrend
    for (let i = atrPeriod + 1; i < length; i++) {
        // Calculate upper band
        let currentUpperBand = upperBand[i];
        if (currentUpperBand < prevUpperBand || close[i - 1] > prevUpperBand) {
            upperBand[i] = currentUpperBand;
        } else {
            upperBand[i] = prevUpperBand;
        }

        // Calculate lower band
        let currentLowerBand = lowerBand[i];
        if (currentLowerBand > prevLowerBand || close[i - 1] < prevLowerBand) {
            lowerBand[i] = currentLowerBand;
        } else {
            lowerBand[i] = prevLowerBand;
        }

        // Set trend direction and value
        if (prevSupertrend === prevUpperBand) {
            if (close[i] > upperBand[i]) {
                direction[i] = 1;
                supertrend[i] = lowerBand[i];
            } else {
                direction[i] = -1;
                supertrend[i] = upperBand[i];
            }
        } else {
            if (close[i] < lowerBand[i]) {
                direction[i] = -1;
                supertrend[i] = upperBand[i];
            } else {
                direction[i] = 1;
                supertrend[i] = lowerBand[i];
            }
        }

        // Update previous values
        prevUpperBand = upperBand[i];
        prevLowerBand = lowerBand[i];
        prevSupertrend = supertrend[i];
    }

    return [supertrend, direction];
}
function vwapFunction(
    source: number[],
    volume: number[],
    anchor?: boolean[],
    stdev_mult?: number
  ): number[] | [number[], number[], number[]] {
    const n = source.length;
    const vwap = new Array(n).fill(NaN);
  
    // If no anchor provided, assume false for all indices.
    if (!anchor) {
      anchor = new Array(n).fill(false);
    }
  
    // If stdev_mult is provided, prepare arrays for bands.
    let upper: number[] = [];
    let lower: number[] = [];
    const calculateBands = stdev_mult !== undefined;
    if (calculateBands) {
      upper = new Array(n).fill(NaN);
      lower = new Array(n).fill(NaN);
    }
  
    let cumVolume = 0;
    let cumVolPrice = 0;
    // For standard deviation over the current segment.
    let segValues: number[] = [];
  
    for (let i = 0; i < n; i++) {
      // Reset cumulative sums if anchor is true.
      if (anchor[i]) {
        cumVolume = 0;
        cumVolPrice = 0;
        segValues = [];
      }
  
      cumVolume += volume[i];
      cumVolPrice += source[i] * volume[i];
      vwap[i] = cumVolPrice / cumVolume;
  
      if (calculateBands) {
        segValues.push(source[i]);
        const segCount = segValues.length;
        const segSum = segValues.reduce((sum, val) => sum + val, 0);
        const segMean = segSum / segCount;
        const segSumSq = segValues.reduce((sum, val) => sum + val * val, 0);
        const variance = segSumSq / segCount - segMean * segMean;
        const stddev = Math.sqrt(variance);
        upper[i] = vwap[i] + stdev_mult * stddev;
        lower[i] = vwap[i] - stdev_mult * stddev;
      }
    }
  
    if (calculateBands) {
      return [vwap, upper, lower];
    } else {
      return vwap;
    }
  }
  
  // Global SWMA function (4-bar weighted average as in PineScript).
function swmaFunction(source: number[]): number[] {
    const n = source.length;
    const result = new Array(n).fill(NaN);
    for (let i = 3; i < n; i++) {
      result[i] = (source[i - 3] * 1 + source[i - 2] * 2 + source[i - 1] * 2 + source[i] * 1) / 6;
    }
    return result;
  }
  
export default TechnicalAnalysis;
