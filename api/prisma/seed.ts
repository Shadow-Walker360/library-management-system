import { PrismaClient, Role } from '@prisma/client';

const prisma = new PrismaClient();

const genres = [
  { name: 'Science Fiction', description: 'Speculative fiction about science, technology and the future.' },
  { name: 'Literary Fiction', description: 'Character-driven novels with lasting literary merit.' },
  { name: 'History & Science', description: 'Non-fiction on the human past and the natural world.' },
  { name: 'Technology', description: 'Software engineering and computing.' },
];

const books: Record<string, { title: string; author: string; isbn: string; publishedYear: number; copiesAvailable: number }[]> = {
  'Science Fiction': [
    { title: 'Dune', author: 'Frank Herbert', isbn: '9780441013593', publishedYear: 1965, copiesAvailable: 3 },
    { title: 'Neuromancer', author: 'William Gibson', isbn: '9780441569595', publishedYear: 1984, copiesAvailable: 2 },
    { title: 'The Left Hand of Darkness', author: 'Ursula K. Le Guin', isbn: '9780441478125', publishedYear: 1969, copiesAvailable: 2 },
    { title: 'Foundation', author: 'Isaac Asimov', isbn: '9780553293357', publishedYear: 1951, copiesAvailable: 4 },
  ],
  'Literary Fiction': [
    { title: 'Pride and Prejudice', author: 'Jane Austen', isbn: '9780141439518', publishedYear: 1813, copiesAvailable: 5 },
    { title: 'Things Fall Apart', author: 'Chinua Achebe', isbn: '9780385474542', publishedYear: 1958, copiesAvailable: 4 },
    { title: 'Beloved', author: 'Toni Morrison', isbn: '9781400033416', publishedYear: 1987, copiesAvailable: 2 },
    { title: 'Half of a Yellow Sun', author: 'Chimamanda Ngozi Adichie', isbn: '9781400095209', publishedYear: 2006, copiesAvailable: 3 },
  ],
  'History & Science': [
    { title: 'Sapiens', author: 'Yuval Noah Harari', isbn: '9780062316110', publishedYear: 2011, copiesAvailable: 3 },
    { title: 'Guns, Germs, and Steel', author: 'Jared Diamond', isbn: '9780393317558', publishedYear: 1997, copiesAvailable: 2 },
    { title: 'The Warmth of Other Suns', author: 'Isabel Wilkerson', isbn: '9780679763888', publishedYear: 2010, copiesAvailable: 2 },
    { title: 'A Brief History of Time', author: 'Stephen Hawking', isbn: '9780553380163', publishedYear: 1988, copiesAvailable: 3 },
  ],
  Technology: [
    { title: 'Clean Code', author: 'Robert C. Martin', isbn: '9780132350884', publishedYear: 2008, copiesAvailable: 4 },
    { title: 'The Pragmatic Programmer', author: 'David Thomas and Andrew Hunt', isbn: '9780135957059', publishedYear: 2019, copiesAvailable: 3 },
    { title: 'Designing Data-Intensive Applications', author: 'Martin Kleppmann', isbn: '9781449373320', publishedYear: 2017, copiesAvailable: 2 },
    { title: 'Refactoring', author: 'Martin Fowler', isbn: '9780134757599', publishedYear: 2018, copiesAvailable: 2 },
  ],
};

async function main() {
  for (const genre of genres) {
    const savedGenre = await prisma.genre.upsert({
      where: { name: genre.name },
      update: { description: genre.description },
      create: genre,
    });

    for (const book of books[genre.name]) {
      await prisma.book.upsert({
        where: { isbn: book.isbn },
        update: { ...book, genreId: savedGenre.id },
        create: { ...book, genreId: savedGenre.id },
      });
    }
  }

  await prisma.user.upsert({
    where: { email: 'librarian@library.test' },
    update: {},
    create: { email: 'librarian@library.test', name: 'Lena Librarian', role: Role.LIBRARIAN },
  });

  const patron = await prisma.user.upsert({
    where: { email: 'patron@library.test' },
    update: {},
    create: { email: 'patron@library.test', name: 'Paul Patron', role: Role.PATRON },
  });

  const dune = await prisma.book.findUniqueOrThrow({ where: { isbn: '9780441013593' } });
  await prisma.review.upsert({
    where: { bookId_userId: { bookId: dune.id, userId: patron.id } },
    update: {},
    create: { bookId: dune.id, userId: patron.id, rating: 5, comment: 'A towering piece of world-building.' },
  });

  const [genreCount, bookCount] = await Promise.all([prisma.genre.count(), prisma.book.count()]);
  console.log(`Seeded ${genreCount} genres and ${bookCount} books.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
