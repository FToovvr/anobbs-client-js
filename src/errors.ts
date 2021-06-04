
export class RequiresLoginException extends Error {
    constructor(message: string = "") {
        super(`操作需要登录但未登陆: ${message}`);
        this.name = 'RequiresLoginException';
    }
}
