import _ from 'lodash';

import { URL, URLSearchParams } from 'url';
import AbortController from 'abort-controller';

import nodeFetch, { Response } from 'node-fetch';
export { Response } from 'node-fetch';
import { NodeFetchRequestInit, NodeFetchReturn } from './node-fetch-types';

import { HTTPStatusError, timeoutError } from './errors';

export interface RequestInitExPart {
    urlQueries?: Record<string, string> //ConstructorParameters<typeof URLSearchParams>[0];

    /**
     * 超时设定，以毫秒为单位。
     *
     * 不同实现有不同上限（也可能没有上限）。
     */
    timeout?: number;

    validateStatus?: (status: number) => boolean;

    retryOn?: (currentAttempts: number, error: unknown, response?: Response) => boolean;
    /**
     * 重试间隔，以毫秒为单位。
     */
    retryDelay?: number;
}

export default function makeFtoFetch<FetchRequestInit extends NodeFetchRequestInit>(
    _fetch?: (info: string, init?: FetchRequestInit) => NodeFetchReturn,
): (info: string, init?: FetchRequestInit & RequestInitExPart) => NodeFetchReturn {
    const fetch = _fetch ?? nodeFetch;

    return (async (input: string, init?: FetchRequestInit & RequestInitExPart) => {
        init = init ?? {} as (FetchRequestInit & RequestInitExPart);

        // << URL 参数
        if (init.urlQueries) {
            const inputUrl = new URL(input);
            // 似乎 `… of new URLSearchParams(init.urlQueries)` 也成
            for (const [key, value] of (new URLSearchParams(init.urlQueries)).entries()) {
                inputUrl.searchParams.append(key, value);
            }
            input = inputUrl.href;
        }
        delete init.urlQueries;

        // << Timeout Part A
        const { timeout } = init;
        delete init.timeout;

        // << 重试 Part A
        const retryDelay = init.retryDelay;
        const retryOn = init.retryOn;
        delete init.retryDelay, init.retryOn;

        for (let currentAttempts = 1; ; currentAttempts++) {
            // << Timeout Part B
            let didTimeout = false; // 反正单线程
            const { controller, timeoutId } = ((oldSignal) => {
                if (!timeout) {
                    return null;
                }
                oldSignal?.addEventListener("abort", () => {
                    controller.abort();
                });
                const controller = new AbortController();
                const id = setTimeout(() => {
                    didTimeout = true;
                    controller.abort();
                }, timeout);
                return { controller, timeoutId: id };
            })(init.signal) ?? { controller: null, timeoutId: null };
            if (controller) {
                init.signal = controller.signal;
            }

            let response: Response | undefined;
            try {
                response = await fetch(input, init);
                if (timeoutId != null) {
                    clearTimeout(timeoutId);
                }

                // << 检验 HTTP 响应状态
                if (init.validateStatus) {
                    if (!init.validateStatus(response.status)) {
                        throw new HTTPStatusError(_.pick(response, ['status', 'statusText']));
                    }
                }
            } catch (_e) {
                let e = _e;
                // << Timeout Part C
                if (e.name === 'AbortError' && didTimeout) {
                    e = timeoutError;
                } else if (timeoutId != null) {
                    clearTimeout(timeoutId);
                }

                // << 重试 Part B
                if (retryOn && retryOn(currentAttempts, e, response)) {
                    if (retryDelay) {
                        await new Promise(resolve => setTimeout(resolve, retryDelay));
                    }
                    continue;
                }

                throw e;
            }

            return response;
        }
    });
}

export const fetch = makeFtoFetch();

export type RequestInfo = Parameters<typeof fetch>[0];
export type RequestInit = NonNullable<Parameters<typeof fetch>[1]>;
// // https://stackoverflow.com/a/49889856
// type ThenArg<T> = T extends PromiseLike<infer U> ? U : T;