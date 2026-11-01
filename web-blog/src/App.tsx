import { lazy, Suspense } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import BlogIndex from './pages/BlogIndex';
import NotFound from './pages/NotFound';

// Markdown + highlighting only load when a post is opened (NFR-04).
const PostPage = lazy(() => import('./pages/PostPage'));

export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Suspense fallback={<p className="font-mono text-sm text-subtle">Loading…</p>}>
          <Routes>
            <Route path="/" element={<BlogIndex />} />
            <Route path="/:slug" element={<PostPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </Layout>
    </BrowserRouter>
  );
}
