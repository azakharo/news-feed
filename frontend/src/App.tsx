import {useState, useCallback} from 'react';
import {VirtualFeed} from './components/VirtualFeed';
import {SearchInput} from './components/SearchInput';
import {NewItemsBanner} from './components/NewItemsBanner';
import {useDebounce} from './hooks/useDebounce';
import {useNewItemsPoller} from './hooks/useNewItemsPoller';

const SEARCH_DEBOUNCE_MS = 500;

function App() {
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebounce(searchInput, SEARCH_DEBOUNCE_MS);

  // State for new items polling
  const [firstPostCursor, setFirstPostCursor] = useState<string | null>(null);
  const [refreshCallbacks, setRefreshCallbacks] = useState<{
    refetch: () => void;
    scrollToTop: () => void;
  } | null>(null);

  // Poll for new items
  const {newItemsCount} = useNewItemsPoller({
    sinceCursor: firstPostCursor,
    searchQuery: debouncedSearch,
    pollingInterval: 30000,
  });

  // Handle refresh when banner is clicked
  const handleRefreshNewItems = useCallback(() => {
    refreshCallbacks?.refetch();
    refreshCallbacks?.scrollToTop();
  }, [refreshCallbacks]);

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Sticky Header with Search - stays at top during scroll */}
      <nav className="sticky top-0 z-50 border-b border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
        <div className="mx-auto max-w-2xl px-4 py-3">
          <div className="flex items-center gap-4">
            <span className="shrink-0 self-center text-xl font-semibold whitespace-nowrap dark:text-white">
              News Feed
            </span>
            <div className="flex-1">
              <SearchInput
                value={searchInput}
                onChange={setSearchInput}
                placeholder="Search posts..."
              />
            </div>
            {/* New Items Banner - right corner */}
            <NewItemsBanner
              count={newItemsCount}
              onRefresh={handleRefreshNewItems}
              variant="compact"
            />
          </div>
        </div>
      </nav>

      {/* Main content area - window scrollable */}
      <VirtualFeed
        searchQuery={debouncedSearch}
        onFirstCursorChange={setFirstPostCursor}
        onRefreshCallbacksReady={setRefreshCallbacks}
      />
    </main>
  );
}

export default App;
