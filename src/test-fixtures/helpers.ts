import { UserCookie } from "../BaseClient";
import { Client, Options } from '../Client';

import clientData from './client-secrets.test.json';

export function createClient(withUser: boolean, options?: Options): Client {
    return new Client({
        userAgent: clientData.client['user-agent'],
        host: clientData.host,
        appid: clientData.client.appid,
        user: withUser ? new UserCookie({
            userhash: clientData.user.userhash,
        }) : null,
        fallbackOptions: options ?? null,
    });
}