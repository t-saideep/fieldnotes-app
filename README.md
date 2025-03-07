# FieldNotes

A smart note-taking application that uses LLM (Large Language Model) technology to extract structured data from free-form text notes. This allows for powerful search and retrieval capabilities.

## Features

- Create and manage free-form text notes
- Automatic extraction of structured data using OpenAI's LLM
- Tag-based organization with different types (entities, activities, times, quantities, relations)
- Natural language search with AI-generated answers
- Clean, modern UI with animations

## Project Structure

The application is built with a clear separation of concerns:

### Backend (Server)

- **Data Layer**: SQLite database with models for entries, tags, and their relationships
- **LLM Layer**: Integration with OpenAI API for structured data extraction and query answering
- **API Layer**: Express routes for CRUD operations and search functionality

### Frontend (Client)

- **UI Layer**: React components with Framer Motion animations
- **Service Layer**: API client for communicating with the backend
- **Routing**: React Router for navigation between pages

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- OpenAI API key

### Installation

1. Clone the repository:

   ```
   git clone https://github.com/yourusername/fieldnotes.git
   cd fieldnotes
   ```

2. Install dependencies:

   ```
   npm run install-all
   ```

3. Create a `.env` file in the server directory:

   ```
   OPENAI_API_KEY=your_openai_api_key_here
   PORT=5000
   ```

4. Start the development server:
   ```
   npm start
   ```

## Usage

### Adding Notes

1. Navigate to the home page
2. Enter your note in the text field (e.g., "Laya fell asleep at 8pm")
3. Click "Save Note"
4. The system will automatically extract structured data and display it as tags

### Searching Notes

1. Navigate to the search page
2. Enter a natural language query (e.g., "What time does Laya usually fall asleep?")
3. View the AI-generated answer and matching notes

## Technical Details

### Database Schema

- **entries**: Stores raw text notes with timestamps
- **tags**: Stores extracted entities, activities, etc. with normalized names
- **entry_tags**: Junction table linking entries to tags with optional metadata

### LLM Processing

The application uses OpenAI's GPT models to:

1. Extract structured information from notes
2. Parse search queries into structured parameters
3. Generate answers based on relevant notes

### Tag Types

- **entity**: People, places, objects, organizations, events
- **activity**: Actions or events that occurred
- **time**: When events happened
- **quantity**: Numerical values with units
- **relation**: How entities relate to each other

## Future Enhancements

- User authentication and multi-user support
- Advanced filtering and sorting options
- Customizable tag taxonomy
- Mobile application
- AWS deployment for production use

## License

This project is licensed under the MIT License - see the LICENSE file for details.
