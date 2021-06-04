export function createOptionsResolver<T extends { [key: string]: unknown }>(_chain: (T | null)[]): T {

    const chain = _chain.flatMap(x => x ? [x]: []);

    return new Proxy({}, {
        get(_, property) {
            for (let i = chain.length - 1; i >= 0; i--) {
                if (Object.prototype.hasOwnProperty.call(chain[i], property)) {
                    return chain[i][property as string];
                }
            }
            return undefined;
        },
    }) as T;

}