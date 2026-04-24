import bcrypt from 'bcryptjs';

const passwordRounds = 12;

export const hashPassword = (password: string) => bcrypt.hash(password, passwordRounds);

export const verifyPassword = (password: string, hash: string) => bcrypt.compare(password, hash);

