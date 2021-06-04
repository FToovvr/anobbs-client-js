import dateFns from 'date-fns';
import { zonedTimeToUtc } from 'date-fns-tz';

export interface PostRaw {
    id: string;
    img: string;
    ext: string;
    now: string;
    userid: string;
    name: string;
    email: string;
    title: string;
    content: string;
    sage: string;
    admin: string;
}

export class Post {
    raw: PostRaw;

    constructor(raw: PostRaw) {
        this.raw = raw;
    }

    get id(): number {
        return Number(this.raw.id);
    }

    get attachmentBase(): string | null {
        return this.raw['img'] !== "" ? this.raw.img : null;
    }

    get attachmentExtension(): string | null {
        return this.raw['ext'] !== "" ? this.raw.ext : null;
    }

    static parseDateText(text: string): Date {
        const g = /^(.*?)\(.\)(.*?)$/.exec(text);
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const localDate = dateFns.parse(`${g![1]} ${g![2]}`, 'Y-MM-dd HH:mm:ss', new Date(0));
        return zonedTimeToUtc(localDate, 'Asia/Shanghai');
    }

    get createdAt(): Date {
        return Post.parseDateText(this.raw.now);
    }

    get userId(): string {
        return this.raw.userid;
    }

    get name(): string | null {
        return this.raw.name !== "无名氏" ? this.raw.name : null;
    }

    get email(): string | null {
        return this.raw.name !== "" ? this.raw.email : null;
    }

    get title(): string | null {
        return this.raw.name !== "无标题" ? this.raw.title : null;
    }

    get content(): string {
        return this.raw.content;
    }

    get marked_sage(): boolean {
        return this.raw.sage !== '0';
    }

    get marked_admin(): boolean {
        return this.raw.admin !== '0';
    }

}

export interface ThreadBodyRaw extends PostRaw {
    replyCount: string;
    fid?: string;
}

/**
 * 串首。
 */
export class ThreadBody extends Post {
    raw: ThreadBodyRaw;

    constructor(raw: ThreadBodyRaw) {
        super(raw);
        this.raw = raw;
    }

    get totalReplyCount(): number {
        return Number(this.raw.replyCount);
    }

    /**
     * XXX: 在串内容页、时间线页中的串首中存在，但在版块页中的串首中不存在。
     */
    get boardId(): number | null {
        return typeof this.raw.fid !== 'undefined' ? Number(this.raw.fid) : null;
    }

}

export interface ThreadPageRaw extends ThreadBodyRaw {
    replys: PostRaw[];
}

/**
 * 串首 + 回应。
 *
 * `/Api/thread?…` 返回的内容的类型
 */
export class ThreadPage extends ThreadBody {
    raw: ThreadPageRaw;

    _repliesCache: Post[] | null = null;

    constructor(raw: ThreadPageRaw) {
        super(raw);
        this.raw = raw;
    }

    get replies(): Post[] {
        if (!this._repliesCache) {
            this._repliesCache = this.raw.replys.map(postRaw => new Post(postRaw));
        }
        return this._repliesCache;
    }

}

export class BoardThread extends ThreadPage {

    get lastModifiedTime(): Date {
        if (this.replies.length === 0) {
            return this.createdAt;
        }
        return this.replies[this.replies.length-1].createdAt;
    }

}