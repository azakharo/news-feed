import {useState} from 'react';
import {VirtualFeed} from './components/VirtualFeed';
import {SearchInput} from './components/SearchInput';
import {useDebounce} from './hooks/useDebounce';

const SEARCH_DEBOUNCE_MS = 500;

function App() {
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebounce(searchInput, SEARCH_DEBOUNCE_MS);

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Sticky Header with Search - stays at top during scroll */}
      <nav className="sticky top-0 z-50 border-b border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
        <div className="mx-auto max-w-2xl px-4 py-3">
          <div className="flex items-center gap-4">
            <span className="flex-shrink-0 self-center text-xl font-semibold whitespace-nowrap dark:text-white">
              News Feed
            </span>
            <div className="flex-1">
              <SearchInput
                value={searchInput}
                onChange={setSearchInput}
                placeholder="Search posts..."
              />
            </div>
          </div>
        </div>
      </nav>

      {/* Main content area - window scrollable */}
      <VirtualFeed searchQuery={debouncedSearch} />
    </main>
  );
}

export default App;
