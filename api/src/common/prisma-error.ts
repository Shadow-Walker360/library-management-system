import {
  ConflictException,
  HttpException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

interface PrismaErrorMessages {
  unique?: string;
  notFound?: string;
  foreignKey?: HttpException;
}

/**
 * Translates the Prisma error codes we expect into HTTP exceptions.
 * Anything unrecognised is re-thrown so Nest returns a 500.
 */
export function handlePrismaError(
  error: unknown,
  messages: PrismaErrorMessages = {},
): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      throw new ConflictException(
        messages.unique ?? 'A record with that unique value already exists',
      );
    }
    if (error.code === 'P2025') {
      throw new NotFoundException(messages.notFound ?? 'Record not found');
    }
    if (error.code === 'P2003' && messages.foreignKey) {
      throw messages.foreignKey;
    }
  }
  throw error;
}
