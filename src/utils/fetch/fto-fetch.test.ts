import fetchMock from 'jest-fetch-mock';
import { advanceTimersNTimes, exampleUrl, rejectError } from './test-fixtures';

import { fetch } from './fto-fetch';
import { HTTPStatusError, timeoutError } from './errors';

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

    test('超时', async () => {
        jest.useFakeTimers();
        fetchMock.mockResponseOnce(async (_req) => {
            await new Promise(resolve => setTimeout(resolve, 20));
            return '';
        });
        const promise = fetch(exampleUrl, { timeout: 10 });
        jest.advanceTimersByTime(20);
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

            await expect(fetch(exampleUrl, {
                retryOn: (currentAttempts, error, _response) => {
                    expect(error).toBe(rejectError);
                    if (currentAttempts < maxAttempts) {
                        retries++;
                        return true;
                    }
                    return false;
                },
            })).rejects.toThrowError(rejectError);
            expect(retries).toBe(maxAttempts - 1);
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