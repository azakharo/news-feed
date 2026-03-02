import {FeedList} from './components/FeedList/FeedList';

function App() {
  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <nav className="border-b border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
        <div className="mx-auto max-w-2xl px-4 py-3">
          <span className="self-center text-xl font-semibold whitespace-nowrap dark:text-white">
            News Feed
          </span>
        </div>
      </nav>
      <FeedList />
    </main>
  );
}

export default App;
