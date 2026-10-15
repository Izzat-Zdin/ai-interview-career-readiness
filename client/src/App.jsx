import { Routes, Route, Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import pkg from '../package.json';
import MockInterviewPage from './modules/mock-interview/pages/MockInterviewPage';
import { ProgressDashboard } from './modules/mock-interview/components/ProgressDashboard';

function App() {
  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b bg-card px-4 py-3">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <Link to="/" className="text-lg font-semibold text-foreground">
            AI Interview & Career Readiness
          </Link>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <Link to="/mock-interview" className="hover:text-foreground">
              Mock Interview
            </Link>
            <Link to="/progress" className="hover:text-foreground">
              My Progress
            </Link>
            <Badge variant="outline" className="font-mono text-xs">
              v{pkg.version}
            </Badge>
          </div>
        </div>
      </nav>
      <main className="mx-auto max-w-5xl p-4 md:p-6">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/mock-interview" element={<MockInterviewPage />} />
          <Route path="/progress" element={<ProgressPage />} />
        </Routes>
      </main>
    </div>
  );
}

function ProgressPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">My Progress</h1>
      <ProgressDashboard />
    </div>
  );
}

function Home() {
  return (
    <div className="space-y-6 text-center">
      <h1 className="text-4xl font-bold tracking-tight">AI Interview Preparation & Career Readiness</h1>
      <p className="text-lg text-muted-foreground">
        Practice interviews, get AI feedback, and improve your communication skills.
      </p>
      <Link
        to="/mock-interview"
        className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground hover:bg-primary/90"
      >
        Start Mock Interview
      </Link>
    </div>
  );
}

export default App;
