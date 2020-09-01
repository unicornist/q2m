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

    if (obj[key] === "null") obj[key] = null

		// recursive fields check
		if (typeof obj[key] === "object") normalizeCriteria(obj[key], { dateFields, dateFormat })

		// normalize Date format for custom Date fields
		if (dateFields.includes(key)) obj[key] = dateConvert(obj[key], dateFormat)

		if (typeof obj[key] === "object" && dateFields.includes(key)) Object.keys(obj[key]).forEach(val => (obj[key][val] = dateConvert(obj[key][val], dateFormat)))

		// convert _id preserve default id of mongodb to objectID
		// this convert needed just for most mongo driver except mongoose ORM
		if (key.includes("_id") && typeof obj[key] !== "object") obj[key] = new bson.ObjectID(obj[key])
	}
	return obj
}

/**
 * @param {object} options
 * @param {object} options.pipelines      - predefined/custom mongodb aggregation pipelines
 * @param {string} options.queryString    - url query string
 * @param {string} options.dateFields     - @default defaultDateFieldNames
 * @param {string} options.dateFormat     - @enum ('DATE'|'NUMBER') - the data type of query string of element in mongodb
 * @param {string} options.matchPosition  - @enum ('START'|'END')   - append q2m filter before("START") or after("END") of custom pipelines
 * @returns {Array<Object>} mongodb pipelines aggregation
 */
function q2mPipelines ({ pipelines, queryString, dateFields, dateFormat, matchPosition = "START" }) {
	let newPipelines = []
	let {
		criteria: filter = {},
		options: { fields, sort = {}, skip = 0, limit = 10 },
	} = q2m(queryString)
	filter = normalizeCriteria(filter, { dateFields, dateFormat })

	if (matchPosition === "START" && !isEmpty(filter)) newPipelines.push({ $match: filter })

	if (pipelines) newPipelines = [...newPipelines, ...pipelines]

	if (matchPosition === "END" && !isEmpty(filter)) newPipelines.push({ $match: filter })

	const facetPipLines = {
		$facet: {
			total: [{ $group: { _id: "total", sum: { $sum: 1 } } }],
			pagedResult: [],
		},
	}

	// Default sort base on _id with the -1, that's mean descending! :)
	if (!Object.prototype.hasOwnProperty.call(sort, "_id")) Object.assign(sort, { _id: -1 })

	if (sort) facetPipLines.$facet.pagedResult.push({ $sort: sort })

	if (skip) facetPipLines.$facet.pagedResult.push({ $skip: skip })

	if (limit) facetPipLines.$facet.pagedResult.push({ $limit: limit })

	if (fields) facetPipLines.$facet.pagedResult.push({ $project: fields })

	newPipelines = [...newPipelines, facetPipLines]
	return newPipelines
}

/**
 *
 * @param {object} options
 * @param {object} options.filter
 * @param {object} options.project
 * @param {object} options.option
 * @param {String} options.queryString
 * @param {(Array|String)} options.dateFields
 * @param {String} options.dateFormat
 * @returns {object} {criteria, projects, options}
 */
const findQueryBuilder = ({ filter, project = {}, option = {}, queryString, dateFields, dateFormat }) => {
	let {
		criteria = {},
		options: { fields = {}, sort = {}, skip = 0, limit = 20 },
	} = q2m(queryString)

	if (option.limit) limit = option.limit
	if (option.skip) skip = option.skip

	if (!option.sort) option.sort = {}
	sort = Object.assign(sort, option.sort)

	criteria = normalizeCriteria(criteria, { dateFields, dateFormat })
	// priority of merge Object are with backend not querystring
	criteria = Object.assign(criteria, filter)
	project = Object.assign(project, fields)
	option = Object.assign(option, { sort }, { skip }, { limit })

	if (!Object.prototype.hasOwnProperty.call(sort, "_id")) Object.assign(sort, { _id: -1 })

	return { criteria, projects: project, options: option }
}

/**
 *
 * @param {object} collectionName
 * @param {object} pagedPipelines
 * @returns {Promise} {Result, Total}
 */
const pagedAggregate = async (collectionName, pagedPipelines) => {
	const result = await collectionName.aggregate(pagedPipelines).catch(error => {
		throw new Error({ code: "EXCEPTION", detail: { pagedPipelines }, message: "error on pagedAggregate", innerException: error })
	})

	if (!(result[0] && result[0].pagedResult) || !(result[0] && result[0].total.length && Object.prototype.hasOwnProperty.call(result[0].total[0], "sum")))
		return { Total: 0, Result: [] }

	return { Result: result[0].pagedResult, Total: result[0].total[0].sum }
}

/**
 *
 * @param {object} filter
 * @param {object} project
 * @param {object} option
 * @param {string} queryString
 * @param {array} dateFields
 * @param {string} dateFormat
 * @param {(object|function)} dbCollection
 * @returns {Promise} {Result, Total}
 */
const pagedFind = async (filter, project = {}, option = {}, queryString, dateFields, dateFormat, dbCollection) => {
	const { criteria, projects, options } = findQueryBuilder({ filter, project, option, queryString, dateFields, dateFormat })
	const [pagedResult, sum] = await Promise.all([dbCollection.find(criteria, projects, options).lean(), dbCollection.find(criteria).count()]).catch(error => {
		throw new Error({ code: "EXCEPTION", detail: { filter, project, option }, message: "error on pagedFind", innerException: error })
	})

	return { Result: pagedResult, Total: sum }
}

/**
 *
 * @param {object | function} collection
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
const q2ma = (collection, { filter, project, options, pipelines, queryString, dateFields, dateFormat, matchPosition = "START" } = {}) => {
	try {
		if (!collection) throw new Error({ code: "MISSING_PARAM", detail: { collection }, message: "collection name does not specify" })
		if (pipelines) {
			const newPipelines = q2mPipelines({ pipelines, queryString, dateFields, dateFormat, matchPosition })
			return pagedAggregate(collection, newPipelines)
		} else {
			return pagedFind(filter, project, options, queryString, dateFields, dateFormat, collection)
		}
	} catch (error) {
		throw new Error({ code: "EXCEPTION", detail: { pipelines }, message: "error on q2ma", innerException: error })
	}
}

module.exports = {
	isEmpty,
	dateConvert,
	normalizeCriteria,
	pagedAggregate,
	q2mPipelines,
	findQueryBuilder,
	pagedFind,
	q2ma,
	q2m,
}
