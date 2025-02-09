import { prisma } from "@/lib/prisma";
import { Classroom, User } from "@prisma/client";

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