import { createOptionsResolver, createOptionsResolverWithDefaults } from "./options-resolver";

describe('options-resolver', () => {

    test('createOptionsResolver', () => {

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

    test('createOptionsResolverWithDefaults', () => {

        interface Options {
            [key: string]: unknown;
            foo?: string;
            bar?: unknown;
        }

        const resolver = createOptionsResolverWithDefaults<Options>([
            { foo: 'foo' },
        ], { foo: 'default_foo', bar: 42 });

        expect(resolver.foo).toBe('foo');
        expect(resolver.bar).toBe(42);

    });

});