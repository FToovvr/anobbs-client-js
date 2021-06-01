import _ from 'lodash';

import { URL, URLSearchParams } from 'url';
import AbortController from 'abort-controller';

import nodeFetch, { Headers, Response } from 'node-fetch';
export { Response } from 'node-fetch';
import { NodeFetchRequestInit, NodeFetchReturn } from './node-fetch-types';
import { CookieJar } from 'tough-cookie';

import { HTTPStatusError, timeoutError } from './errors';

export interface RequestInitExPart {
    urlQueries?: Record<string, string> //ConstructorParameters<typeof URLSearchParams>[0];

    jar?: CookieJar | null;
    jarOptions?: CookieJar.SetCookieOptions;

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
    beforeRetry?: (error: unknown) => void;
}

export default function makeFtoFetch<FetchRequestInit extends NodeFetchRequestInit>(
    _fetch?: (info: string, init?: FetchRequestInit) => NodeFetchReturn,
): (info: string, init?: FetchRequestInit & RequestInitExPart) => NodeFetchReturn {
    const fetch = _fetch ?? nodeFetch;

    const ftoFetch = (async (input: string, init?: FetchRequestInit & RequestInitExPart): Promise<nodeFetch.Response> => {
        init = { ...(init ?? {} as (FetchRequestInit & RequestInitExPart)) };

        // << URL 参数
        if (init.urlQueries) {
            const inputUrl = new URL(input);
            // 似乎 `… of new URLSearchParams(init.urlQueries)` 也成
            for (const [key, value] of (new URLSearchParams(init.urlQueries)).entries()) {
                inputUrl.searchParams.append(key, value);
            }
            input = inputUrl.href;
        }
        // delete init.urlQueries;

        // << CookieJar Part A
        const jar = init.jar;
        const jarOptions = init.jarOptions;
        // delete init.jar, init.jarOptions;
        const cookieString = await jar?.getCookieString(input);
        if (cookieString) {
            const headers = new Headers(init.headers);
            headers.append('cookie', cookieString);
            init.headers = headers;
        }

        // << Timeout Part A
        const { timeout } = init;
        // delete init.timeout;

        // << 重试 Part A
        const retryDelay = init.retryDelay;
        const retryOn = init.retryOn;
        const beforeRetry = init.beforeRetry;
        // delete init.retryDelay, init.retryOn, init.beforeRetry;

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
                response = await fetch(input, { ...init, redirect: 'manual' });
                if (timeoutId != null) {
                    clearTimeout(timeoutId);
                }

                // << CookieJar Part B
                for (const newCookie of response.headers.raw()['set-cookie'] ?? []) {
                    await jar?.setCookie(newCookie, response.url, { ignoreError: true, ...jarOptions });
                }

                { // << CookieJar Part C
                    // 思路取自 https://github.com/valeriangalliat/fetch-cookie/blob/eaaa155c589aa23737e446de058ed269c3b81f6c/node-fetch.js
                    const redirectStatus = [301, 302, 303, 307];
                    if (redirectStatus.indexOf(response.status) >= 0
                        && init.redirect != 'manual' && (init.follow ?? 0 > 0)) {
                        // TODO: NULL 值抛异常？
                        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                        const localtion = response.headers.get('location')!;
                        return await ftoFetch(localtion, {
                            ...init,
                            follow: init.follow === undefined ? undefined : init.follow -1,
                            ...(response.status === 307 ? {} : { method: 'GET', body: null }),
                        });
                    }
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
                    beforeRetry?.(e);
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

    return ftoFetch;

}

export const fetch = makeFtoFetch();

export type RequestInfo = Parameters<typeof fetch>[0];
export type RequestInit = NonNullable<Parameters<typeof fetch>[1]>;
// // https://stackoverflow.com/a/49889856
// type ThenArg<T> = T extends PromiseLike<infer U> ? U : T;