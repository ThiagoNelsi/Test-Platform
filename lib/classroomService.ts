"use server"

import { prisma } from "@/lib/prisma";
import { Classroom, User } from "@prisma/client";
import { revalidatePath } from "next/cache";

type Owner = Pick<User, 'name' | 'id' | 'email'>

export type ClassroomWithOwner = { owner: Owner } & Classroom

export async function getClassrooms(userId: number) {
    const include = {
        owner: {
            select: {
                id: true,
                name: true,
                email: true,
            }
        }
    }

    const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
            ownedClasses: {
                include,
                orderBy: {
                    createdAt: 'desc'
                }
            },
            classrooms: {
                include,
                orderBy: {
                    createdAt: 'desc'
                }
            }
        },
    });

    if (!user) return null

    const { ownedClasses, classrooms } = user;

    return {
        ownedClasses,
        classrooms,
    }
}

export async function createClassroom(formData: FormData) {
    const name = formData.get('name') as string
    const userId = Number(formData.get('userId'))

    const existingClassroom = await prisma.classroom.findFirst({
        where: {
            name
        }
    })

    if (existingClassroom) {
        console.log('Classroom already exists')
        return { error: 'Classroom already exists' }
    }

    let code: string

    while (true) {
        code = Math.random().toString(36).substring(2, 8).toUpperCase()

        const existingCode = await prisma.classroom.findFirst({
            where: {
                code
            }
        })

        if (!existingCode) break;
    }

    const classroom: Classroom = await prisma.classroom.create({
        data: {
            name,
            code,
            ownerId: userId,
        }
    });

    revalidatePath(`/home/${userId}`)

    return classroom
}

export async function joinClassroom(formData: FormData) {
    const code = (formData.get('code') as string).toUpperCase()
    const userId = Number(formData.get('userId'))

    const classroom = await prisma.classroom.findFirst({
        where: {
            code
        }
    })

    if (!classroom) {
        console.log('Classroom not found')
        return { error: 'Classroom not found' }
    }

    await prisma.classroom.update({
        where: {
            id: classroom.id
        },
        data: {
            students: {
                connect: {
                    id: userId
                }
            }
        }
    })

    revalidatePath(`/home/${userId}`)
}