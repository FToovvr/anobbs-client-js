
export class RequiresLoginException extends Error {
    constructor(message: string = "") {
        super(`操作需要登录但未登陆: ${message}`);
    }
}

export class GatekeptException extends Error {
    constructor({
        message, context,
        currentPageNumber,
        lastAccessiblePostId,
    }: {
        message?: string, context?: string,
        currentPageNumber?: number,
        lastAccessiblePostId?: number,
    }) {
        let fullMessage = "检测到卡页";
        const extraMessages = [];
        if (context) {
            extraMessages.push("上下文: " + context);
        }
        if (currentPageNumber != undefined) {
            extraMessages.push("发生卡页现象的页数: " + currentPageNumber);
        }
        if (lastAccessiblePostId != undefined) {
            extraMessages.push("最后可访问到的回应/主串的串号: " + lastAccessiblePostId);
        }
        if (extraMessages.length > 0) {
            fullMessage += (' (' + extraMessages.join(', ') + ')');
        }
        if (message) {
            fullMessage += ': ' + message;
        }
        super(fullMessage);
    }
}

export class ApiException extends Error {

    rawText: string;

    constructor(rawText: string) {
        super(`API 异常: ${rawText}`);
        this.rawText = rawText;
    }

}

export class ThreadNotExistsException extends ApiException {}

export function throwApiException(rawText: string): never {
    switch (rawText) {
    case '该主题不存在':
        throw new ThreadNotExistsException(rawText);
    default:
        throw new ApiException(rawText);
    }
}