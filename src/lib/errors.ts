export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public context?: unknown
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class ClassificationError extends AppError {
  constructor(message: string, context?: unknown) {
    super(message, 422, context);
    this.name = 'ClassificationError';
  }
}

export class MemoryError extends AppError {
  constructor(message: string, context?: unknown) {
    super(message, 503, context);
    this.name = 'MemoryError';
  }
}
