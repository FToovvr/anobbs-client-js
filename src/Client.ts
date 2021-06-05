import { BaseClient, Options as BaseOptions, defaultOptions as baseDefaultOptions } from "./BaseClient";
import { ThreadPage, ThreadPageRaw } from "./objects";
import { GatekeptException } from "./errors";
import { createOptionsResolverWithDefaults } from "./utils/options-resolver";

/**
 * 决定「是否以登录状态发送请求」的策略。
 *
 * * `enforce` = 无视其他条件，必须设置饼干，并使用该饼干请求服务器
 * * `when_has_cookie` = 只要设置了用户饼干，就使用该饼干请求服务器
 * * `when_required` = 只有在需要时（如获取串的 100 页之后的页面）才使用设置的饼干，否则会以无饼干状态请求服务器
 * * `always_no` = 即使设置了饼干，也会以无饼干状态请求服务器
 */
export type LoginPolicy = 'enforce' | 'when_has_cookie' | 'when_required' | 'always_no';

export interface Options extends BaseOptions {

    loginPolicy?: LoginPolicy;

    /**
     * 版块页面发生「卡页」时会返回的页面的页数。
     */
    boardGatekeeperPageNumber?: number;
    /**
     * 串页面发生「卡页」时会返回的页面的页数。
     */
    threadGatekeeperPageNumber?: number;

}
export const defaultOptions: Required<Options> = {
    ...baseDefaultOptions,
    loginPolicy: 'when_required',
    boardGatekeeperPageNumber: 100,
    threadGatekeeperPageNumber: 100,
};

export class Client extends BaseClient {

    fallbackOptions: Options | null;

    constructor(args: Omit<ConstructorParameters<typeof BaseClient>[0], 'fallbackOptions'> & { fallbackOptions: Options | null }) {
        // @ts-expect-error 不会有问题
        super(args);
        this.fallbackOptions = args.fallbackOptions;
    }

    /**
     * @deprecated 稍后会进行封装
     */
    async getBoardPageJson({
        boardId, pageNumber,
        options,
    }: {
        boardId: number; pageNumber?: number;
        options?: Options;
    }): Promise<{ data: unknown; }> {

        const resolvedOptions = createOptionsResolverWithDefaults<Options>([this.fallbackOptions, options ?? null], defaultOptions);
        const { boardGatekeeperPageNumber, loginPolicy } = resolvedOptions;

        if (pageNumber ?? 1 > boardGatekeeperPageNumber) {
            throw new GatekeptException({
                message: `无论是否登陆，访问超过 ${boardGatekeeperPageNumber} 页的版块页面必会卡页`,
                context: `获取版块页面 ${JSON.stringify({ boardId })}`,
                currentPageNumber: pageNumber ?? 1,
            });
        }
        const withCookies = this.determinWhetherSendsCredentialsForPage(
            // 传进去的 boardGatekeeperPageNumber 其实没意义
            pageNumber ?? 1, boardGatekeeperPageNumber,
            loginPolicy,
        );

        return await this.getJson('/showf', {
            queries: {
                id: String(boardId),
                page: String(pageNumber),
            },
            withCookies,
            options: resolvedOptions,
        });

    }

    async getThreadPage({
        threadId, pageNumber,
        options,
    }: {
        threadId: number; pageNumber?: number,
        options?: Options;
    }): Promise<{ data: ThreadPage }> {

        const resolvedOptions = createOptionsResolverWithDefaults<Options>([this.fallbackOptions, options ?? null], defaultOptions);
        const { threadGatekeeperPageNumber, loginPolicy } = resolvedOptions;

        const withCookies = this.determinWhetherSendsCredentialsForPage(
            pageNumber ?? 1, threadGatekeeperPageNumber,
            loginPolicy,
        );
        if (withCookies && (!this.user || loginPolicy === 'always_no')) {
            throw new GatekeptException({
                message: `访问超过 ${threadGatekeeperPageNumber} 页的串页面需要登陆，但并无用户`,
                context: `获取串页面 ${JSON.stringify({ threadId, withCredentials: withCookies })}`,
                currentPageNumber: pageNumber ?? 1,
            });
        }

        const { data } = await this.getJson(`/thread/id/${threadId}`, {
            queries: {
                page: String(pageNumber),
            },
            withCookies,
            options: resolvedOptions,
        });

        return {
            data: new ThreadPage(data as ThreadPageRaw),
        };

    }

    protected determinWhetherSendsCredentialsForPage(
        pageNumber: number, gateKeeperPageNumber: number,
        loginPolicy: LoginPolicy,
    ): boolean {

        switch (loginPolicy) {
        case 'enforce':
            return true;
        case 'when_has_cookie':
            return !!this.user || pageNumber > gateKeeperPageNumber;
        case 'when_required': case 'always_no':
            return pageNumber > gateKeeperPageNumber;
        default:
            throw new Error('never');
        }

    }

}