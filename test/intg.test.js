const dbHandler = require("../datasources/db-handler")
const userModal = require("../datasources/user.model")
const { q2ma } = require("../q2ma")

beforeAll(async () => {
	await dbHandler.connect()
	await userModal.insertMany(require("../datasources/dump.json"))
})

afterAll(async () => await dbHandler.closeDatabase())

describe("INTG: q2ma by queryString", () => {
	it("throw to and error when collection does not provide", async () => {
		expect(await q2ma).toThrowError()
	})
	it("defult result limit must be 20", async () => {
		const result = await q2ma(userModal)
		expect(result.Result).toHaveLength(20)
	})
	it("obtain data with limit of 4 and offset of 2", async () => {
		const queryString = "limit=4&offset=2"
		const result = await q2ma(userModal, { queryString })
		expect(result.Result).toHaveLength(4)
		// TODO: page 1 and 2 must be compare
	})
	it("search field is not in schema and get 0 result", async () => {
		const queryString = "id=test"
		const result = await q2ma(userModal, { queryString })
		expect(result.Result).toHaveLength(0)
		expect(result.Total).toEqual(0)
	})
})

describe("INTG: q2ma by aggregation pipelines", () => {
	let Totla = 0
	it("defult result limit must be 20", async () => {
		const result = await q2ma(userModal)
		expect(result.Result).toHaveLength(20)
		Totla = result.Total
	})
	it("search field is not in schema and get 0 result", async () => {
		const pipelines = [{ $match: { id: "test" } }]
		const result = await q2ma(userModal, { pipelines })
		expect(result.Result).toHaveLength(0)
		expect(result.Total).toEqual(0)
	})
	it("obtain data with limit of 4 and offset of 2 (backend option)", async () => {
		// const pipelines = [
		//   { $limit : 4 },
		//   { $skip: 2 }
		// ]
		// const result = await q2ma(userModal, {pipelines, matchPosition: "END"})
		// console.log(result)
		// expect(result.Result).toHaveLength(4)
		// TODO: this not support yet! use querystring for limit and offset
	})
	it("get list of user profile, contain name, lastname, phone and email", async () => {
		const pipelines = [{ $project: { "profile.name": 1, "profile.lastName": 1, "profile.phone": 1, "profile.email": 1 } }]
		const result = await q2ma(userModal, { pipelines })
		expect(result.Result[0].profile).toEqual(
			expect.objectContaining({
				name: expect.any(String),
				lastName: expect.any(String),
				phone: expect.any(String),
				email: expect.any(String),
			}),
		)
	})
	it("get list of user profile, at least has 1 post", async () => {
		const pipelines = [{ $project: { "profile.name": 1, "profile.lastName": 1, "profile.phone": 1, "profile.email": 1 } }]
		const queryString = "posts.1"
		const result = await q2ma(userModal, { pipelines, queryString })
		expect(result.Total).toBeLessThan(Totla)
	})
	it("get list of user profile, has not phone number", async () => {
		const pipelines = [{ $project: { "profile.name": 1, "profile.lastName": 1, "profile.phone": 1, "profile.email": 1 } }]
		const queryString = "!profile.phone"
		const result = await q2ma(userModal, { pipelines, queryString, matchPosition: "END" })
		expect(result.Total).toBeLessThan(Totla)
	})
})

describe("INTG: q2ma by find filter", () => {
	it("defult result limit must be 20", async () => {
		const result = await q2ma(userModal)
		expect(result.Result).toHaveLength(20)
	})
	it("obtain data with limit of 4 and offset of 2 (backend option)", async () => {
		const options = { skip: 2, limit: 4 }
		const result = await q2ma(userModal, { options })
		expect(result.Result).toHaveLength(4)
		// TODO: page 1 and 2 must be compare
	})
	it("obtain data with limit of 4 and offset of 2 (queryString option)", async () => {
		const queryString = "limit=4&offset=2"
		const result = await q2ma(userModal, { queryString })
		expect(result.Result).toHaveLength(4)
		// TODO: page 1 and 2 must be compare
	})
	it("get list of user profile, contain name, lastname, phone and email", async () => {
		const project = { "profile.name": 1, "profile.lastName": 1, "profile.phone": 1, "profile.email": 1 }
		const result = await q2ma(userModal, { project })
		expect(result.Result[0].profile).toEqual(
			expect.objectContaining({
				name: expect.any(String),
				lastName: expect.any(String),
				phone: expect.any(String),
				email: expect.any(String),
			}),
		)
	})
})
