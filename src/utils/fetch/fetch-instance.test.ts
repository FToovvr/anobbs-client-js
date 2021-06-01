import _ from 'lodash';

import { advanceTimersNTimes, exampleUrl, notExampleUrl } from "./test-fixtures";

import { createFetchInstance } from "./fetch-instance";
import { HTTPStatusError, timeoutError } from './errors';

import { CookieJar } from "tough-cookie";


beforeEach(() => {
    jest.resetAllMocks();
    fetchMock.resetMocks();
});

describe('fetch-instance', () => {

    test('归并参数', async () => {

        const fetchInstance = createFetchInstance({ urlQueries: { a: '1' } });

        fetchMock.mockResponseOnce(async (req) => {
            expect(req.url).toBe(`${exampleUrl}/?a=1&b=2`);
            return '';
        });
        await fetchInstance(exampleUrl, { urlQueries: { b: '2' } });

    });

    test('Base URL', async () => {
        const fetchInstance = createFetchInstance({ baseUrl: `${exampleUrl}/foo/` });
        fetchMock.mockResponseOnce(async (req) => {
            expect(req.url).toBe(`${exampleUrl}/foo/bar`);
            return '';
        });
        await fetchInstance('bar');
    });

    test('截取请求', async () => {

        const fetchInstance = createFetchInstance({
            requestInterceptor: (input, init) => {
                init = init ?? {};
                init.urlQueries = _.merge(init.urlQueries, {
                    inserted: 'value',
                });
                return [notExampleUrl, init];
            },
        });
        fetchMock.mockResponseOnce(async (req) => {
            expect(req.url).toBe(`${notExampleUrl}/?foo=bar&inserted=value`);
            expect(req.headers.get('X-Foo')).toBe('bar');
            return '';
        });
        await fetchInstance(exampleUrl, {
            headers: {
                'X-Foo': 'bar',
            },
            urlQueries: {
                foo: 'bar',
            },
        });

    });

    test('综合', async () => {
        jest.useFakeTimers();

        const jar = new CookieJar();
        jar.setCookieSync('xxx=yyy', exampleUrl);

        const random = Math.random();

        const fetchInstance = createFetchInstance({
            baseUrl: `${exampleUrl}/api/`,
            jar,
            urlQueries: {
                "answer": "42",
            },
            headers: {
                'X-Answer': '42',
            },
            requestInterceptor: (input, init)=>{
                init = init ?? {};
                init.urlQueries = init.urlQueries ?? {};
                init.urlQueries['random'] = String(random);
                return [input, init];
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

        let currentAttempts = 0;
        fetchMock.mockResponse(async (req) => {
            currentAttempts++;

            expect(req.url).toBe(`${exampleUrl}/api/somewhere?answer=42&foo=bar&random=${random}`);
            const headers = [];
            for (const [key, value] of req.headers) {
                headers.push([key, value]);
            }
            expect(headers).toEqual([
                ['x-answer', '42'],
                ['x-foo', 'bar'],
                ['cookie', 'xxx=yyy'],
            ]);

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

        const promise = fetchInstance('somewhere', {
            urlQueries: {
                'foo': 'bar',
            },
            headers: {
                'X-Foo': 'bar',
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