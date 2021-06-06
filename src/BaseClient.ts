import { CookieJar } from 'tough-cookie';

import { createOptionsResolverWithDefaults } from "./utils/options-resolver";
import { RequiresLoginException } from "./errors";
import { createFetchInstance, FetchInstance } from './utils/fetch';

/**
 * 代表一名用户的饼干
 */
export class UserCookie {

    /**
     * 对这块饼干的文本标记，没用实际作用
     */
    mark?: string;

    /**
     * 饼干的 `userhash`
     */
    userhash: string;

    constructor({ mark, userhash }: { mark?: string; userhash: string; }) {
        this.mark = mark;
        this.userhash = userhash;
    }

}

export interface Options {
    [key: string]: unknown;
    retries?: number;
}
export const defaultOptions: Required<Options> = {
    retries: 3,
};

/**
 * 客户端基类。
 *
 * 不实现实际的请求功能。
 */
export class BaseClient {

    /**
     * 发送请求时使用的 User-Agent。
     */
    readonly userAgent: string;

    /**
     * 所请求站点的主机名。
     *
     * TODO: 换成 baseUrl，host 从中分离；或者加上 basePath
     */
    readonly host: string;

    /**
     * 法所请求时所附带的 `appid` 参数，可空缺。
     */
    readonly appid: string | null;

    /**
     * 进行请求操作的用户。
     *
     * 为 `null` 则代表不登陆。
     */
    readonly user: UserCookie | null;

    /**
     * 默认的请求相关选项。
     *
     */
    readonly fallbackOptions: Options | null;

    readonly fetchInstance: FetchInstance;

    constructor({
        userAgent, host, appid,
        user,
        fallbackOptions,
    }: {
        userAgent: string; host: string; appid: string | null;
        user: UserCookie | null;
        fallbackOptions?: Options;
    }) {
        this.userAgent = userAgent;
        this.host = host;
        this.appid = appid;

        this.user = user;

        this.fallbackOptions = fallbackOptions ?? null;

        this.fetchInstance = createFetchInstance({
            baseUrl: `https://${host}/Api/`,
            headers: {
                // XXX: fetch 会小写化 Headers
                'accept': 'application/json',
                'user-agent': this.userAgent,
                'accept-language': 'zh-cn', //'en-us'
                'accept-encoding': 'gzip, deflate, br',
            },
            timeout: 20 * 1000,
            validateStatus: (status) => status === 200,

            jar: (({ host, user }) => {
                if (!user) {
                    return undefined;
                }
                /// XXX: 不确定异步操作会不会可能导致竞争问题
                const cookieJar = new CookieJar();
                const cookiesToAdd = [
                    { key: 'userhash', value: user.userhash },
                ];
                for (const { key, value } of cookiesToAdd) {
                    cookieJar.setCookieSync(`${key}=${value}; domain=${host}`, `https://${host}`);
                }
                return cookieJar;
            })({ host: this.host, user: this.user }),

            requestInterceptor: (input, init) => {
                init = init ?? {};
                init.urlQueries = {
                    ...(init?.urlQueries ?? {}),
                    ...(this.appid ? { appid: this.appid } : undefined),
                    // 正确的时间戳，即以 UTC+0 为标准的时间戳
                    __t: String(Date.now() / 1000 | 0),
                };
                return [input, init];
            },
        });

    }

    protected async getJson(endpoint: string, {
        queries,
        withCookies,
        options: _options,
    }: {
        queries: { [key: string]: string },
        withCookies: boolean,
        options?: Options,
     }): Promise<{ data: unknown }> {

        const options = createOptionsResolverWithDefaults<Options>([this.fallbackOptions, _options ?? null], defaultOptions);

        if (withCookies && !this.user) {
            // TODO: 提供更多上下文信息
            throw new RequiresLoginException();
        }

        const resp = await this.fetchInstance(endpoint, {
            urlQueries: { ...queries },
            ...( withCookies ? { } : { jar: null }),
            retryOn: (currentAttempts, err) =>
                (err instanceof Error && err.name == 'NetworkError') && currentAttempts <= options.retries,
            // TODO: 提供一个 callback 以方便使用者打 log
            beforeRetry: err => console.log(err),
        });

        return { data: await resp.json() };

    }

}