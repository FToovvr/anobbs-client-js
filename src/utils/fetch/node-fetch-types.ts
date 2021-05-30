import nodeFetch from 'node-fetch';

export type NodeFetchRequestInfo = Parameters<typeof nodeFetch>[0];
export type NodeFetchRequestInit = NonNullable<Parameters<typeof nodeFetch>[1]>;
export type NodeFetchReturn = ReturnType<typeof nodeFetch>;