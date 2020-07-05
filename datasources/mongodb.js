
const MongoClient = require('mongodb').MongoClient;
const { MongoMemoryServer } = require("mongodb-memory-server")
const mongod = new MongoMemoryServer()

global.mongoClient = null

module.exports.connect = mongodbURL => {
  return new Promise(async resolve => {
    const uri = await mongod.getConnectionString()
    const mongoClient = new MongoClient(mongodbURL || uri, { useNewUrlParser: true, useUnifiedTopology: true });
    mongoClient.connect( function (error) {
      if (error) {
        console.error(`Connection error: ${error.stack} on Worker process: ${process.pid}`)
        process.exit(1)
      };
      console.info(`Connected to database on Worker process: ${process.pid}`)
      const db = mongoClient.db();
      resolve(db)
    });
  })
}

module.exports.closeDatabase = () => {
  return new Promise(resolve => {
    if(!global.mongoClient)
    return false
    global.mongoClient.dropDatabase( function(err, result){
        console.log("Error : "+err);
        if (err) throw err;
        console.log("Operation Success ? "+result);
        global.mongoClient.close();
        resolve(true)
    });
  })

}

module.exports.clearDatabase = () => {
  return new Promise( resolve => {
    global.mongoClient.collections(async function (err, collections) {
      console.log("Error : "+err);
      if (err) throw err;
      for (const key in collections) {
        const collection = collections[key]
        await collection.deleteMany()
      }
      resolve(true)
    })
  })
}
