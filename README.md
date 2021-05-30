# AnoBBS Client for Node.js

注：本库适用于 Node.js 运行环境，目前不考虑支持浏览器环境。

## 测试

`npm run test`

## 备注

* `node-fetch` `@3` 一直没出正式版，选用 `@3.0.0-beta.9`

* `jest-fetch-mock` 于 2020 年 5 月修复了 `DOMException is not defined` 的问题，
    但是至今都未在 npm 发布修复后的版本，因此这里选用了此时最新的 commit。