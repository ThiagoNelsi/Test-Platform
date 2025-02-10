"use server"

import { getUserId } from "./auth"
import { prisma, prismaMongo } from "./prisma"

export const createQuestion = async (formData: FormData) => {
    const userId = await getUserId()
    if (!userId) return null

    const type = formData.get('type') as string
    const level = formData.get('level') as string
    const data = formData.get('data') as string

    const levelOptions = ['easy', 'medium', 'hard']

    let question

    try {
        question = await prisma.question.create({
            data: {
                type,
                level: levelOptions.indexOf(level),
                authorId: userId,
            }
        });
    } catch (err) {
        return false
    }

    try {
        await prismaMongo.questionData.create({
            data: {
                questionId: question.id,
                data,
                type,
            }
        });

        return true
    } catch (err) {
        await prisma.question.delete({
            where: {
                id: question.id
            }
        })
        return false
    }
}