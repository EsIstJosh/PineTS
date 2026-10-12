// SPDX-License-Identifier: AGPL-3.0-only

import { PineArrayObject, PineArrayType } from '../PineArrayObject';
import { assertElementCount } from '../../limits';

export function new_string(context: any) {
    return (size: number = 0, initial_value: string = ''): PineArrayObject => {
        const safeSize = (typeof size === 'number' && size > 0 && !isNaN(size)) ? Math.floor(size) : 0;
        assertElementCount(safeSize, 'array.new');
        return new PineArrayObject(Array(safeSize).fill(initial_value), PineArrayType.string, context);
    };
}
