
import utils from 'util';

import { URL } from 'url';
import { Request } from "node-fetch";

import { LoginPolicy, defaultOptions } from "./Client";
import { GatekeptException, RequiresLoginException } from './errors';
import { createClient } from "./test-fixtures/helpers";

beforeEach(() => {
    jest.resetAllMocks();
    fetchMock.resetMocks();
});

describe("获取版块页面", () => {

    describe("登陆策略的处理、发送请求前对卡页的预先处理", () => {
        const clientWithoutUser = createClient(false);
        const clientWithUser = createClient(true);

        const gateKeeperPageNumber = defaultOptions.boardGatekeeperPageNumber;

        test.each`
        登陆策略                | 存在用户  | 请求卡页页面  | 预期异常                  | 预期发送登陆信息

        ${"enforce"}            | ${true}   | ${false}      | ${null}                   | ${true}
        ${"enforce"}            | ${true}   | ${true}       | ${GatekeptException}      | ${null}
        ${"enforce"}            | ${false}  | ${false}      | ${RequiresLoginException} | ${null}
        ${"enforce"}            | ${false}  | ${true}       | ${RequiresLoginException} | ${null}

        ${"when_has_cookie"}    | ${true}   | ${false}      | ${null}                   | ${true}
        ${"when_has_cookie"}    | ${true}   | ${true}       | ${GatekeptException}      | ${null}
        ${"when_has_cookie"}    | ${false}  | ${false}      | ${null}                   | ${false}
        ${"when_has_cookie"}    | ${false}  | ${true}       | ${GatekeptException}      | ${null}

        ${"when_required"}      | ${true}   | ${false}      | ${null}                   | ${false}
        ${"when_required"}      | ${true}   | ${true}       | ${GatekeptException}      | ${null}
        ${"when_required"}      | ${false}  | ${false}      | ${null}                   | ${false}
        ${"when_required"}      | ${false}  | ${true}       | ${GatekeptException}      | ${null}

        ${"always_no"}          | ${true}   | ${false}      | ${null}                   | ${false}
        ${"always_no"}          | ${true}   | ${true}       | ${GatekeptException}      | ${null}
        ${"always_no"}          | ${false}  | ${false}      | ${null}                   | ${false}
        ${"always_no"}          | ${false}  | ${true}       | ${GatekeptException}      | ${null}

        `('登陆策略=$登陆策略 存在用户=$存在用户 请求卡页页面=$请求卡页页面', async ({
            登陆策略: policy,
            存在用户: withUser,
            请求卡页页面: accessesGatekeptPage,
            预期异常: expectedException,
            预期发送登陆信息: expectsSendingCredentials,
        }: {
            登陆策略: LoginPolicy,
            存在用户: boolean,
            请求卡页页面: boolean,
            预期异常: { new(...args: unknown[]): Error } | null,
            预期发送登陆信息: boolean | null,
        }) => {

            const client = withUser ? clientWithUser : clientWithoutUser;

            fetchMock.mockResponseOnce(async (req: Request) => {
                expect(expectsSendingCredentials).not.toBeNull();
                expect(client.user?.userhash).not.toBeNull();

                const url = new URL(req.url);
                expect(url.pathname).toBe('/Api/showf');

                if (expectsSendingCredentials) {
                    expect(req.headers.raw()['cookie']).toEqual([`userhash=${client.user?.userhash}`]);
                } else {
                    expect(req.headers.get('cookie')).toBeNull();
                }
                return '[]';
            });

            const promise = client.getBoardPage({
                boardId: 1234567890,
                pageNumber: gateKeeperPageNumber + (accessesGatekeptPage ? 1 : 0),
                options: { loginPolicy: policy },
            });

            if (expectedException) {
                await expect(promise).rejects.toThrowError(expectedException);
            } else {
                await expect(promise).resolves.not.toThrow();
            }

        });

    });

    describe.skip('实测', () => {

        test("获取到的跑团版第一页内容不应为空", () => {
            // TODO
        });

        test("页面中主题串的最后修改时间不应为空", () => {
            // TODO
        });

    });

});

describe("获取串页面", () => {

    describe("登陆策略的处理、发送请求前对卡页的预先处理", () => {
        const clientWithoutUser = createClient(false);
        const clientWithUser = createClient(true);

        const gateKeeperPageNumber = defaultOptions.boardGatekeeperPageNumber;

        test.each`
        登陆策略                | 存在用户  | 请求卡页页面  | 预期异常                  | 预期发送登陆信息

        ${"enforce"}            | ${true}   | ${false}      | ${null}                   | ${true}
        ${"enforce"}            | ${true}   | ${true}       | ${null}                   | ${true}
        ${"enforce"}            | ${false}  | ${false}      | ${RequiresLoginException} | ${null}
        ${"enforce"}            | ${false}  | ${true}       | ${RequiresLoginException} | ${null}

        ${"when_has_cookie"}    | ${true}   | ${false}      | ${null}                   | ${true}
        ${"when_has_cookie"}    | ${true}   | ${true}       | ${null}                   | ${true}
        ${"when_has_cookie"}    | ${false}  | ${false}      | ${null}                   | ${false}
        ${"when_has_cookie"}    | ${false}  | ${true}       | ${GatekeptException}      | ${null}

        ${"when_required"}      | ${true}   | ${false}      | ${null}                   | ${false}
        ${"when_required"}      | ${true}   | ${true}       | ${null}                   | ${true}
        ${"when_required"}      | ${false}  | ${false}      | ${null}                   | ${false}
        ${"when_required"}      | ${false}  | ${true}       | ${GatekeptException}      | ${null}

        ${"always_no"}          | ${true}   | ${false}      | ${null}                   | ${false}
        ${"always_no"}          | ${true}   | ${true}       | ${GatekeptException}      | ${null}
        ${"always_no"}          | ${false}  | ${false}      | ${null}                   | ${false}
        ${"always_no"}          | ${false}  | ${true}       | ${GatekeptException}      | ${null}

        `('登陆策略=$登陆策略 存在用户=$存在用户 请求卡页页面=$请求卡页页面', async ({
            登陆策略: policy,
            存在用户: withUser,
            请求卡页页面: accessesGatekeptPage,
            预期异常: expectedException,
            预期发送登陆信息: expectsSendingCredentials,
        }: {
            登陆策略: LoginPolicy,
            存在用户: boolean,
            请求卡页页面: boolean,
            预期异常: { new(...args: unknown[]): Error } | null,
            预期发送登陆信息: boolean | null,
        }) => {

            const client = withUser ? clientWithUser : clientWithoutUser;

            fetchMock.mockResponseOnce(async (req: Request) => {
                expect(expectsSendingCredentials).not.toBeNull();
                expect(client.user?.userhash).not.toBeNull();

                const url = new URL(req.url);
                expect(url.pathname).toBe('/Api/thread/id/1234567890');

                if (expectsSendingCredentials) {
                    expect(req.headers.raw()['cookie']).toEqual([`userhash=${client.user?.userhash}`]);
                } else {
                    expect(req.headers.get('cookie')).toBeNull();
                }
                return 'null';
            });

            const promise = client.getThreadPage({
                threadId: 1234567890,
                pageNumber: gateKeeperPageNumber + (accessesGatekeptPage ? 1 : 0),
                options: { loginPolicy: policy },
            });

            if (expectedException) {
                await expect(promise).rejects.toThrowError(expectedException);
            } else {
                await expect(promise).resolves.not.toThrow();
            }

        });

    });

    describe.skip('实测', () => {

        // TODO

    });

});