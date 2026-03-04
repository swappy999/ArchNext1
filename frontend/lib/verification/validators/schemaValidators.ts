// Basic validation helpers that can be expanded if Zod/Yup are introduced later.

export const isValidEmail = (email: string): boolean => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
};

export const isStrongPassword = (password: string): boolean => {
    return password.length >= 8;
};

export const isNotEmpty = (val: string | null | undefined): boolean => {
    return val !== null && val !== undefined && val.trim().length > 0;
};
