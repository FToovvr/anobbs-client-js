export async function flushPromises(): Promise<void> {
    return new Promise(resolve => setImmediate(resolve));
}

export type MsOrFn = number | ((nth: number) => number);

/**
 * 推进 jest 的计时器 `n` 次，每次 `ms` 毫秒。
 *
 * `n` 必须和测试中调用过 `await new Promise(resolve => setTimeout(resolve, x))` 的次数相同。
 * 过多调用也会出问题，如异常不会被 `expect(promise).rejects` 捕获。
 *
 * `ms` 理所当然应该足够大。
 *
 * 另见：https://stackoverflow.com/q/52177631
 *
 * @param {number} n
 * @param {MsOrFn} ms
 */
export async function advanceTimersNTimes(n: number, msOrFn: MsOrFn): Promise<void> {
    for (let nth = 1; nth <= n; nth++) {
        await flushPromises();
        const ms = typeof msOrFn === 'number' ? msOrFn : msOrFn(nth);
        jest.advanceTimersByTime(ms);
    }
}

export const exampleDomain = 'example.com';
export const exampleUrl = `https://${exampleDomain}`;
export const notExampleUrl = `https://not.${exampleDomain}`;

export const rejectError = (() => {
    const rejectError = new Error();
    rejectError.name = 'NetworkError';
    return rejectError;
})();