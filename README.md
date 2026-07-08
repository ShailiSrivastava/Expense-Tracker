# Nova Finance Expense Tracker

A polished full-stack expense tracker built with a modern interface, REST API backend, budgeting tools, analytics, recurring transaction support, and CSV export.

## Features
- Add, edit, and delete income or expense transactions
- Filter by month, transaction type, category, and search text
- Track budget usage with live progress
- Category breakdown for spending insights
- Recurring transactions support
- Export transaction history as CSV
- Dark/light theme toggle
- Data persistence via server-side JSON storage

## Tech Stack
- Node.js for backend API
- Vanilla HTML, CSS, and JavaScript for frontend
- Local JSON file persistence (`data/transactions.json`)

## Setup and Run
1. Open a terminal in this project folder.
2. Install Node.js if needed: https://nodejs.org
3. Run the server:
   ```bash
   node server.js
   ```
4. Open your browser to:
   ```bash
   http://localhost:3000
   ```

## Project Structure
- `index.html` — main application shell
- `styles.css` — responsive styling and theme support
- `app.js` — frontend app logic and API integration
- `server.js` — backend REST API and static file server
- `data/transactions.json` — stored transactions data

## API Endpoints
- `GET /api/transactions` — list all transactions
- `POST /api/transactions` — add a new transaction
- `PUT /api/transactions/:id` — update an existing transaction
- `DELETE /api/transactions/:id` — remove a transaction
- `GET /api/export` — download transaction history as CSV

## Notes
- The app uses a built-in Node server and does not require additional dependencies.
- Budget and theme preferences are stored in browser `localStorage`.
- Transaction data is persisted in `data/transactions.json` on the server.

## License
MIT
