import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './core/context/AuthContext.jsx';
import LoginView from './core/views/LoginView.jsx';
import LandingView from './core/views/LandingView.jsx';
import AdminView from './core/views/AdminView.jsx';
import UserView from './core/views/UserView.jsx';
import TutorialView from './core/views/TutorialView.jsx';
import EduCruciView from './core/views/EduCruciView.jsx';
import EduCrucimateView from './core/views/EduCrucimateView.jsx';
import EduSopaView from './core/views/EduSopaView.jsx';
import EduSudokuView from './core/views/EduSudokuView.jsx';
import EduExamenView from './core/views/EduExamenView.jsx';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<LandingView />} />
          <Route path="/login" element={<LoginView />} />
          <Route path="/admin" element={<AdminView />} />
          <Route path="/user" element={<UserView />} />
          <Route path="/tutorial" element={<TutorialView />} />
          <Route path="/crucigramas" element={<EduCruciView />} />
          <Route path="/crucimate" element={<EduCrucimateView />} />
          <Route path="/sopadeletras" element={<EduSopaView />} />
          <Route path="/sudoku" element={<EduSudokuView />} />
          <Route path="/examenes" element={<EduExamenView />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
