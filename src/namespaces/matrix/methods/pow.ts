// SPDX-License-Identifier: AGPL-3.0-only

import { PineMatrixObject } from '../PineMatrixObject';
import { Context } from '../../../Context.class';

export function pow(context: Context) {
    return (id: PineMatrixObject, power: number) => {
        const rows = id.matrix.length;
        const cols = rows > 0 ? id.matrix[0].length : 0;

        if (rows !== cols) {
            // Must be square
            return new PineMatrixObject(0, 0, NaN, context);
        }

        // Identity matrix for power 0
        let result = new PineMatrixObject(rows, cols, 0, context);
        for (let i = 0; i < rows; i++) result.matrix[i][i] = 1;

        let base = new PineMatrixObject(rows, cols, NaN, context);
        // Deep copy base
        for (let i = 0; i < rows; i++) base.matrix[i] = [...id.matrix[i]];

        let p = Math.floor(power);
        // A non-finite power (e.g. Infinity from math.pow(10, 400)) is a fixed
        // point of `p = Math.floor(p / 2)`, so the loop below would never
        // terminate (a pure CPU spin). Reject it, like a negative power, with a
        // na matrix instead of hanging the host thread.
        if (!Number.isFinite(p) || p < 0) return new PineMatrixObject(rows, cols, NaN, context); // Or inverse? Pine usually doesn't do matrix power inversion automatically here

        while (p > 0) {
            if (p % 2 === 1) {
                // result = result * base
                const temp = new PineMatrixObject(rows, cols, 0, context);
                for (let i = 0; i < rows; i++) {
                    for (let j = 0; j < cols; j++) {
                        let sum = 0;
                        for (let k = 0; k < rows; k++) {
                            sum += result.matrix[i][k] * base.matrix[k][j];
                        }
                        temp.matrix[i][j] = sum;
                    }
                }
                result = temp;
            }
            // base = base * base
            const tempBase = new PineMatrixObject(rows, cols, 0, context);
            for (let i = 0; i < rows; i++) {
                for (let j = 0; j < cols; j++) {
                    let sum = 0;
                    for (let k = 0; k < rows; k++) {
                        sum += base.matrix[i][k] * base.matrix[k][j];
                    }
                    tempBase.matrix[i][j] = sum;
                }
            }
            base = tempBase;
            p = Math.floor(p / 2);
        }

        return result;
    };
}
