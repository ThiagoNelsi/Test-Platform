"use client";

import { io } from "socket.io-client";

const backendUrl = (process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:8000').replace(/\/+$/g, '');

export const socket = io(backendUrl, {
  transports: ['websocket'],
});
