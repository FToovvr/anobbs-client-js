# AnoBBS Client for Node.js

[![GitHub license](https://img.shields.io/github/license/FToovvr/anobbs-client-js.svg)](https://github.com/FToovvr/anobbs-client-js/blob/master/LICENSE)
[![NPM version](https://img.shields.io/npm/v/anobbs-client)](http://npmjs.com/package/anobbs-client)
[![GitHub issues](https://img.shields.io/github/issues/FToovvr/anobbs-client-js.svg)](https://GitHub.com/FToovvr/anobbs-client-js/issues/)

注：本库适用于 Node.js 运行环境，目前不考虑支持浏览器环境。

## 测试

`npm run test`

部分需要实际请求服务器的测试项需要在项目 `src/test-fixtures` 中包含 `client-secrets.test.json` 才能运行，内容格式如下：

``` jsonc
// 注：实际文件中不能存在注释
{
    "host": "adnmb3.com", // 或其他可用的 A 岛主机名

    "client": {
        "user-agent": "…", // User-Agent
        "appid": "…" // appid，可为空
    },

    "user": {
        "userhash": "…" // 饼干值
    }
}
```

## 备注

* `node-fetch` `@3` 一直没出正式版，选用 `@3.0.0-beta.9`

* `jest-fetch-mock` 于 2020 年 5 月修复了 `DOMException is not defined` 的问题，
    但是至今都未在 npm 发布修复后的版本，因此这里选用了此时最新的 commit。