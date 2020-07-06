const { dateConvert, normalizeCriteria, q2mPipelines, findQueryBuilder, isEmpty } = require("../q2ma")

describe("Function: utils", () => {
	it("the object is empty", () => {
		const obj = {}
		expect(isEmpty(obj)).toEqual(true)
	})
	it("the object is not empty", () => {
		const obj = { name: "Bob" }
		expect(isEmpty(obj)).toEqual(false)
	})
	it("the input is not object", () => {
		const fn = function () {}
		const date = new Date()
		expect(isEmpty(fn)).toEqual(false)
		expect(isEmpty(date)).toEqual(false)
	})
})

describe("Function: dateConvert", () => {
	it("Input as string Date must convert to full Date", () => {
		const input = "2020/10/20"
		const result = dateConvert(input, "DATE")
		expect(result).toEqual(new Date(input))
	})
	it("Input as number Date  must return original input", () => {
		const input = 1593330164836
		const result = dateConvert(input, "NUMBER")
		expect(result).toEqual(input)
	})
	it("Input as a string Date  must convert to full Date", () => {
		const input = "2020/10/20"
		const result = dateConvert(input)
		expect(result).toEqual(new Date(input))
	})
	it("Input as object must return the original input", () => {
		const input = { createdAt: "2020/10/20" }
		const result = dateConvert(input)
		expect(result).toEqual(input)
	})
})

describe("Function: normalizeCriteria", () => {
	it("Convert _id to ObjectId", () => {
		const input = {
			_id: "5e4d0c3586eb0cf4406fe5b1",
		}
		const result = normalizeCriteria(input)
		expect(typeof result._id).toBe("object")
	})

	it("Convert property path which contain _id to ObjectId", () => {
		const input = {
			"profile._id": "5e4d0c3586eb0cf4406fe5b1",
		}
		const result = normalizeCriteria(input)
		expect(typeof result["profile._id"]).toBe("object")
	})

	it("Convert _id in object to ObjectId", () => {
		const input = {
			cards: {
				_id: "5e4d0c3586eb0cf4406fe5b1",
			},
		}
		const result = normalizeCriteria(input)
		expect(typeof result.cards._id).toBe("object")
	})

	it("Convert Object contains _ids to ObjectId", () => {
		const input = {
			_id: "5e4d0c3586eb0cf4406fe5b1",
			"profile._id": "5e4d0c3586eb0cf4406fe5b1",
			cards: {
				_id: "5e4d0c3586eb0cf4406fe5b1",
			},
		}
		const result = normalizeCriteria(input)
		expect(result).toEqual(
			expect.objectContaining({
				_id: expect.any(Object),
				"profile._id": expect.any(Object),
				cards: {
					_id: expect.any(Object),
				},
			}),
		)
	})

	it("Normalize nested Object with Date fields to Date field", () => {
		const input = {
			profile: {
				createdAt: "2040-01-17",
				data: {
					createdAt: "2010-01-17",
				},
			},
			createdAt: {
				$gte: "2020-02-17",
				$lte: "2010-02-17",
			},
		}
		const result = normalizeCriteria(input)
		expect(result.profile.createdAt instanceof Date).toBeTruthy()
		expect(result.profile.data.createdAt instanceof Date).toBeTruthy()
		expect(result.createdAt.$gte instanceof Date).toBeTruthy()
		expect(result.createdAt.$lte instanceof Date).toBeTruthy()
	})

	it("Normalize Date type to Date field", () => {
		const input = {
			confirmedAt: 1593330164836,
			"profile.createdAt": "2020-01-01",
		}
		const result = normalizeCriteria(input)
		expect(result.confirmedAt instanceof Date).toBeTruthy()
		expect(result["profile.createdAt"] instanceof Date).toBeFalsy()
	})

	it("Normalize full mongodb object filter", () => {
		const input = {
			name: "john",
			confirmedAt: "2020-10-20",
			"profile.createdAt": "2020/01/03",
			age: { $gt: 21 },
			profile: {
				createdAt: "2030-01-10",
				data: {
					createdAt: "2030-03-20",
				},
			},
			_id: "5e4d0c3586eb0cf4406fe5b1",
			"profile._id": "5e4d0c3586eb0cf4406fe5b1",
			createdAt: {
				$gte: "2020-01-01",
				$lte: "2010/02/02",
			},
		}
		const result = normalizeCriteria(input)
		expect(result).toEqual(
			expect.objectContaining({
				name: expect.any(String),
				confirmedAt: expect.any(Object),
				age: { $gt: expect.any(Number) },
				profile: {
					createdAt: expect.any(Object),
					data: {
						createdAt: expect.any(Object),
					},
				},
				_id: expect.any(Object),
				"profile._id": expect.any(Object),
				createdAt: {
					$gte: expect.any(Object),
					$lte: expect.any(Object),
				},
			}),
		)
	})
})

describe("Function: q2mPipelines", () => {
	it("query string to mongodb aggregate pipelines", () => {
		const queryString = "name=john&age>21&fields=name,age&sort=name,-age&offset=10&limit=10"
		const expected = [
			{ $match: { name: "john", age: { $gt: 21 } } },
			{
				$facet: {
					total: [{ $group: { _id: "total", sum: { $sum: 1 } } }],
					pagedResult: [{ $sort: { name: 1, age: -1, _id: -1 } }, { $skip: 10 }, { $limit: 10 }, { $project: { name: 1, age: 1 } }],
				},
			},
		]
		const result = q2mPipelines({ queryString })
		expect(result).toEqual(expect.arrayContaining(expected))
	})
})

describe("Function: findQueryBuilder", () => {
	it("query string to mongodb find parameters", () => {
		const queryString = "name=john&age>21&fields=name,age&sort=name,-age&offset=10&limit=10"
		const expected = {
			criteria: { name: "john", age: { $gt: 21 } },
			projects: { name: 1, age: 1 },
			options: { sort: { name: 1, age: -1, _id: -1 }, skip: 10, limit: 10 },
		}
		const result = findQueryBuilder({ queryString })
		expect(result).toEqual(expected)
	})

	it("query string to mongodb find parameters with custom parameters", () => {
		const queryString = "name=john&age>21&fields=name,age&sort=name,-age&offset=10&limit=10"
		const filter = { lastName: "Bell" }
		const project = { name: 1, lastName: 1, _id: 1, phone: 1 }
		const option = { sort: { phone: -1, _id: 1 } }
		const expected = {
			criteria: { name: "john", age: { $gt: 21 }, lastName: "Bell" },
			projects: { name: 1, lastName: 1, _id: 1, phone: 1, age: 1 },
			options: { sort: { name: 1, age: -1, phone: -1, _id: 1 }, skip: 10, limit: 10 },
		}
		const result = findQueryBuilder({ queryString, filter, project, option })
		expect(result).toEqual(expected)
	})
})

// describe("Function: pagedAggregate", () => {})

// describe("Function: pagedFind", () => {})

// describe("Function: q2ma", () => {})
