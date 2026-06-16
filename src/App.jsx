import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './core/context/AuthContext.jsx';
import LoginView from './core/views/LoginView.jsx';
import AdminView from './core/views/AdminView.jsx';
import UserView from './core/views/UserView.jsx';
import TutorialView from './core/views/TutorialView.jsx';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<LoginView />} />
          <Route path="/login" element={<LoginView />} />
          <Route path="/admin" element={<AdminView />} />
          <Route path="/user" element={<UserView />} />
          <Route path="/tutorial" element={<TutorialView />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
