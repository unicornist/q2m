const mongoose = require("mongoose")
const { MongoMemoryServer } = require("mongodb-memory-server")
let mongod

module.exports.connect = async () => {
	mongod = await MongoMemoryServer.create({ binary: { version: "8.2.6" }, instance: { dbName: "q2ma_test" } })
	try {
		await mongoose.connect(mongod.getUri(), { autoIndex: false })
	} catch (error) {
		await mongod.stop()
		throw error
	}
}

module.exports.closeDatabase = async () => {
	try {
		await mongoose.disconnect()
	} finally {
		if (mongod) await mongod.stop()
	}
}
