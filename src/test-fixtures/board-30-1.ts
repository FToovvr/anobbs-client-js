import { BoardThread } from '../objects';

// GET https://nmb.fastmirror.org/Api/showf?id=30&page=1
// 30: 技术版
import _data from './board-30-1-data.json';
export const data = _data.slice(0, 1);

export const expected: Omit<BoardThread, '#repliesCache'> [] = [
    {
        raw: data[0],

        id: 38669111,
        attachmentBase: null, attachmentExtension: null,
        createdAt: new Date('2021-06-05 08:42:06Z'),
        userId: "MEFBABA",
        name: null, email: null, title: null,
        content: data[0].content,
        marked_sage: false, marked_admin: false,
        totalReplyCount: 2, boardId: null,
        replies: [
            {
                raw: data[0].replys[0],

                id: 38669281,
                attachmentBase: null, attachmentExtension: null,
                createdAt: new Date('2021-06-05 08:47:05Z'),
                userId: "ZlVWfwA",
                name: null, email: null, title: null,
                content: data[0].replys[0].content,
                marked_sage: false, marked_admin: false,
            },
            {
                raw: data[0].replys[1],

                id: 38669433,
                attachmentBase: null, attachmentExtension: null,
                createdAt: new Date('2021-06-05 08:51:47Z'),
                userId: "MEFBABA",
                name: null, email: null, title: null,
                content: data[0].replys[1].content,
                marked_sage: false, marked_admin: false,
            },
        ],
        lastModifiedTime: new Date('2021-06-05 08:51:47Z'),
    },
];