import _ from 'lodash';

import { URL } from 'url';

import nodeFetch from 'node-fetch';
import * as fto from './fto-fetch';

import { CookieJar } from "tough-cookie";

export interface FetchInstanceInit<FetchRequestInit extends nodeFetch.RequestInit> {
    baseUrl?: string;
    jar?: CookieJar;

    requestInterceptor?: (input: string, init?: FetchRequestInit) => [string, FetchRequestInit];
}

/**
 * XXX: `headers` 中重复的头会被替代而非附加
 *
 * XXX: `headers` 若有传入 `Headers` 等并非 `Object` 的非空值，非默认者取胜
 */
export function createFetchInstance(
    instanceInit: fto.RequestInit & FetchInstanceInit<fto.RequestInit>,
): typeof fto.fetch {

    const fetch = fto.fetch;
    instanceInit = { ...instanceInit };

    // << Base URL Part A
    const baseUrl = instanceInit.baseUrl;
    delete instanceInit.baseUrl;

    // << Request Intercepting Part A
    const requestInterceptor = instanceInit.requestInterceptor;
    delete instanceInit.requestInterceptor;

    return (async (input: string, init?: fto.RequestInit) => {

        init = _.merge(instanceInit, init);

        if (baseUrl) {
            input = (new URL(input, baseUrl)).href;
        }

        if (requestInterceptor) {
            [input, init] = requestInterceptor(input, init);
        }

        return await fetch(input, init);

    });

}