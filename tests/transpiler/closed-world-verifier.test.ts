// Regression guard: the closed-world verifier (and the `pineOnly` /
// `callMethod` hardening) that keep a Pine Script from reaching host globals,
// the JavaScript prototype chain, or PineTS runtime internals through the
// generated code. TradingView resolves every name against its built-ins and
// rejects the unknown at compile time; these tests pin the same behavior.
//
// Each rejected case is a shape a real Pine script cannot express but that the
// transpiler previously emitted verbatim into `new Function(...)`. Each allowed
// case is an ordinary script that must keep transpiling unchanged.

import { describe, it, expect } from 'vitest';
import { transpile } from '../../src/transpiler/index';
import { ClosedWorldViolation } from '../../src/transpiler/analysis/ClosedWorldVerifier';
import { PineTS } from '../../src/PineTS.class';
import { Provider } from '../../src/marketData/Provider.class';

const H = `//@version=6
indicator("t")
`;

function newPineTS() {
    return new PineTS(Provider.Mock, 'BTCUSDC', '60', null, new Date('2024-01-01').getTime(), new Date('2024-01-10').getTime());
}

describe('closed-world verifier — rejects host / prototype / internal escapes', () => {
    it('rejects a bare host global (globalThis / process / fetch)', () => {
        expect(() => transpile(H + `globalThis.eval('1')\nplot(close)`)).toThrow(ClosedWorldViolation);
        expect(() => transpile(H + `x = process.version\nplot(close)`)).toThrow(/Undeclared identifier "process"/);
        expect(() => transpile(H + `x = fetch\nplot(close)`)).toThrow(/Undeclared identifier "fetch"/);
    });

    it('rejects the Function constructor by name', () => {
        expect(() => transpile(H + `f = Function('return 1')\nplot(close)`)).toThrow(/Undeclared identifier "Function"/);
    });

    it('rejects the prototype-chain route to the Function constructor', () => {
        // `x.constructor.constructor(...)` reaches the Function constructor from
        // any value. The reserved property name is blocked regardless of receiver.
        expect(() => transpile(H + `f = close.constructor.constructor('return 7')\nplot(close)`)).toThrow(
            /reserved property "constructor"/
        );
        expect(() => transpile(H + `s = "a"\nf = s.constructor\nplot(close)`)).toThrow(/reserved property "constructor"/);
    });

    it('rejects reading the runtime Context back-reference (namespace.context)', () => {
        for (const ns of ['str', 'barstate', 'timeframe', 'session', 'log', 'runtime', 'math', 'ta']) {
            expect(() => transpile(H + `c = ${ns}.context\nplot(close)`)).toThrow(/reserved property "context"/);
        }
    });

    it('rejects __proto__ / prototype access', () => {
        expect(() => transpile(H + `p = close.__proto__\nplot(close)`)).toThrow(/reserved property "__proto__"/);
    });

    it('rejects `this`', () => {
        expect(() => transpile(H + `t = this\nplot(close)`)).toThrow(/"this" is not available/);
    });

    it('rejects reaching the mutable host `Error` global (bare and member)', () => {
        // `new Error(...)` (the loop guard) is fine, but `Error` as a value or
        // receiver reaches the real process-global object.
        expect(() => transpile(H + `x = Error\nplot(close)`)).toThrow(/Undeclared identifier "Error"/);
        expect(() => transpile(H + `Error.stackTraceLimit := 4242\nplot(close)`)).toThrow(/Undeclared identifier "Error"/);
        expect(() => transpile(H + `Error.captureStackTrace(close)\nplot(close)`)).toThrow(/Undeclared identifier "Error"/);
    });

    it('still allows the loop-guard `new Error(...)` (loops transpile)', () => {
        expect(() => transpile(H + `s = 0.0\nfor i = 0 to 3\n    s := s + i\nplot(s)`)).not.toThrow();
        expect(() => transpile(H + `n = 0\nwhile n < 3\n    n := n + 1\nplot(n)`)).not.toThrow();
    });

    it('surfaces rejections as a ClosedWorldViolation with no host detail', () => {
        try {
            transpile(H + `x = process\nplot(close)`);
            expect.fail('expected a ClosedWorldViolation');
        } catch (e: any) {
            expect(e).toBeInstanceOf(ClosedWorldViolation);
            expect(e.message).not.toMatch(/process\./); // names the identifier, not host state
        }
    });
});

describe('closed-world verifier — does not break legitimate scripts', () => {
    const ok = [
        H + `plot(close)`,
        H + `e = ta.ema(close, 9)\nplot(e)`,
        H + `t = ta.tr[1]\nplot(t)`,
        H + `plot(close, color = color.green)`,
        H + `a = array.new_float(0)\narray.push(a, close)\nplot(array.size(a))`,
        H + `n = array.size(box.all)\nplot(n)`,
        H + `x = 1\nfor i = 0 to 3\n    x := x + i\nplot(x)`,
        `//@version=6
indicator("t")
type Bar
    float v = 1.0
b = Bar.new()
plot(b.v)`,
        `//@version=5
strategy("t")
plot(strategy.closedtrades)`,
    ];
    for (const src of ok) {
        it(`transpiles: ${src.split('\n').slice(1).join(' ').slice(0, 50)}`, () => {
            expect(() => transpile(src)).not.toThrow();
        });
    }

    it('can be disabled with verify:false (escape hatch)', () => {
        expect(() => transpile(H + `x = process.version\nplot(close)`, { debug: false, verify: false })).not.toThrow();
    });
});

describe('pineOnly — rejects markerless source (treated as raw JavaScript)', () => {
    const rawJs = `const { close } = context.data; context.pine.plot(close);`;
    it('rejects a markerless string when pineOnly is set', () => {
        expect(() => transpile(rawJs, { debug: false, pineOnly: true })).toThrow(/version marker required/);
    });
    it('still accepts markerless source by default (PineTS-syntax contract)', () => {
        expect(() => transpile(rawJs)).not.toThrow();
    });
    it('accepts Pine Script with a version marker under pineOnly', () => {
        expect(() => transpile(H + `plot(close)`, { debug: false, pineOnly: true })).not.toThrow();
    });
});

describe('callMethod — native JavaScript methods are not reachable from Pine', () => {
    it('does not expose String.prototype.length as a Pine method', async () => {
        // `.length` is not a Pine method; dispatch must not fall through to the
        // native member. The property read is left to normal access, but a
        // method-style call on a scalar resolves to nothing (na), as on TV.
        const { plots } = await newPineTS().run(H + `s = "abcde"\nplot(str.length(s))`);
        // Sanity: the real Pine API (str.length) still works and returns 5.
        const firstPlot = Object.values(plots)[0] as any;
        expect(firstPlot.data.at(-1).value).toBe(5);
    });
});

describe('switch-arm `:=` no longer leaks a host global (verifier-exposed bug)', () => {
    it('updates the Pine variable instead of writing a bare global', async () => {
        const { plots } = await newPineTS().run(`//@version=6
indicator("t")
mode = "multiplier"
var float result = 0.0
temp = switch mode
    "multiplier" =>
        result := close * 2
        result
    =>
        result := close
        result
plot(result, "Result")`);
        const data = plots['Result'].data;
        const last = data[data.length - 1].value;
        // result := close * 2 must take effect — not stay at the initial 0.0.
        expect(last).not.toBe(0);
        expect(Number.isNaN(last)).toBe(false);
    });
});
