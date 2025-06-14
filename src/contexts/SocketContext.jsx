// src/contexts/SocketContext.jsx
import React, { createContext, useContext } from 'react';
import { socket } from '../socket'; // Adjust path if socket.js is moved

const SocketContext = createContext(socket); // Provide socket as default value

export const useSocket = () => {
  return useContext(SocketContext);
};

export const SocketProvider = ({ children }) => {
  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
};
