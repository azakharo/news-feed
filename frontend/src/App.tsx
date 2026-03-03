import {VirtualFeed} from './components/VirtualFeed/VirtualFeed';

function App() {
  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Sticky Navbar - stays at top during scroll */}
      <nav className="sticky top-0 z-50 border-b border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
        <div className="mx-auto max-w-2xl px-4 py-3">
          <span className="self-center text-xl font-semibold whitespace-nowrap dark:text-white">
            News Feed
          </span>
        </div>
      </nav>

      {/* Main content area - window scrollable */}
      <VirtualFeed />
    </main>
  );
}

export default App;
