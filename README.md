<h1 align="center">Query string to mongodb paginated aggregation</h1>

<p align="center">

<img src="https://raw.githubusercontent.com/HMarzban/q2ma/master/coverage/badge-lines.svg" alt="Coverage lines" style="max-width:100%;">

<img src="https://raw.githubusercontent.com/HMarzban/q2ma/master/coverage/badge-functions.svg" alt="Coverage functions" style="max-width:100%;">

<img src="https://raw.githubusercontent.com/HMarzban/q2ma/master/coverage/badge-branches.svg" alt="Coverage branches" style="max-width:100%;">

<img src="https://raw.githubusercontent.com/HMarzban/q2ma/master/coverage/badge-statements.svg" alt="Coverage statements" style="max-width:100%;">

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

If you need to execute a aggregation query and provide your own aggregation stages (other than pagination related stages) you can simply pass a `pipeline` option. Otherwise the paginated query is executed using `find`.

# ⛹️ Examples

### Simple Paginated Query

To run a simple paginated query on a collection (which is internally executed using `find`):

```js
const { q2ma } = require(q2ma);
const myModel = require("./model");
const queryString = "name=john&age>21&fields=name,age&sort=name,-age&offset=0&limit=10";

await q2ma(myModel, {queryString});

/* 
{
  Result: [
    {
      "_id": "23fr42tv426gv"
      "name": "john 1",
      "age": 25
    },
    {
      "_id": "ryb456ubn56un"
      "name": "john 2",
      "age": 24
    }
  ],
  Total: 10
}
*/
```
Using [query-to-mongo](https://www.npmjs.com/package/query-to-mongo) we produce the following from that `queryString`:
```js
const criteria = {
  name: 'john',
  age: { $gt: 21 }
}
const fields = {
  name: true, age: true
}
const options = {
  sort: { name: 1, age: -1 },
  offset: 10,
  limit: 10
}
```
Then `q2ma` will execute the following queries in parallel:
```js
myModel.find(criteria, projects, options)
myModel.find(criteria).count()
```

### Paginated Aggregation Query

To apply pagination on an aggregation query

```js
const { q2ma } = require(q2ma);
const myModel = require("./model");
const queryString = "age>21&fields=_id,names&sort=_id&offset=0&limit=10";
const pipelines = [
  { $group: {
    _id: "age",
    names: { $push: "$name" }
  } }
];

await q2ma(myModel, {queryString, pipelines});

/* 
{
  Result: [
    {
      "age": 24,
      "names": ["john 1"]
    },
    {
      "age": 25,
      "names": ["john 2", "susie"]
    }
  ],
  Total: 10
}
*/
```
Then `q2ma` produces and executes the following aggregation query using that `queryString` and `pipelines`:
```js
myModel.aggregate([
  { $match: { age: { $gt: 21 } } },
  { $group: {
    _id: "age",
    names: { $push: "$name" }
  } },
  { $facet: {
      total: [{ $group: { _id: "total", sum: { $sum: 1 } } }],
      pagedResult: [{ $sort: { name: 1, age: -1, _id: -1 } }, { $skip: 0 }, { $limit: 10 }, { $project: { _id: 1, names: 1 } }],
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
q2ma(collection, {options})
```

| Parameter | Format | Description | Required |
| --------- | ------ | ----------- | ------------- |
| `collection` | Object | mongo driver collection reference or mongoose model name | ✔ |
| `options` | Object | Options is an object like follow: `{ filter, project, options, pipelines, queryString, dateFields, dateFormat, matchPosition }` | ❌ |


## `options`

If you have mongodb pipelines aggregation you can use following combination:

`{pipelines, queryString, dateFields, dateFormat, matchPosition}`

| Parameter | Format | Description | Example | Default Value |
| --------- | ------ | ----------- | ------- | ------------- |
| `pipelines` | Array | --- | `[ { $unwind: 'profile.cards' } ]` | --- |
| `queryString` | String | --- | `name=john&age>21&fields=name,age&sort=name,-age&offset=10&limit=10` | --- |
| `dateFields` | String Array | --- | --- | `["createdAt", "modifiedAt", "updatedAt", "removedAt", "deletedAt", "verifiedAt", "confirmedAt", "timestamp"]` |
| `dateFormat` | String | enum `NUMBER|DATE` | --- | `DATE` |
| `matchPosition` | String | where do you want to add your custom pipelines before queryString match or after it. enum `START|END` | --- | `START` |


If your query is simple and then need some kind of filter and projection like `find` or `findOne` you can use following combination:

`{filter, project, options, queryString, dateFields, dateFormat}`

| Parameter | Format | Description | Example |  Default Value |
| --------- | ------ | ----------- | -------- | ------------- |
| `filter` | Object | like input parameter to `find/findOne` |  `{name: "Ed", 'profile.card': xx-xxx-xxx}` | --- |
| `project` | Object | like input parameter to `find/findOne` | `{profile: 1, name: 1, transaction: 1}` | ---  |
| `options` | Object | like input parameter to `find/findOne` |  `{sort: {'profile.phone': -1}, skit: 10}`  | ---  |
| `queryString` | String | like url string | `name=john&age>21&fields=name,age&sort=name,-age&offset=10&limit=10`  |  --- |
| `dateFields` | String Array | --- | `['timeAt']`  | `["createdAt", "modifiedAt", "updatedAt", "removedAt", "deletedAt", "verifiedAt", "confirmedAt", "timestamp"]` |
| `dateFormat` | String | enum `NUMBER|DATE` |  ---   | `DATE` |

NOTE: Sort default is based on _id.

# 🤝 Contributing
Contributions, issues, and feature requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

> Note: Please make sure to update tests as appropriate.

# 👋 Contact
If you have any further questions, please don’t hesitate, you can reach me by the following:
 - Twitter: [@mhossein_](https://twitter.com/mhossein_)
 - Github: [@HMarzban](https://github.com/hmarzban)
 - Email: marzban98@gmail.com


# 📝 License
This project is [Apache](https://opensource.org/licenses/Apache-2.0) licensed.
