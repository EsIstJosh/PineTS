// SPDX-License-Identifier: AGPL-3.0-only

import { PineArrayObject, PineArrayType } from '../PineArrayObject';
import { Context } from '../../../Context.class';
import { assertElementCount } from '../../limits';

export function new_float(context: Context) {
    return (size: number = 0, initial_value: number = NaN): PineArrayObject => {
        // Guard: na (NaN) or negative size → empty array (matches TradingView behavior)
        const safeSize = (typeof size === 'number' && size > 0 && !isNaN(size)) ? Math.floor(size) : 0;
        assertElementCount(safeSize, 'array.new');
        return new PineArrayObject(Array(safeSize).fill(context.precision(initial_value)), PineArrayType.float, context);
    };
}
