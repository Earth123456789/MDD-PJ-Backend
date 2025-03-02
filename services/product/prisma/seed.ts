import { PrismaClient } from '@prisma/client'
import { faker } from '@faker-js/faker'

const prisma = new PrismaClient()

async function main() {

  const products = Array.from({ length: 50 }).map(() => ({
    name: faker.commerce.productName(),
    description: faker.commerce.productDescription(),
    price: parseFloat(faker.commerce.price()),
    stock: faker.number.int({ min: 0, max: 100 }),
    image_url: faker.image.url(),
  }))


  const insertedProducts = await prisma.product.createMany({
    data: products,
  })

  console.log(`${insertedProducts.count} products have been created!`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
