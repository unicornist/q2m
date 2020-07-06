// const dbHandler = require("../datasources/mongodb")
// const { q2ma } = require("../q2ma")
// let userModal = null

// beforeAll(async () => {
//   const db = await dbHandler.connect()
//   userModal = db.collection("user")
//   await userModal.insertMany(require("../datasources/dump.json"))
// }, 8000)

// afterAll(async () => await dbHandler.closeDatabase())

describe("INTG: q2ma with mongodb", () => {
	it("in progress", async () => {
		expect(true).toEqual(true)
	})
})
