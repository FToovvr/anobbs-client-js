import { Post, ThreadPage } from './objects';

import data, { expected } from './test-fixtures/thread-28443539-1';

test('ThreadPage', async () => {
    const page = new ThreadPage(data);

    function compare<T extends Post>(post: T, expected: Record<string, unknown>) {
        for (const [key, value] of Object.entries(expected)) {
            if (key === 'replies') {
                expect(post).toHaveProperty('replies');
                // @ts-expect-error 没问题
                expect(post.replies.length).toBe(expected.replies.length);
                // @ts-expect-error 没问题
                for (let i = 0; i < post.replies.length; i++) {
                    // @ts-expect-error 没问题
                    compare(post.replies[i], expected.replies[i]);
                }
            } else {
                // @ts-expect-error 没问题
                expect(post[key]).toEqual(value);
            }

        }
    }
    compare(page, expected);

});