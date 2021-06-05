// import utils from 'util';

import dateFns from 'date-fns';
import { utcToZonedTime } from 'date-fns-tz';

import { URL } from 'url';
import { Request } from "node-fetch";

import { LoginPolicy, defaultOptions } from "./Client";
import { GatekeptException, RequiresLoginException } from './errors';
import { createClient } from "./test-fixtures/helpers";

beforeEach(() => {
    jest.resetAllMocks();
    fetchMock.resetMocks();
});

// TODO: 测试页数等选项对应生成的 URL

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

    test.skip('实测', async () => {
        fetchMock.dontMockOnce();
        const client = createClient(false);
        const { data: page } = await client.getBoardPage({ boardId: 111 });
        // console.log(utils.inspect(page, { showHidden:true, colors: true, getters: true }));

        // 获取到的跑团版第一页内容不应为空
        expect(page.length).toBeGreaterThan(0);
        // 页面中主题串的最后修改时间不应为空
        page.map(t => expect(t.lastModifiedTime).not.toBeNull());
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

    test.skip('实测', async () => {
        fetchMock.dontMockOnce();
        const client = createClient(false);
        const { data: thread } = await client.getThreadPage({ threadId: 49607 });
        // console.log(utils.inspect(thread, { showHidden:true, colors: true, getters: true }));

        expect(thread.userId).toBe("g3qeXeYq");
        expect(thread.content).toBe("这是芦苇");
        expect(thread.attachmentBase).not.toBeNull();
        expect(thread.title).toBe("想歪的给我自重");
        expect(thread.email).toBeNull();
        const localCreatedAt = utcToZonedTime(thread.createdAt, 'Asia/Shanghai');
        expect(
            dateFns.format(localCreatedAt, 'y-MM-dd')
            + "(" + "一二三四五六日"[(Number(dateFns.format(localCreatedAt, 'c'))-2+7)%7] + ")"
            + dateFns.format(localCreatedAt, 'HH:mm:ss'),
        ).toBe("2012-02-09(\u56db)01:08:45");
    });

    // TODO 登陆访问 100+ 页面

    // TODO 404 页面

});