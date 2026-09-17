const { describe, it, before, after } = require("node:test")
const assert = require("node:assert/strict")
const mongoose = require("mongoose")
const dbHandler = require("../datasources/mongoose")
const users = require("../datasources/user.model")
const fixtures = require("../datasources/fixtures")
const { q2ma } = require("..")

before(async () => {
	await dbHandler.connect()
	await users.insertMany(fixtures)
})

after(async () => dbHandler.closeDatabase())

const names = result => result.Result.map(user => user.profile.name)

describe("q2ma with a connected Mongoose model", () => {
	it("requires a model", () => {
		assert.throws(() => q2ma())
	})

	it("returns 20 plain documents by default and the full count", async () => {
		const result = await q2ma(users)
		assert.equal(result.Total, 30)
		assert.equal(result.Result.length, 20)
		assert.ok(!(result.Result[0] instanceof mongoose.Document))
		assert.deepEqual(
			names(result),
			fixtures
				.slice(10)
				.reverse()
				.map(user => user.profile.name),
		)
	})

	it("sorts and pages query-string results without limiting the total", async () => {
		const result = await q2ma(users, { queryString: "sort=profile.name&limit=4&offset=2" })
		assert.deepEqual(names(result), ["User 02", "User 03", "User 04", "User 05"])
		assert.equal(result.Total, 30)
	})

	it("sorts and pages explicit find options", async () => {
		const result = await q2ma(users, { options: { sort: { "profile.name": 1 }, skip: 2, limit: 4 } })
		assert.deepEqual(names(result), ["User 02", "User 03", "User 04", "User 05"])
		assert.equal(result.Total, 30)
	})

	it("filters and projects find results", async () => {
		const result = await q2ma(users, { queryString: "age>21&fields=profile.name,age&sort=profile.name&limit=2" })
		assert.equal(result.Total, 10)
		assert.deepEqual(names(result), ["User 02", "User 05"])
		assert.deepEqual(result.Result[0], { _id: fixtures[2]._id, age: 22, profile: { name: "User 02" } })
	})

	it("lets the explicit filter override the query-string filter", async () => {
		const result = await q2ma(users, { filter: { age: 20 }, queryString: "age=22&sort=profile.name&limit=1" })
		assert.equal(result.Total, 10)
		assert.deepEqual(names(result), ["User 00"])
	})

	it("casts a query-string ObjectId on the find path", async () => {
		const result = await q2ma(users, { queryString: `_id=${fixtures[7]._id}` })
		assert.equal(result.Total, 1)
		assert.deepEqual(names(result), ["User 07"])
	})

	it("finds no matches for a field outside the schema", async () => {
		assert.deepEqual(await q2ma(users, { queryString: "id=missing" }), { Result: [], Total: 0 })
	})

	it("finds no matches after a valid filter and offset beyond its results", async () => {
		assert.deepEqual(await q2ma(users, { queryString: "age=22&offset=30" }), { Result: [], Total: 10 })
	})

	it("uses a ten-document page for an empty custom aggregation", async () => {
		const result = await q2ma(users, { pipelines: [] })
		assert.equal(result.Result.length, 10)
		assert.equal(result.Total, 30)
		assert.deepEqual(
			names(result),
			fixtures
				.slice(20)
				.reverse()
				.map(user => user.profile.name),
		)
	})

	it("sorts, projects and pages aggregation results independently of their total", async () => {
		const result = await q2ma(users, {
			pipelines: [{ $match: { age: 22 } }],
			queryString: "fields=profile.name,age&sort=profile.name&offset=2&limit=2",
		})
		assert.equal(result.Total, 10)
		assert.deepEqual(names(result), ["User 08", "User 11"])
		assert.deepEqual(result.Result[0], { _id: fixtures[8]._id, age: 22, profile: { name: "User 08" } })
	})

	it("counts groups rather than source documents", async () => {
		const result = await q2ma(users, {
			pipelines: [{ $group: { _id: "$age", count: { $sum: 1 } } }],
			queryString: "sort=_id&limit=2",
		})
		assert.deepEqual(result, {
			Result: [
				{ _id: 20, count: 10 },
				{ _id: 21, count: 10 },
			],
			Total: 3,
		})
	})

	it("applies query filters before custom stages by default", async () => {
		const result = await q2ma(users, {
			pipelines: [{ $group: { _id: "$age", count: { $sum: 1 } } }],
			queryString: "age>20&sort=_id",
		})
		assert.deepEqual(result, {
			Result: [
				{ _id: 21, count: 10 },
				{ _id: 22, count: 10 },
			],
			Total: 2,
		})
	})

	it("applies END filters to fields created by custom stages", async () => {
		const result = await q2ma(users, {
			pipelines: [{ $project: { category: "$age", profile: 1 } }],
			queryString: "category=21&sort=profile.name&limit=2",
			matchPosition: "END",
		})
		assert.equal(result.Total, 10)
		assert.deepEqual(names(result), ["User 01", "User 04"])
	})

	it("serializes query-string ObjectIds with the model's BSON version in aggregation", async () => {
		const result = await q2ma(users, { pipelines: [], queryString: `_id=${fixtures[7]._id}` })
		assert.equal(result.Total, 1)
		assert.deepEqual(names(result), ["User 07"])
	})

	it("normalizes query-string dates in aggregation", async () => {
		const result = await q2ma(users, { pipelines: [], queryString: "createdAt>=2024-01-28&sort=profile.name" })
		assert.equal(result.Total, 3)
		assert.deepEqual(names(result), ["User 27", "User 28", "User 29"])
	})

	it("returns an empty page and zero total for an unmatched aggregation", async () => {
		assert.deepEqual(await q2ma(users, { pipelines: [{ $match: { age: 99 } }] }), { Result: [], Total: 0 })
	})

	it("keeps the aggregation total when the offset exceeds its results", async () => {
		assert.deepEqual(await q2ma(users, { pipelines: [], queryString: "age=22&offset=30" }), { Result: [], Total: 10 })
	})

	it("supports array-existence filters before projection", async () => {
		const result = await q2ma(users, { pipelines: [{ $project: { profile: 1 } }], queryString: "posts.1" })
		assert.equal(result.Total, 10)
	})

	it("supports missing-field filters after projection", async () => {
		const result = await q2ma(users, {
			pipelines: [{ $project: { profile: 1 } }],
			queryString: "!profile.phone",
			matchPosition: "END",
		})
		assert.equal(result.Total, 15)
	})

	it("rejects invalid aggregation stages", async () => {
		await assert.rejects(q2ma(users, { pipelines: [{ $notAStage: {} }] }))
	})
})
