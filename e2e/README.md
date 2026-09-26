# E2E Testing with Playwright

This directory contains end-to-end tests for the BlockEditor using Playwright.

See [TEST-PLAN.md](TEST-PLAN.md) for the user journey, acceptance criteria,
regressions, and remaining coverage. See [TEST-RUN.md](TEST-RUN.md) for the latest
verified results. The full document journey is in `writing-journey.spec.js`.

## Running Tests

### Standard test run
```powershell
npm run test:e2e
```

### UI Mode (interactive)
```powershell
npm run test:e2e:ui
```

### Headed mode (see browser)
```powershell
npm run test:e2e:headed
```

### Debug mode
```powershell
npm run test:e2e:debug
```

## Test Structure

- `editor.spec.js` - Basic editor functionality tests
  - Loading and initialization
  - Text input
  - Markdown triggers (e.g., `# ` for headings)
  - Block creation
  - Formatting (bold, italic, etc.)
  - Conversion to markdown/HTML

## Writing New Tests

Create new spec files in this directory following the pattern:

```javascript
import { test, expect } from '@playwright/test';

test.describe('Feature Name', () => {
  test('should do something', async ({ page }) => {
    await page.goto('/');
    // Your test code
  });
});
```

## Playwright MCP Integration

This project is configured to work with Playwright MCP server for GitHub Copilot integration. The MCP configuration is in `.vscode/settings.json`.

After installing Playwright, reload VS Code to activate the MCP server connection:
- Press `Ctrl+Shift+P` (Windows) or `Cmd+Shift+P` (Mac)
- Type "Developer: Reload Window"
- Press Enter

Once connected, you can use browser automation tools directly through GitHub Copilot.

## Configuration

See `playwright.config.js` for test configuration options including:
- Base URL
- Browsers to test
- Screenshots on failure
- Test retries
- Reporters

## CI/CD

Tests are configured to:
- Run with retries in CI environments
- Use a single worker in CI
- Start the dev server automatically before tests
