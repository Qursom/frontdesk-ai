import { Transform } from 'class-transformer';

/**
 * Trims a string BEFORE validation, so "   " fails @Length(1, ...) with a clean 400
 * instead of passing validation and failing later in the database (a 500).
 * Non-strings are left alone for the type validators to reject.
 */
export const Trim = () => Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value));
