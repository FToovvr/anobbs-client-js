import { createOptionsResolver } from "./options-resolver";

test('options-resolver', () => {

    interface Options {
        [key: string]: unknown;
        foo?: string;
        bar?: unknown;
        baz?: string[];
        no?: boolean;
    }

    const resolver = createOptionsResolver<Options>([
        { foo: 'foo', bar: 'bar', baz: ['hello'] },
        null,
        { bar: { 1234: 5678 } },
        { baz: ['world'] },
    ]);

    expect(resolver.foo).toBe('foo');
    expect(resolver.bar).toEqual({ 1234:5678 });
    expect(resolver.baz).toEqual(['world']);
    expect(resolver.no).toBeUndefined;

});