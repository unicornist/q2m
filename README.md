<h1 align="center">Query string to mongodb aggregation</h1>

<p align="center">
<a href="https://opensource.org/licenses/Apache-2.0" rel="nofollow">
<img src="https://img.shields.io/badge/License-Apache%202.0-blue.svg" alt="License" style="max-width:100%;"></a>

<a href="https://github.com/sheerun/prettier-standard" rel="nofollow">
    <img alt="code style: prettier" src="https://img.shields.io/badge/code_style-prettier-ff69b4.svg">
</a>

<a href="https://github.com/sheerun/prettier-standard" rel="nofollow">
<img src="https://img.shields.io/badge/code_style-standard-brightgreen.svg" alt="Standard - JavaScript Style Guide" style="max-width:100%;">
</a>


<img src="./coverage/badge-lines.svg" alt="Coverage lines" data-canonical-src="./coverage/badge-lines.svg" style="max-width:100%;">

<img src="./coverage/badge-functions.svg" alt="Coverage functions" data-canonical-src="./coverage/badge-functions.svg" style="max-width:100%;">


<img src="./coverage/badge-branches.svg" alt="Coverage branches" data-canonical-src="./coverage/badge-branches.svg" style="max-width:100%;">

<img src="./coverage/badge-statements.svg" alt="Coverage statements" data-canonical-src="./coverage/badge-statements.svg" style="max-width:100%;">
</p>

# q2ma 
> Note: I will up to date README.md as soon as I finish the test case.

Mongodb auto Pagination

# 🚀 Installation - Usage

### installation
```bash
$ npm i q2ma
# or
$ yarn q2ma
```

### Usage

```js
const { q2ma } = require(q2ma);
const collectionName = require("./modal");
const queryString = "name=john&age>21&fields=name,age&sort=name,-age&offset=0&limit=10";
const result = await q2ma(collectionName, {queryString});

// Output schema
/*
{
"Total": 130,
 "Result": [
   {...collection Schema} * 10
 ]
}
*/

```

# 🤝 Contributing
Contributions, issues, and feature requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

> Note: Please make sure to update tests as appropriate.

# 👋Contact
If you have any further questions, please don’t hesitate, you can reach me by the following:
 - Twitter: [@mhossein_](https://twitter.com/mhossein_)
 - Github: [@HMarzban](https://github.com/hmarzban)
 - Email: marzban98@gmail.com


# 📝 License
This project is [Apache](https://opensource.org/licenses/Apache-2.0) licensed.

> Inspire and use [query-to-mongo](https://www.npmjs.com/package/query-to-mongo)

[![JavaScript Style Guide](https://cdn.rawgit.com/standard/standard/master/badge.svg)](https://github.com/standard/standard)