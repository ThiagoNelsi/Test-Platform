import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

export async function middleware(req: NextRequest) {
    const token = await getToken({ req });

    if (!token) {
        return NextResponse.redirect(new URL("/login", req.url));
    }

    if (req.nextUrl.pathname === "/") {
        return NextResponse.redirect(new URL("/home", req.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/", "/home", "/classroom/:path*", "/create-test"],
};