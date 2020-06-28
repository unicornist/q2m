const q2m = require("query-to-mongo")
const bson = require("bson")

const defaultDateFieldNames = ["createdAt", "modifiedAt", "updatedAt", "removedAt", "deletedAt", "verifiedAt", "confirmedAt", "timestamp"]
const isEmpty = data => Object.entries(data).length === 0 && data.constructor === Object

/**
 *
 * @param {string | number} dateValue @typedef Date
 * @param {string} dateFormat @enum ('DATE'|'NUMBER')
 */
const dateConvert = (dateValue, dateFormat = "DATE") => {
	if (typeof dateValue === "string" || typeof dateValue === "number") {
		const newDate = new Date(dateValue)
		return dateFormat === "NUMBER" ? newDate.getTime() : newDate
	}
	return dateValue
}

/**
 *
 * @param {object} obj
 * @param {object} options
 * @param {Array} options.dateFields
 * @param {string} options.dateFormat
 */
function normalizeCriteria (obj, { dateFields = defaultDateFieldNames, dateFormat } = {}) {
	for (const key in obj) {
		// recursive fileds check
		if (typeof obj[key] === "object") normalizeCriteria(obj[key], { dateFields, dateFormat })

		// normilize Date format for custom Date fields
		if (dateFields.includes(key)) obj[key] = dateConvert(obj[key], dateFormat)

		if (typeof obj[key] === "object" && dateFields.includes(key)) Object.keys(obj[key]).forEach(val => (obj[key][val] = dateConvert(obj[key][val], dateFormat)))

		// convert _id preserve defualt id of mongodb to objectID
		// this convert needed just for most mongodrivere exept mongoose ORM
		if (key.includes("_id") && typeof obj[key] !== "object") obj[key] = new bson.ObjectID(obj[key])
	}
	return obj
}

/**
 *
 * @param {object} pipelines      - predefined/custom mongodb aggregation pipelines
 * @param {string} queryString    - url query string
 * @param {string} dateFields     - @default defaultDateFieldNames
 * @param {string} dateFormat     - @enum ('DATE'|'NUMBER') - the data type of query string of element in mongodb
 * @param {string} matchPosition  - @enum ('START'|'END')   - append q2m filter before("START") or after("END") of custom pipelines
 */
function q2mPipelines ({ pipelines, queryString, dateFields, dateFormat, matchPosition = "START" }) {
	let newPiplines = []
	let {
		criteria: filter = {},
		options: { fields, sort = {}, skip = 0, limit = 10 },
	} = q2m(queryString)
	filter = normalizeCriteria(filter, { dateFields, dateFormat })

	if (matchPosition === "START" && !isEmpty(filter)) newPiplines.push({ $match: filter })

	if (pipelines) newPiplines = [...newPiplines, ...pipelines]

	if (matchPosition === "END" && !isEmpty(filter)) newPiplines.push({ $match: filter })

	const facetPipLines = {
		$facet: {
			total: [{ $group: { _id: "total", sum: { $sum: 1 } } }],
			pagedResult: [],
		},
	}

	// Defualt sort base on _id with the -1, that's mean descending! :)
	if (!Object.prototype.hasOwnProperty.call(sort, "_id")) Object.assign(sort, { _id: -1 })

	if (sort) facetPipLines.$facet.pagedResult.push({ $sort: sort })

	if (skip) facetPipLines.$facet.pagedResult.push({ $skip: skip })

	if (limit) facetPipLines.$facet.pagedResult.push({ $limit: limit })

	if (fields) facetPipLines.$facet.pagedResult.push({ $project: fields })

	newPiplines = [...newPiplines, facetPipLines]

	return newPiplines
}

/**
 *
 * @param {*} collectionName
 * @param {*} pagedPipelines
 */
const pagedAggregate = async (collectionName, pagedPipelines) => {
	try {
		const result = await collectionName.aggregate(pagedPipelines)

		if (!(result[0] && result[0].pagedResult) || !(result[0] && result[0].total.length && Object.prototype.hasOwnProperty.call(result[0].total[0], "sum")))
			return { Total: 0, Result: [] }

		return { Result: result[0].pagedResult, Total: result[0].total[0].sum }
	} catch (error) {
		throw new Error({ code: "EXCEPTION", detail: { pagedPipelines }, message: "error on pagedAggregate", innerException: error })
	}
}

/**
 *
 * @param {object} filter
 * @param {object} project
 * @param {object} option
 * @param {string} queryString
 * @param {array} dateFields
 * @param {string} dateFormat
 * @param {object | function} dbCollection
 */
const pagedFind = async (filter, project = {}, option = {}, queryString, dateFields, dateFormat, dbCollection) => {
	let {
		criteria = {},
		options: { fields = {}, sort = {}, skip = 0, limit = 20 },
	} = q2m(queryString)

	if (!option.sort) option.sort = {}
	sort = Object.assign(sort, option.sort)

	criteria = normalizeCriteria(criteria, { dateFields, dateFormat })
	// priority of merge Object are with backend not querystring
	criteria = Object.assign(criteria, filter)
	project = Object.assign(project, fields)
	option = Object.assign(option, { sort }, { skip }, { limit })

	if (Object.prototype.hasOwnProperty.call(sort, "_id")) Object.assign(sort, { _id: -1 })

	const [pagedResult, sum] = await Promise.all([dbCollection.find(criteria, project, option).lean(), dbCollection.find(criteria).count()])

	return { Result: pagedResult, Total: sum }
}

/**
 *
 * @param {object} options
 * @param {object} options.filter
 * @param {object} options.project
 * @param {object} options.options
 * @param {object} options.pipelines
 * @param {string} options.queryString
 * @param {array} options.dateFields
 * @param {string} options.dateFormat
 * @param {string} options.matchPosition
 * @param {object | function} options.collection
 */
const q2ma = (collection, { filter, project, options, pipelines, queryString, dateFields, dateFormat, matchPosition = "START" }) => {
	try {
		if (!collection) throw new Error({ code: "MISSING_PARAM", detail: { collection }, message: "collection name does not specify" })
		if (pipelines) {
			const newPiplines = q2mPipelines({ pipelines, queryString, dateFields, dateFormat, matchPosition })
			return pagedAggregate(collection, newPiplines)
		} else {
			return pagedFind(filter, project, options, queryString, dateFields, dateFormat, collection)
		}
	} catch (error) {
		throw new Error({ code: "EXCEPTION", detail: { pipelines }, message: "error on q2ma", innerException: error })
	}
}

module.exports = {
	dateConvert,
	normalizeCriteria,
	pagedAggregate,
	q2mPipelines,
	pagedFind,
	q2ma,
	q2m,
}
