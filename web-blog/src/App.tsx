import { lazy, Suspense } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import BlogIndex from './pages/BlogIndex';
import NotFound from './pages/NotFound';

// Markdown + highlighting only load when a post is opened (NFR-04)...
const loadPostPage = () => import('./pages/PostPage');
const PostPage = lazy(loadPostPage);
// ...but fetch that chunk early so opening a post doesn't flash a fallback:
// immediately when landing on a post, otherwise once the browser is idle.
if (typeof window !== 'undefined') {
  if (window.location.pathname !== '/') void loadPostPage();
  else (window.requestIdleCallback ?? ((cb: () => void) => setTimeout(cb, 1500)))(() => void loadPostPage());
}

export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Suspense fallback={null}>
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
