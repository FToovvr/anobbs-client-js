import _ from 'lodash';

import { URL } from 'url';

import { NodeFetchRequestInit, NodeFetchReturn } from './node-fetch-types';
import * as fto from './fto-fetch';

import { CookieJar } from "tough-cookie";

export interface FetchInstanceInit<FetchRequestInit extends NodeFetchRequestInit> {
    baseUrl?: string;
    jar?: CookieJar;

    requestInterceptor?: (input: string, init?: FetchRequestInit) => [string, FetchRequestInit];
}

export type FtoFetchInstance = (info: string, init?: fto.RequestInit) => Promise<fto.Response>;

/**
 * XXX: `headers` 中重复的头会被替代而非附加
 *
 * XXX: `headers` 若有传入 `Headers` 等并非 `Object` 的非空值，非默认者取胜
 */
export function createFetchInstance(
    instanceInit: fto.RequestInit & FetchInstanceInit<fto.RequestInit>,
    _fetch?: (info: fto.RequestInfo, init?: fto.RequestInit) => NodeFetchReturn,
): FtoFetchInstance
export function createFetchInstance<FetchRequestInit extends NodeFetchRequestInit>(
    instanceInit: FetchRequestInit & FetchInstanceInit<FetchRequestInit>,
    _fetch?: (info: string, init?: FetchRequestInit) => NodeFetchReturn,
): (info: string, init?: FetchRequestInit) => NodeFetchReturn {

    const fetch = _fetch ?? fto.fetch;
    instanceInit = { ...instanceInit };

    // << Base URL Part A
    const baseUrl = instanceInit.baseUrl;
    delete instanceInit.baseUrl;

    // << Request Intercepting Part A
    const requestInterceptor = instanceInit.requestInterceptor;
    delete instanceInit.requestInterceptor;

    return (async (input: string, init?: FetchRequestInit) => {

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