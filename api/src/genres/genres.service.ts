import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { handlePrismaError } from '../common/prisma-error';
import { PrismaService } from '../prisma/prisma.service';
import { CreateGenreDto } from './dto/create-genre.dto';
import { UpdateGenreDto } from './dto/update-genre.dto';

const GENRE_NAME_TAKEN = 'A genre with that name already exists';
const genreInUse = () =>
  new ConflictException('Genre still has books; move or delete them first');

@Injectable()
export class GenresService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.genre.findMany({
      include: { _count: { select: { books: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: number) {
    const genre = await this.prisma.genre.findUnique({
      where: { id },
      include: { books: { orderBy: { title: 'asc' } } },
    });
    if (!genre) throw new NotFoundException(`Genre ${id} not found`);
    return genre;
  }

  async create(dto: CreateGenreDto) {
    try {
      return await this.prisma.genre.create({ data: dto });
    } catch (error) {
      return handlePrismaError(error, { unique: GENRE_NAME_TAKEN });
    }
  }

  async update(id: number, dto: UpdateGenreDto) {
    try {
      return await this.prisma.genre.update({ where: { id }, data: dto });
    } catch (error) {
      return handlePrismaError(error, {
        unique: GENRE_NAME_TAKEN,
        notFound: `Genre ${id} not found`,
      });
    }
  }

  async remove(id: number) {
    try {
      await this.prisma.genre.delete({ where: { id } });
    } catch (error) {
      handlePrismaError(error, {
        notFound: `Genre ${id} not found`,
        foreignKey: genreInUse(),
      });
    }
  }
}
