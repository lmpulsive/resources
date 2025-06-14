// src/socket.js
import { io } from 'socket.io-client';

// Ensure this URL points to your server.
// For development, it's often localhost. For production, it would be your deployed server URL.
const URL = process.env.NODE_ENV === 'production' ? window.location.origin : 'http://localhost:3000';

export const socket = io(URL, {
  autoConnect: false, // We will manually connect it in a React effect
  // Optional: Add other configurations like transports if needed later
  // transports: ['websocket'],
});
