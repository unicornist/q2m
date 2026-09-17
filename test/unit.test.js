const { describe, it } = require("node:test")
const assert = require("node:assert/strict")
const { ObjectID } = require("bson")
const { dateConvert, normalizeCriteria, q2mPipelines, findQueryBuilder, isEmpty } = require("../q2ma")

describe("isEmpty", () => {
	it("identifies an empty plain object", () => assert.equal(isEmpty({}), true))
	it("rejects non-empty objects", () => assert.equal(isEmpty({ name: "Bob" }), false))
	it("rejects functions and dates", () => {
		assert.equal(
			isEmpty(() => {}),
			false,
		)
		assert.equal(isEmpty(new Date()), false)
	})
})

describe("dateConvert", () => {
	it("converts an ISO string to a date", () => assert.deepEqual(dateConvert("2020-10-20", "DATE"), new Date("2020-10-20")))
	it("keeps numeric timestamps in NUMBER mode", () => assert.equal(dateConvert(1593330164836, "NUMBER"), 1593330164836))
	it("defaults to DATE mode", () => assert.deepEqual(dateConvert("2020-10-20"), new Date("2020-10-20")))
	it("keeps an existing object", () => {
		const input = { createdAt: "2020-10-20" }
		assert.equal(dateConvert(input), input)
	})
})

describe("normalizeCriteria", () => {
	it("converts an id with the existing public BSON type", () => {
		const result = normalizeCriteria({ _id: "5e4d0c3586eb0cf4406fe5b1" })
		assert.ok(result._id instanceof ObjectID)
		assert.equal(result._id.toHexString(), "5e4d0c3586eb0cf4406fe5b1")
	})
	it("converts an id in a dotted path", () => {
		const result = normalizeCriteria({ "profile._id": "5e4d0c3586eb0cf4406fe5b1" })
		assert.equal(result["profile._id"].toHexString(), "5e4d0c3586eb0cf4406fe5b1")
	})
	it("converts nested ids", () => {
		const result = normalizeCriteria({ cards: { _id: "5e4d0c3586eb0cf4406fe5b1" } })
		assert.equal(result.cards._id.toHexString(), "5e4d0c3586eb0cf4406fe5b1")
	})
	it("normalizes nested dates and comparison operators", () => {
		const result = normalizeCriteria({ profile: { createdAt: "2040-01-17", data: { createdAt: "2010-01-17" } }, createdAt: { $gte: "2020-02-17", $lte: "2021-02-17" } })
		assert.deepEqual(result, {
			profile: { createdAt: new Date("2040-01-17"), data: { createdAt: new Date("2010-01-17") } },
			createdAt: { $gte: new Date("2020-02-17"), $lte: new Date("2021-02-17") },
		})
	})
	it("leaves dotted date fields alone unless explicitly named", () => {
		const result = normalizeCriteria({ confirmedAt: 1593330164836, "profile.createdAt": "2020-01-01" })
		assert.deepEqual(result, { confirmedAt: new Date(1593330164836), "profile.createdAt": "2020-01-01" })
	})
	it("uses custom date fields and numeric dates", () => {
		const result = normalizeCriteria({ "profile.createdAt": "2020-01-01", createdAt: "2020-01-01" }, { dateFields: ["profile.createdAt"], dateFormat: "NUMBER" })
		assert.deepEqual(result, { "profile.createdAt": Date.parse("2020-01-01"), createdAt: "2020-01-01" })
	})
	it("preserves nulls, including date fields", () => {
		assert.deepEqual(normalizeCriteria({ name: "null", createdAt: "null", deletedAt: null }), { name: null, createdAt: null, deletedAt: null })
	})
})

describe("q2mPipelines", () => {
	it("builds the exact filter and pagination facet", () => {
		const result = q2mPipelines({ queryString: "name=john&age>21&fields=name,age&sort=name,-age&offset=10&limit=10" })
		assert.deepEqual(result, [
			{ $match: { name: "john", age: { $gt: 21 } } },
			{
				$facet: {
					total: [{ $group: { _id: "total", sum: { $sum: 1 } } }],
					pagedResult: [{ $sort: { name: 1, age: -1, _id: -1 } }, { $skip: 10 }, { $limit: 10 }, { $project: { name: 1, age: 1 } }],
				},
			},
		])
	})
	it("keeps the public helper's existing ObjectId behavior", () => {
		const result = q2mPipelines({ queryString: "_id=5e4d0c3586eb0cf4406fe5b1" })
		assert.ok(result[0].$match._id instanceof ObjectID)
	})
})

describe("findQueryBuilder", () => {
	it("builds the exact find arguments", () => {
		assert.deepEqual(findQueryBuilder({ queryString: "name=john&age>21&fields=name,age&sort=name,-age&offset=10&limit=10" }), {
			criteria: { name: "john", age: { $gt: 21 } },
			projects: { name: 1, age: 1 },
			options: { sort: { name: 1, age: -1, _id: -1 }, skip: 10, limit: 10 },
		})
	})
	it("merges explicit filters, projections, and sort options", () => {
		const result = findQueryBuilder({
			queryString: "name=john&age>21&fields=name,age&sort=name,-age&offset=10&limit=10",
			filter: { lastName: "Bell" },
			project: { name: 1, lastName: 1, _id: 1, phone: 1 },
			option: { sort: { phone: -1, _id: 1 } },
		})
		assert.deepEqual(result, {
			criteria: { name: "john", age: { $gt: 21 }, lastName: "Bell" },
			projects: { name: 1, lastName: 1, _id: 1, phone: 1, age: 1 },
			options: { sort: { name: 1, age: -1, phone: -1, _id: 1 }, skip: 10, limit: 10 },
		})
	})
})
