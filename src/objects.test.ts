import _ from 'lodash';

import { Post } from './objects';

import { createClient } from './test-fixtures/helpers';
import * as threadFixture from './test-fixtures/thread-28443539-1';
import * as boardFixture from './test-fixtures/board-30-1';

beforeEach(() => {
    jest.resetAllMocks();
    fetchMock.resetMocks();
});

function expectPostToEqual<T extends Post>(post: T, expected: Record<string, unknown>) {
    for (const [key, value] of Object.entries(expected)) {
        if (key === 'replies') {
            expect(post).toHaveProperty('replies');
            // @ts-expect-error 没问题
            expect(post.replies.length).toBe(expected.replies.length);
            // @ts-expect-error 没问题
            _.zip(post.replies, expected.replies).map(x => expectPostToEqual(x[0], x[1]));
        } else {
            // @ts-expect-error 没问题
            expect(post[key]).toEqual(value);
        }
    }
}

test('ThreadPage', async () => {
    const client = createClient(true);

    fetchMock.mockResponseOnce(async (_) => {
        return JSON.stringify(threadFixture.data);
    });

    const { data: page } = await client.getThreadPage({ threadId: Number(threadFixture.data.id) });

    expectPostToEqual(page, threadFixture.expected);

});

test('BoardThread', async () => {
    const client = createClient(true);

    fetchMock.mockResponseOnce(async (_) => {
        return JSON.stringify(boardFixture.data);
    });

    const { data: page } = await client.getBoardPage({ boardId: 30 });

    // @ts-expect-error 没问题
    _.zip(page, boardFixture.expected).map(x => expectPostToEqual(x[0], x[1]));

});