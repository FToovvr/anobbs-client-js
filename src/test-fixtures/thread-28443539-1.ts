import _ from 'lodash';

import { ThreadPage } from "../objects";

// GET https://nmb.fastmirror.org/Api/thread?id=28443539&page=1
import _data from './thread-28443539-1-data.json';
export const data = _.cloneDeep(_data);
data.replys = data.replys.slice(0, 2);

export const expected: Omit<ThreadPage, '#repliesCache'> = {
    raw: data,

    id: 28443539,
    attachmentBase: null, attachmentExtension: null,
    createdAt: new Date('2020-07-13 08:22:38Z'), // 原始数据中时间的时区是 UTC+8，这里会转成 UTC
    userId: 'FToovvr',
    name: null, email: null, title: null,
    content: data.content,
    marked_sage: false, marked_admin: false,
    totalReplyCount: 4, boardId: 89, // 日记版
    replies: [
        {
            raw: data.replys[0],

            id: 28443653,
            attachmentBase: null, attachmentExtension: null,
            createdAt: new Date('2020-07-13 08:26:06Z'),
            userId: 'FToovvr',
            name: null, email: null, title: null,
            content: data.replys[0].content,
            marked_sage: false, marked_admin: false,
        },
        {
            raw: data.replys[1],

            id: 28445586,
            attachmentBase: '2020-07-13/5f0c2b66061bf', attachmentExtension: '.jpg',
            createdAt: new Date('2020-07-13 09:37:42Z'),
            userId: 'FToovvr',
            name: null, email: null, title: null,
            content: data.replys[1].content,
            marked_sage: false, marked_admin: false,
        },
    ],
};