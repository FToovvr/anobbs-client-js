import fetchMock from 'jest-fetch-mock';
import { advanceTimersNTimes, exampleDomain, exampleUrl, rejectError } from './test-fixtures';

import { fetch } from './fto-fetch';
import { HTTPStatusError, timeoutError } from './errors';

import { CookieJar } from "tough-cookie";

beforeEach(() => {
    jest.resetAllMocks();
    fetchMock.resetMocks();
});

describe('fto-fetch', () => {

    test('URL 参数', async () => {

        fetchMock.mockResponseOnce(async (req) => {
            expect(req.url).toBe(`${exampleUrl}/?a=1&b=2`);
            return '';
        });
        await fetch(exampleUrl, { urlQueries: { a: '1', b: '2' } });

    });

    describe('CookieJar', () => {

        test('Mock', async () => {
            const jar = new CookieJar();
            jar.setCookieSync('answer=42', exampleUrl);
            jar.setCookieSync('xxx=yyy', exampleUrl);

            const expireDate = (() => {
                const d = new Date();
                d.setFullYear(d.getFullYear() + 1);
                return d;
            })();
            // FIXME: 不知为何不生效？
            fetchMock.mockResponseOnce('', {
                status: 200,
                headers: {
                    'set-cookie': `foo=bar; path=/; Expires=${expireDate.toUTCString()}; domain=${exampleDomain}`,
                },
                url: exampleUrl,
            });
            await fetch(exampleUrl, { jar });

            fetchMock.mockResponseOnce(async (req) => {
                // expect(req.headers.get('cookie')).toMatch(/(^|;)\s*answer=42\s*(;|$)/);
                // expect(req.headers.get('cookie')).toMatch(/(^|;)\s*xxx=yyy\s*(;|$)/);
                // expect(req.headers.get('cookie')).toMatch(/(^|;)\s*foo=bar\s*(;|$)/);
                expect(req.headers.get('cookie')).toBe('answer=42; xxx=yyy; foo=bar');
                return '';
            });
            await fetch(exampleUrl, { jar });
        });

        // NOTE: 跳过需要实际访问网络的测试
        test.skip('实测', async () => {

            fetchMock.dontMock();

            const jar1 = new CookieJar();
            await fetch('https://httpbin.org/cookies/set/foo/bar', { jar: jar1 });

            const jar2 = new CookieJar();
            await fetch('https://httpbin.org/cookies/set/key/value', { jar: jar2 });

            const cookies1 = jar1.serializeSync().cookies;
            expect(cookies1.length).toBe(1);
            expect(cookies1[0].key).toBe('foo');
            expect(cookies1[0].value).toBe('bar');
            const cookies2 = jar2.serializeSync().cookies;
            expect(cookies2.length).toBe(1);
            expect(cookies2[0].key).toBe('key');
            expect(cookies2[0].value).toBe('value');

        });

    });

    test('超时', async () => {
        jest.useFakeTimers();
        fetchMock.mockResponseOnce(async (_req) => {
            await new Promise(resolve => setTimeout(resolve, 20));
            return '';
        });
        const promise = fetch(exampleUrl, { timeout: 10 });
        await advanceTimersNTimes(1, 20);
        await expect(promise).rejects.toThrowError('Timeout');
    });

    test('检验 HTTP 响应状态', async () => {

        fetchMock.mockResponseOnce('', { status: 200 });
        await expect(fetch(exampleUrl, {
            validateStatus: (status) => status === 200,
        })).resolves.not.toThrowError();

        fetchMock.mockResponseOnce('', { status: 500 });
        await expect(fetch(exampleUrl, {
            validateStatus: (status) => status === 200,
        })).rejects.toThrowError(HTTPStatusError);

    });

    describe('重试', () => {

        test('次数', async () => {
            fetchMock.mockReject(rejectError);

            const maxAttempts = 5;
            let retries = 0;
            let beforeRetries = 0;

            await expect(fetch(exampleUrl, {
                retryOn: (currentAttempts, error, _response) => {
                    expect(error).toBe(rejectError);
                    if (currentAttempts < maxAttempts) {
                        retries++;
                        return true;
                    }
                    return false;
                },
                beforeRetry: _error => beforeRetries++,
            })).rejects.toThrowError(rejectError);
            expect(retries).toBe(maxAttempts - 1);
            expect(beforeRetries).toBe(maxAttempts - 1);
        });

        test('间隔', async () => {
            jest.useFakeTimers();
            fetchMock.mockReject(rejectError);

            const maxAttempts = 5;
            const retryDelay = 10;

            const promise = fetch(exampleUrl, {
                retryOn: (currentAttempts, _error, _response) => {
                    return currentAttempts < maxAttempts;
                },
                retryDelay,
            });

            await advanceTimersNTimes(4, retryDelay);
            await expect(promise).rejects.toThrowError(rejectError);
            expect(setTimeout).toBeCalledTimes(4);
            // @ts-expect-error `setTimeout` 实际上是 mock
            setTimeout.mock.calls.map(call => expect(call[1]).toBe(retryDelay));
        });

    });

    test('response.request', async ()=>{

        fetchMock.mockResponseOnce(async () => '');
        const init = { urlQueries: { a: '1', b: '2' } };
        const response = await fetch(exampleUrl, init);
        expect(response.request.info).toBe(exampleUrl);
        expect(response.request.init).toEqual(init);
        expect(response.request.final.info).toBe(`${exampleUrl}/?a=1&b=2`);
        expect(response.request.final.init).toEqual({});

    });

    test('综合', async () => {
        jest.useFakeTimers();

        let currentAttempts = 0;
        fetchMock.mockResponse(async (_req) => {
            currentAttempts++;

            switch (currentAttempts) {
            case 1: case 3:
                await new Promise(resolve => setTimeout(resolve, 20));
            case 2:
                return { status: 500 };
            case 4:
                throw new Error('Random error');
            case 5:
                return { status: 404 };
            }

            throw new Error('impossible');
        });

        const occurred = {
            timeout: 0,
            badStatus: 0,
            other: 0,
        };

        const promise = fetch(exampleUrl, {
            urlQueries: {
                'foo': 'bar',
            },
            validateStatus: (status) => status >= 200 && status < 300,
            timeout: 10,
            retryOn: (currentAttempts, error, _resp) => {
                let retriable = false;
                if (error === timeoutError) {
                    occurred.timeout++;
                    retriable = true;
                } else if (error instanceof HTTPStatusError) {
                    occurred.badStatus++;
                    retriable = error.status >= 500 && error.status < 600;
                } else {
                    occurred.other++;
                    retriable = true;
                }
                return currentAttempts < 5 && retriable;
            },
        });

        await advanceTimersNTimes(2, 20);
        await expect(promise).rejects.toMatchObject({ 'name': 'HTTPStatusError', 'status': 404 });
        expect(occurred).toEqual({
            timeout: 2,
            badStatus: 2,
            other: 1,
        });

    });

});