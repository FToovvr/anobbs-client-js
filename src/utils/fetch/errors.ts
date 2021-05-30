export const timeoutError = (() => {
    const error = new Error('Timeout');
    error.name = 'NetworkError';
    return error;
})();

export class HTTPStatusError extends Error {

    status: number;
    statusText: string;

    constructor({
        message,
        status, statusText,
    }: {
        message?: string;
        status: number; statusText: string
    }) {
        super(message);
        this.name = 'HTTPStatusError';
        this.status = status;
        this.statusText = statusText;
    }

}