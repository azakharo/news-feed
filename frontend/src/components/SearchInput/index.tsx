import {useState, useCallback} from 'react';
import {TextInput} from 'flowbite-react';
import {HiSearch, HiX} from 'react-icons/hi';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export const SearchInput = ({
  value,
  onChange,
  placeholder = 'Search posts...',
}: SearchInputProps) => {
  const [localValue, setLocalValue] = useState(value);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      setLocalValue(newValue);
      onChange(newValue);
    },
    [onChange],
  );

  const handleClear = useCallback(() => {
    setLocalValue('');
    onChange('');
  }, [onChange]);

  return (
    <div className="relative">
      <TextInput
        type="text"
        value={localValue}
        onChange={handleChange}
        placeholder={placeholder}
        className="w-full"
        sizing="lg"
        icon={HiSearch}
      />
      {localValue && (
        <button
          onClick={handleClear}
          className="absolute top-1/2 right-3 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          type="button"
          aria-label="Clear search"
        >
          <HiX className="h-5 w-5" />
        </button>
      )}
    </div>
  );
};
