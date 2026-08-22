import './utils/polyfills';
import React from 'react';
import { Route, Routes } from 'react-router-dom';

import Layout from './components/Layout';
import HomePage from './pages/HomePage/HomePage';
import TaskDetailPage from './pages/TaskDetailPage/TaskDetailPage';
import CheckinPage from './pages/CheckinPage/CheckinPage';
import MentorPage from './pages/MentorPage/MentorPage';
import NotFound from './pages/NotFound/NotFound';

const RoutesComponent = () => {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="task" element={<TaskDetailPage />} />
        <Route path="checkin" element={<CheckinPage />} />
        <Route path="mentor" element={<MentorPage />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default RoutesComponent;
