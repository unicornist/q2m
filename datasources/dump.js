const faker = require("faker")
const fs = require("fs")

function randomNumber (min = 0, max = 10) {
	return Math.floor(Math.random() * (max - min + 1) + min)
}

const createPost = () => {
	return {
		tile: faker.lorem.words(),
		slug: faker.lorem.slug(),
		excerpt: faker.lorem.lines(),
		content: faker.lorem.paragraphs(),
		thumbnail: faker.image.people(),
		gallery: [faker.image.animals(), faker.image.food(), faker.image.nature()],
	}
}

const createUser = () => {
	const user = {
		profile: {
			name: faker.name.firstName(),
			lastName: faker.name.lastName(),
			email: faker.internet.email(),
			address: {
				zipCode: faker.address.zipCode(),
				city: faker.address.city(),
				country: faker.address.country(),
				countryCode: faker.address.countryCode(),
				latitude: faker.address.latitude(),
				longitude: faker.address.longitude(),
			},
		},
		posts: Array(randomNumber(0, 6))
			.fill()
			.map(() => createPost()),
	}
	if (randomNumber(0, 10) % 2) user.profile.phone = faker.phone.phoneNumber()

	return user
}

const dumpData = Array(randomNumber(60, 100))
	.fill()
	.map(() => createUser())

fs.writeFileSync("./datasources/dump.json", JSON.stringify(dumpData))
