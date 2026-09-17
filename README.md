<h1 align="center">Query string to mongodb paginated aggregation</h1>

<p align="center">

<img src="https://raw.githubusercontent.com/unicornist/q2m/master/coverage/badge-lines.svg" alt="Historical coverage lines" style="max-width:100%;">

<img src="https://raw.githubusercontent.com/unicornist/q2m/master/coverage/badge-functions.svg" alt="Historical coverage functions" style="max-width:100%;">

<img src="https://raw.githubusercontent.com/unicornist/q2m/master/coverage/badge-branches.svg" alt="Historical coverage branches" style="max-width:100%;">

<img src="https://raw.githubusercontent.com/unicornist/q2m/master/coverage/badge-statements.svg" alt="Historical coverage statements" style="max-width:100%;">

</p>

<p align="center">

<a href="https://opensource.org/licenses/Apache-2.0" rel="nofollow">
<img src="https://img.shields.io/badge/License-Apache%202.0-blue.svg" alt="License" style="max-width:100%;"></a>

<a href="https://github.com/sheerun/prettier-standard" rel="nofollow">
    <img alt="code style: prettier" src="https://img.shields.io/badge/code_style-prettier-ff69b4.svg">
</a>

<a href="https://github.com/sheerun/prettier-standard" rel="nofollow">
<img src="https://img.shields.io/badge/code_style-standard-brightgreen.svg" alt="Standard - JavaScript Style Guide" style="max-width:100%;">
</a>

</p>

# ✍️ Introduction
The "query to mongo aggregate" (q2ma in short) is a tool to execute a mongodb paginated query (using find or aggregate) based on URI query parameters using [query-to-mongo](https://www.npmjs.com/package/query-to-mongo).

To provide aggregation stages other than pagination, pass the `pipelines` option. Otherwise the paginated query uses `find`.

## Compatibility and test status

This repository contains the historical `q2ma` 0.10.3 implementation. The npm package name is `q2ma`; the repository is [unicornist/q2m](https://github.com/unicornist/q2m).

The database examples use a connected Mongoose model. The `find` path calls `.lean()` and `.count()`, so a raw MongoDB driver collection is not a drop-in replacement. Compatibility with current Mongoose and MongoDB releases has not been verified.

The coverage badges above are committed historical reports, not live CI results. The original test setup uses Jest 25, Mongoose 5, and `mongodb-memory-server` 6. Its MongoDB driver integration file is a placeholder; it does not establish driver compatibility. Running `npm test` also regenerates `datasources/dump.json` with random sample data and can download a MongoDB binary.

# ⛹️ Examples

### Simple Paginated Query

To run a simple paginated query using a connected Mongoose model exported by `./model`:

```js
const { q2ma } = require("q2ma");
const myModel = require("./model");
const queryString = "name=john&age>21&fields=name,age&sort=name,-age&offset=0&limit=10";

async function main() {
  const { Result, Total } = await q2ma(myModel, { queryString });
  console.log(Result, Total); // Page of matching documents and total matching count.
}

main().catch(console.error);
```
Using [query-to-mongo](https://www.npmjs.com/package/query-to-mongo), `q2ma` builds these arguments from that `queryString`:
```js
const criteria = {
  name: 'john',
  age: { $gt: 21 }
}
const projects = {
  name: 1, age: 1
}
const options = {
  sort: { name: 1, age: -1, _id: -1 },
  skip: 0,
  limit: 10
}
```
Then `q2ma` will execute the following queries in parallel:
```js
myModel.find(criteria, projects, options).lean()
myModel.find(criteria).count()
```

### Paginated Aggregation Query

To apply pagination on an aggregation query

```js
const { q2ma } = require("q2ma");
const myModel = require("./model");
const queryString = "age>21&fields=_id,names&sort=_id&offset=0&limit=10";
const pipelines = [
  { $group: {
    _id: "$age",
    names: { $push: "$name" }
  } }
];

async function main() {
  const { Result, Total } = await q2ma(myModel, { queryString, pipelines });
  console.log(Result, Total); // Page of age groups and total number of groups.
}

main().catch(console.error);
```
Then `q2ma` produces and executes the following aggregation query using that `queryString` and `pipelines`:
```js
myModel.aggregate([
  { $match: { age: { $gt: 21 } } },
  { $group: {
    _id: "$age",
    names: { $push: "$name" }
  } },
  { $facet: {
      total: [{ $group: { _id: "total", sum: { $sum: 1 } } }],
      pagedResult: [{ $sort: { _id: 1 } }, { $limit: 10 }, { $project: { _id: 1, names: 1 } }],
  } }
]);
```

Note that your filters will go into a match stage before your own pipeline stages and the sorting and paging related stages goes last. To change this behavior you could pass `{matchPosition: 'END'}` in the `options`.

# 🚀 Installation

```bash
$ npm i q2ma
# or
$ yarn add q2ma
```

# 📖 Documentation

```js
q2ma(collection, options)
```

| Parameter | Format | Description | Required |
| --------- | ------ | ----------- | ------------- |
| `collection` | Object or Function | Connected Mongoose model; see compatibility notes above | ✔ |
| `options` | Object | Options is an object like follow: `{ filter, project, options, pipelines, queryString, dateFields, dateFormat, matchPosition }` | ❌ |


## `options`

If you have mongodb pipelines aggregation you can use following combination:

`{pipelines, queryString, dateFields, dateFormat, matchPosition}`

| Parameter | Format | Description | Example | Default Value |
| --------- | ------ | ----------- | ------- | ------------- |
| `pipelines` | Array | Custom aggregation stages | `[ { $unwind: '$profile.cards' } ]` | --- |
| `queryString` | String | --- | `name=john&age>21&fields=name,age&sort=name,-age&offset=10&limit=10` | --- |
| `dateFields` | String Array | --- | --- | `["createdAt", "modifiedAt", "updatedAt", "removedAt", "deletedAt", "verifiedAt", "confirmedAt", "timestamp"]` |
| `dateFormat` | String | enum `NUMBER|DATE` | --- | `DATE` |
| `matchPosition` | String | where do you want to add your custom pipelines before queryString match or after it. enum `START|END` | --- | `START` |


If your query is simple and then need some kind of filter and projection like `find` or `findOne` you can use following combination:

`{filter, project, options, queryString, dateFields, dateFormat}`

| Parameter | Format | Description | Example |  Default Value |
| --------- | ------ | ----------- | -------- | ------------- |
| `filter` | Object | like input parameter to `find` |  `{name: "Ed", 'profile.card': 'card-id'}` | --- |
| `project` | Object | like input parameter to `find/findOne` | `{profile: 1, name: 1, transaction: 1}` | ---  |
| `options` | Object | like input parameter to `find` |  `{sort: {'profile.phone': -1}, skip: 10}`  | ---  |
| `queryString` | String | like url string | `name=john&age>21&fields=name,age&sort=name,-age&offset=10&limit=10`  |  --- |
| `dateFields` | String Array | --- | `['timeAt']`  | `["createdAt", "modifiedAt", "updatedAt", "removedAt", "deletedAt", "verifiedAt", "confirmedAt", "timestamp"]` |
| `dateFormat` | String | enum `NUMBER|DATE` |  ---   | `DATE` |

NOTE: Sort default is based on _id.

# 🤝 Contributing
Created by Hossein Marzban, with contributions from Babak Khorrami. See [package.json](package.json) for author and contributor details.

Contributions, issues, and feature requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

> Note: Please make sure to update tests as appropriate.

# 👋 Contact
If you have any further questions, please don’t hesitate, you can reach me by the following:
 - Twitter: [@mhossein_](https://twitter.com/mhossein_)
 - Github: [@HMarzban](https://github.com/hmarzban)
 - Email: marzban98@gmail.com


# 📝 License
This project is [Apache](https://opensource.org/licenses/Apache-2.0) licensed.
