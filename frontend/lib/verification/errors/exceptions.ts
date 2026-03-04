export class AppError extends Error {
    public statusCode: number;

    constructor(message: string, statusCode: number = 500) {
        super(message);
        this.name = this.constructor.name;
        this.statusCode = statusCode;

        // Set the prototype explicitly.
        Object.setPrototypeOf(this, AppError.prototype);
    }
}

export class AuthenticationError extends AppError {
    constructor(message: string = "Not authenticated") {
        super(message, 401);
        Object.setPrototypeOf(this, AuthenticationError.prototype);
    }
}

export class AuthorizationError extends AppError {
    constructor(message: string = "Permission denied") {
        super(message, 403);
        Object.setPrototypeOf(this, AuthorizationError.prototype);
    }
}

export class NotFoundError extends AppError {
    constructor(message: string = "Resource not found") {
        super(message, 404);
        Object.setPrototypeOf(this, NotFoundError.prototype);
    }
}

export class ValidationError extends AppError {
    constructor(message: string = "Validation failed") {
        super(message, 400);
        Object.setPrototypeOf(this, ValidationError.prototype);
    }
}
