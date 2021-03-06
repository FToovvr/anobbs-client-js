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

export type FetchInstance = typeof fto.fetch;

/**
 * XXX: `headers` 中重复的头会被替代而非附加
 *
 * XXX: `headers` 若有传入 `Headers` 等并非 `Object` 的非空值，非默认者取胜
 */
export function createFetchInstance(
    instanceInit: fto.RequestInit & FetchInstanceInit<fto.RequestInit>,
): FetchInstance {

    const fetch = fto.fetch;
    instanceInit = _.cloneDeep(instanceInit);

    // << Base URL Part A
    const baseUrl = instanceInit.baseUrl;
    delete instanceInit.baseUrl;

    // << Request Intercepting Part A
    const requestInterceptor = instanceInit.requestInterceptor;
    delete instanceInit.requestInterceptor;

    return (async (input: string, init?: fto.RequestInit) => {

        // 把 `_.cloneDeep` 套在最外层会导致 `instanceInit` 受影响，为什么…？
        init = _.merge(_.cloneDeep(instanceInit), init);

        if (baseUrl) {
            input = (new URL(input, baseUrl)).href;
        }

        if (requestInterceptor) {
            [input, init] = requestInterceptor(input, init);
        }

        return await fetch(input, init);

    });

}