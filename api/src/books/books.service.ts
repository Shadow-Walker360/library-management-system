import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { handlePrismaError } from '../common/prisma-error';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBookDto } from './dto/create-book.dto';
import { UpdateBookDto } from './dto/update-book.dto';

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;
const ISBN_TAKEN = 'A book with that ISBN already exists';
const unknownGenre = () =>
  new BadRequestException('genreId does not match an existing genre');

function parsePositiveInt(value: string | undefined): number | undefined {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

@Injectable()
export class BooksService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    genreId?: string,
    search?: string,
    page?: string,
    limit?: string,
  ) {
    const currentPage = parsePositiveInt(page) ?? 1;
    const pageSize = Math.min(parsePositiveInt(limit) ?? DEFAULT_LIMIT, MAX_LIMIT);
    const genre = parsePositiveInt(genreId);
    const term = search?.trim();

    const where: Prisma.BookWhereInput = {
      ...(genre ? { genreId: genre } : {}),
      ...(term
        ? {
            OR: [
              { title: { contains: term, mode: 'insensitive' } },
              { author: { contains: term, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.book.findMany({
        where,
        include: { genre: true },
        orderBy: { title: 'asc' },
        skip: (currentPage - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.book.count({ where }),
    ]);

    return {
      data,
      total,
      page: currentPage,
      limit: pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async findOne(id: number) {
    const book = await this.prisma.book.findUnique({
      where: { id },
      include: { genre: true, reviews: true },
    });
    if (!book) throw new NotFoundException(`Book ${id} not found`);
    return book;
  }

  async create(dto: CreateBookDto) {
    try {
      return await this.prisma.book.create({
        data: { ...dto, availableCopies: dto.totalCopies },
        include: { genre: true },
      });
    } catch (error) {
      return handlePrismaError(error, {
        unique: ISBN_TAKEN,
        foreignKey: unknownGenre(),
      });
    }
  }

  async update(id: number, dto: UpdateBookDto) {
    const { totalCopies, ...rest } = dto;
    const data: Prisma.BookUncheckedUpdateInput = { ...rest };

    if (totalCopies !== undefined) {
      const existing = await this.prisma.book.findUnique({
        where: { id },
        select: { totalCopies: true, availableCopies: true },
      });
      if (!existing) throw new NotFoundException(`Book ${id} not found`);

      const borrowed = existing.totalCopies - existing.availableCopies;
      if (totalCopies < borrowed) {
        throw new BadRequestException(
          `totalCopies cannot be lower than the ${borrowed} copies currently borrowed`,
        );
      }
      data.totalCopies = totalCopies;
      data.availableCopies = totalCopies - borrowed;
    }

    try {
      return await this.prisma.book.update({
        where: { id },
        data,
        include: { genre: true },
      });
    } catch (error) {
      return handlePrismaError(error, {
        unique: ISBN_TAKEN,
        notFound: `Book ${id} not found`,
        foreignKey: unknownGenre(),
      });
    }
  }

  async remove(id: number) {
    try {
      await this.prisma.book.delete({ where: { id } });
    } catch (error) {
      handlePrismaError(error, { notFound: `Book ${id} not found` });
    }
  }
}
