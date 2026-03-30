# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

It uses [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) which uses [Babel](https://babeljs.io/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## E2E Testing

E2E tests use Playwright and run against the backend test database (`news_feed_test`).

### Setup (One-time or after database reset)

```bash
cd ../backend
npm run test:setup && npm run db:seed
```

This creates the test database, runs migrations, and seeds test data.

### Running Tests

1. **Start backend with test config** (in backend directory):
   ```bash
   cd ../backend
   npm run start:dev:testui
   ```

2. **Run e2e tests** (in frontend directory):
   ```bash
   npm run test:e2e
   ```

### Additional Commands

- `npm run test:e2e:ui` - Run tests with Playwright UI
- `npm run test:e2e:debug` - Run tests in debug mode
- `npm run test:e2e:report` - View test report
