import _ from 'lodash';

import { URL } from 'url';

import { NodeFetchRequestInit, NodeFetchReturn } from './node-fetch-types';
import * as fto from './fto-fetch';

import makeFetchCookie from 'fetch-cookie/node-fetch';
import { CookieJar } from "tough-cookie";

export interface FetchInstanceInit<FetchRequestInit extends NodeFetchRequestInit> {
    baseUrl?: string;
    jar?: CookieJar;

    requestInterceptor?: (input: string, init?: FetchRequestInit) => [string, FetchRequestInit];
}

export function createFetchInstance(
    instanceInit: fto.RequestInit & FetchInstanceInit<fto.RequestInit>,
    _fetch?: (info: fto.RequestInfo, init?: fto.RequestInit) => NodeFetchReturn,
): (info: string, init?: fto.RequestInit) => Promise<fto.Response>
export function createFetchInstance<FetchRequestInit extends NodeFetchRequestInit>(
    instanceInit: FetchRequestInit & FetchInstanceInit<FetchRequestInit>,
    _fetch?: (info: string, init?: FetchRequestInit) => NodeFetchReturn,
): (info: string, init?: FetchRequestInit) => NodeFetchReturn {

    let fetch = _fetch ?? fto.fetch;
    instanceInit = { ...instanceInit };

    // << Base URL Part A
    const baseUrl = instanceInit.baseUrl;
    delete instanceInit.baseUrl;

    // << CookieJar 支持
    fetch = instanceInit.jar ? makeFetchCookie(fetch, instanceInit.jar) : fetch;
    delete instanceInit.jar;

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