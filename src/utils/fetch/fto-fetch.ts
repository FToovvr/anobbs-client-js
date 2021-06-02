import _ from 'lodash';

import { URL, URLSearchParams } from 'url';
import AbortController from 'abort-controller';

import nodeFetch, { Headers } from 'node-fetch';
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

export type RequestInit = nodeFetch.RequestInit & RequestInitExPart;

export interface WithRequest {
    request: {
        info: string,
        init: RequestInit,
        final: {
            info: string,
            init: nodeFetch.RequestInit,
        }
    }
}

export type Response = nodeFetch.Response & WithRequest;

export async function fetch(input: string, init?: RequestInit): Promise<Response> {

    const { input: finalInput, init: finalInit, local } = await (async (input, init)=>{
        init = { ...(init ?? {}) };

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

        // << CookieJar Part A
        const jar = init.jar;
        const jarOptions = init.jarOptions;
        delete init.jar, init.jarOptions;
        const cookieString = await jar?.getCookieString(input);
        if (cookieString) {
            const headers = new Headers(init.headers);
            headers.append('cookie', cookieString);
            init.headers = headers;
        }

        // << Timeout Part A
        const { timeout } = init;
        delete init.timeout;

        // << validateStatus Part A
        const { validateStatus } = init;
        delete init.validateStatus;

        // << 重试 Part A
        const retryDelay = init.retryDelay;
        const retryOn = init.retryOn;
        const beforeRetry = init.beforeRetry;
        delete init.retryDelay, init.retryOn, init.beforeRetry;

        return {
            input, init: init as nodeFetch.RequestInit,
            local: {
                jar, jarOptions,
                timeout,
                validateStatus,
                retryDelay, retryOn, beforeRetry,
            },
        };
    })(input, init);

    for (let currentAttempts = 1; ; currentAttempts++) {
        // << Timeout Part B
        let didTimeout = false; // 反正单线程
        const { controller, timeoutId } = ((oldSignal) => {
            if (!local.timeout) {
                return null;
            }
            oldSignal?.addEventListener("abort", () => {
                controller.abort();
            });
            const controller = new AbortController();
            const id = setTimeout(() => {
                didTimeout = true;
                controller.abort();
            }, local.timeout);
            return { controller, timeoutId: id };
        })(finalInit.signal) ?? { controller: null, timeoutId: null };
        if (controller) {
            finalInit.signal = controller.signal;
        }

        let response: Response | undefined;
        try {
            const _response = await nodeFetch(finalInput, { ...finalInit, redirect: 'manual' });
            response = new Proxy(_response, {
                get:(target, property, ...args) => {
                    if (property === 'request') {
                        return { info: input, init, final: { info: finalInput, init: finalInit } };
                    }
                    return Reflect.get(target, property, ...args);
                },
            }) as Response;
            if (timeoutId != null) {
                clearTimeout(timeoutId);
            }

            // << CookieJar Part B
            for (const newCookie of response.headers.raw()['set-cookie'] ?? []) {
                await local.jar?.setCookie(newCookie, response.url, { ignoreError: true, ...local.jarOptions });
            }

            { // << CookieJar Part C
                // 思路取自 https://github.com/valeriangalliat/fetch-cookie/blob/eaaa155c589aa23737e446de058ed269c3b81f6c/node-fetch.js
                const redirectStatus = [301, 302, 303, 307];
                if (redirectStatus.indexOf(response.status) >= 0
                    && finalInit.redirect != 'manual' && (finalInit.follow ?? 0 > 0)) {
                    // TODO: NULL 值抛异常？
                    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                    const localtion = response.headers.get('location')!;
                    // 这里传入 init
                    return await fetch(localtion, {
                        ...init,
                        follow: finalInit.follow === undefined ? undefined : finalInit.follow -1,
                        ...(response.status === 307 ? {} : { method: 'GET', body: null }),
                    });
                }
            }

            // << 检验 HTTP 响应状态
            if (local.validateStatus) {
                if (!local.validateStatus(response.status)) {
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
            if (local.retryOn && local.retryOn(currentAttempts, e, response)) {
                local.beforeRetry?.(e);
                if (local.retryDelay) {
                    await new Promise(resolve => setTimeout(resolve, local.retryDelay));
                }
                continue;
            }

            throw e;
        }

        return response;
    }
}