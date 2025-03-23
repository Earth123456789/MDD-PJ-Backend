declare module 'bcryptjs' {
    export function hash(data: string, salt: number | string): Promise<string>;
    export function hashSync(data: string, salt?: number | string): string;
    
    export function compare(data: string, encrypted: string): Promise<boolean>;
    export function compareSync(data: string, encrypted: string): boolean;
    
    export function genSalt(rounds?: number): Promise<string>;
    export function genSaltSync(rounds?: number): string;
}