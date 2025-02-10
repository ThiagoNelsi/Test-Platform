import { prisma } from "./prisma";
import { getUserId } from "./auth";

export type Todo = {
    id: number;
    name: string;
    dueDate?: Date;
    startTime?: Date;
    finishTime?: Date;
}

export const getUnfinishedTests = async () => {
    const userId = await getUserId()
    if (!userId) return null

    const unfinishedTests = await prisma.test.findMany({
        where: {
            OR: [
            {
                instances: {
                    some: {
                        id: userId,
                        finishTime: null, // Test is not finished
                    },
                },
            },
            {
                instances: {
                    none: {
                        id: userId,
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
                where: { id: userId },
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