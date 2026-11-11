# Library Management System

NestJS API with a PostgreSQL database managed through Prisma.

## Getting Started

```bash
cd api
cp .env.example .env        # then set DATABASE_URL to your hosted PostgreSQL instance
npm install
npx prisma migrate dev --name init
npx prisma db seed
```

The seed script is idempotent (it uses `upsert`), so it is safe to run more than once.

## Schema Decisions

**Why `Book` references `Genre` instead of embedding it.**

- **One source of truth.** A genre such as "Science Fiction" is shared by many books. Embedding it would copy the name and description into every book, so renaming a genre would mean updating every book and risking inconsistencies ("Sci-Fi" vs "Science Fiction").
- **Genres are entities in their own right.** They can be listed, described, created and retired independently of any book, and a genre can exist before it has any books.
- **Cheap, reliable queries.** `Book.genreId` is a foreign key with an index, so "all books in a genre" is an indexed lookup and PostgreSQL guarantees a book can never point at a genre that does not exist.
- **Normalised, smaller rows.** Each book stores a single integer instead of a duplicated genre object.

Other decisions:

- `Role` is a Postgres enum (`PATRON`, `LIBRARIAN`), so invalid roles are rejected by the database and default to `PATRON`.
- `Book.isbn` and `User.email` are unique, giving natural duplicate protection.
- `Review` links `Book` and `User` with `@@unique([bookId, userId])` (one review per user per book) and cascading deletes so reviews never outlive their book or author.

### Prisma vs. a document database

In a document database like MongoDB, my first instinct is to nest related data inside the parent (a book with its genre and reviews embedded) and accept duplication for fast reads. In Prisma and PostgreSQL the relationship is declared once with `@relation`, enforced by the database, and pulled in only when needed with `include`. The schema file is also the single source of truth that generates migrations and fully typed queries, rather than structure being implied by whatever documents happen to be stored.
