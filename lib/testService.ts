import { prisma } from "./prisma";

export type Todo = {
    id: number;
    name: string;
    dueDate?: Date;
    startTime?: Date;
    finishTime?: Date;
}

export const getUnfinishedTests = async (userId: number) => {
    const unfinishedTests = await prisma.test.findMany({
        where: {
            OR: [
            {
                instances: {
                    some: {
                        userId,
                        finishTime: null, // Test is not finished
                    },
                },
            },
            {
                instances: {
                    none: {
                        userId,
                    }, // Test is not started
                },
            },
            ],
        },
        select: {
            id: true,
            name: true,
            dueDate: true,
            instances: {
                where: { userId },
                select: {
                    startTime: true,
                    finishTime: true,
                },
            },
        },
    });

    const todos: Todo[] = unfinishedTests.map(test => ({
        id: test.id,
        name: test.name,
        dueDate: test.dueDate ?? undefined,
        startTime: test.instances[0]?.startTime ?? undefined,
        finishTime: test.instances[0]?.finishTime ?? undefined,
    }));

    return todos;
}