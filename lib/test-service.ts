"use server"

import { prisma } from "./prisma";
import { getUserId } from "./auth";
import { TestData } from "./types";

export type Todo = {
    id: number;
    name: string;
    dueDate?: Date;
    startTime?: Date;
    finishTime?: Date;
}

export type DataParam = Omit<TestData, "sections"> & {
    sections: {
        selectionMode: string;
        shuffle?: boolean;
        questions: {
            id: number;
            version: number;
        }[];  // [questionId, version]
        randomQuestionCount?: number;
    }[]
}

export const createTest = async (data: DataParam) => {
    const userId = await getUserId()
    if (!userId) return null

    const test = await prisma.test.create({
        data: {
            name: data.name,
            value: data.value,
            dueDate: data.dueDate,
            timer: data.duration,
            description: data.description,
            publishDate: data.publishDate,
            status: data.status === "published" && data.publishDate ? "scheduled" : data.status,
            classroomId: data.classroomId,
            sections: data.sections.map(section => {
                if (section.selectionMode === "random") {
                    return {
                        count: section.randomQuestionCount,
                        questions: section.questions.map(q => q),
                    }
                }
                return {
                    shuffle: section.shuffle,
                    questions: section.questions.map(q => q),
                }
            }),
        }
    });

    return test;
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