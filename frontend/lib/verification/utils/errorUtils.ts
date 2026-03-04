import { AppError } from '../errors/exceptions';

export function parseError(error: unknown): string {
    if (error instanceof AppError) {
        return error.message;
    }

    if (error instanceof Error) {
        return error.message;
    }

    if (typeof error === 'string') {
        return error;
    }

    if (error && typeof error === 'object' && 'detail' in (error as any)) {
        return String((error as any).detail);
    }

    if (error && typeof error === 'object' && 'message' in (error as any)) {
        return String((error as any).message);
    }

    return "An unexpected error occurred.";
}
