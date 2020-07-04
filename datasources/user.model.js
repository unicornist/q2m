const mongoose = require("mongoose")

const userSchema = new mongoose.Schema({
	profile: {
		name: String,
		lastName: String,
		phone: String,
		email: String,
		address: {
			zipCode: String,
			city: String,
			country: String,
			countryCode: String,
			latitude: String,
			longitude: String,
		},
	},
	posts: [
		{
			tile: String,
			slug: String,
			excerpt: String,
			content: String,
			thumbnail: String,
			gallery: { type: [String] },
		},
	],
})

module.exports = mongoose.model("user", userSchema)
