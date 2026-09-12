import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DashboardLayout } from './layouts/DashboardLayout';
import { Dashboard } from './pages/Dashboard';
import { Accounts } from './pages/Accounts';
import { AccountSelect } from './pages/AccountSelect';
import { Settings } from './pages/Settings';
import { Videos } from './pages/Videos';
import { Queue } from './pages/Queue';
import { Schedules } from './pages/Schedules';
import { History } from './pages/History';
import { Analytics } from './pages/Analytics';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<DashboardLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="accounts" element={<Accounts />} />
            <Route path="accounts/select" element={<AccountSelect />} />
            <Route path="videos" element={<Videos />} />
            <Route path="queue" element={<Queue />} />
            <Route path="schedules" element={<Schedules />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="history" element={<History />} />
            <Route path="settings" element={<Settings />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
