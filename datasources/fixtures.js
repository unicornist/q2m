const mongoose = require("mongoose")

// Fixed ids and fields make paging assertions independent of random data and clocks.
module.exports = Array.from({ length: 30 }, (_, index) => ({
	_id: new mongoose.Types.ObjectId("5e4d0c3586eb0cf4" + (index + 1).toString(16).padStart(8, "0")),
	age: 20 + (index % 3),
	createdAt: new Date(`2024-01-${String(index + 1).padStart(2, "0")}T00:00:00Z`),
	profile: {
		name: `User ${String(index).padStart(2, "0")}`,
		lastName: `Family ${index}`,
		email: `user${index}@example.test`,
		...(index % 2 === 0 ? { phone: `555-${String(index).padStart(4, "0")}` } : {}),
	},
	posts: index % 3 === 0 ? [{ title: "First" }, { title: "Second" }] : [],
}))
