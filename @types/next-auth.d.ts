import { DeafultSession } from 'next-auth';

declare module 'next-auth' {
    interface Session {
        user: {
            id: number;
        } & DeafultSession['user'];
    }
}