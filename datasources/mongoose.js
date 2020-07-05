const mongoose = require("mongoose")
const { MongoMemoryServer } = require("mongodb-memory-server")
const mongod = new MongoMemoryServer()

module.exports.connect = async mongodbURL => {
	const uri = await mongod.getConnectionString()
	await mongoose.connect(mongodbURL || uri, { useNewUrlParser: true, autoIndex: false, useUnifiedTopology: true, useFindAndModify: false }).catch(error => {
		console.error(`Connection error: ${error.stack} on Worker process: ${process.pid}`)
		process.exit(1)
	})

	mongoose.connection.on("error", err => console.error("connection/model error =>", err))
	console.info(`Connected to database on Worker process: ${process.pid}`)
}

module.exports.closeDatabase = async () => {
	await mongoose.connection.dropDatabase()
	await mongoose.connection.close()
}

module.exports.clearDatabase = async () => {
	const collections = mongoose.connection.collections
	for (const key in collections) {
		const collection = collections[key]
		await collection.deleteMany()
	}
}
