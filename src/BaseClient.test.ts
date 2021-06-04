import _ from 'lodash';
import uuid from 'uuid';

import { Request } from 'node-fetch';

import { BaseClient, UserCookie } from "./BaseClient";
import { RequiresLoginException } from './errors';

beforeEach(() => {
    jest.resetAllMocks();
    fetchMock.resetMocks();
});

class TestClient extends BaseClient {
    // @ts-expect-error 只是为了能访问 protected 方法，参数原封不动传过去
    async getJson(...args) {
        // @ts-expect-error 同上…
        return super.getJson(...args);
    }
}

function generateStuff() {

    const [userAgent, hostRandom, appid, userhash]
        = _.times(4, () => uuid.v4());
    const host = hostRandom + '.com';
    const queries = { foo: 'bar' };
    const responseJson = { hello: 'world' };

    return { userAgent, host, appid, userhash, queries, responseJson };

}

describe('BaseClient', () => {

    test('综合', async () => {
        const { userAgent, host, appid, userhash, queries, responseJson } = generateStuff();
        const client = new TestClient({
            userAgent, host, appid,
            user: new UserCookie({ userhash }),
        });

        const mockTimestamp = Date.now();
        // https://stackoverflow.com/a/57599680
        const spy = jest.spyOn(Date, 'now').mockImplementation(() => mockTimestamp);
        fetchMock.mockResponseOnce(async (req: Request) => {
            expect(req.headers.raw()['user-agent']).toEqual([userAgent]);
            const expectedUrl = `https://${host}/Api/endpoint?foo=bar&appid=${appid}&__t=${mockTimestamp / 1000 | 0}`;
            expect(req.url).toBe(expectedUrl);
            expect(req.headers.raw()['cookie']).toEqual([`userhash=${userhash}`]);
            return JSON.stringify(responseJson);
        });

        const { data } = await client.getJson('endpoint', { queries, withCookies: true });
        spy.mockRestore();
        expect(data).toEqual(responseJson);
    });

    test.each`
    客户端带有用户 | 要求请求发送饼干
    ${false}       | ${false}
    ${false}       | ${true}
    ${true}        | ${false}
    ${true}        | ${true}
    `('客户端带有用户=$客户端带有用户 要求请求发送饼干=$要求请求发送饼干', async ({
        客户端带有用户: cilentWithUser,
        要求请求发送饼干: requestWithCookies,
    }) => {
        const { userAgent, host, appid, userhash } = generateStuff();
        const client = new TestClient({
            userAgent, host, appid,
            user: cilentWithUser ? new UserCookie({ userhash }) : null,
        });

        fetchMock.mockResponseOnce(async (req: Request) => {
            expect(req.headers.raw()['user-agent']).toEqual([userAgent]);
            if (requestWithCookies) {
                expect(req.headers.raw()['cookie']).not.toBeUndefined();
            } else {
                expect(req.headers.raw()['cookie']).toBeUndefined();
            }
            return 'null';
        });

        const promise = client.getJson('endpoint', { withCookies: requestWithCookies });
        if (!cilentWithUser && requestWithCookies) {
            await expect(promise).rejects.toThrowError(RequiresLoginException);
        } else {
            await expect(promise).resolves.not.toThrow();
        }
    });

});