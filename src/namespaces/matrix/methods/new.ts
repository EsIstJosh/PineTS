// SPDX-License-Identifier: AGPL-3.0-only

import { PineMatrixObject } from '../PineMatrixObject';
import { Context } from '../../../Context.class';
import { assertElementCount } from '../../limits';

export function new_fn(context: Context) {
    return (rows: number, cols: number, initial_value: any): PineMatrixObject => {
        const r = typeof rows === 'number' && rows > 0 ? rows : 0;
        const c = typeof cols === 'number' && cols > 0 ? cols : 0;
        assertElementCount(r * c, 'matrix.new');
        return new PineMatrixObject(rows, cols, initial_value, context);
    };
}
