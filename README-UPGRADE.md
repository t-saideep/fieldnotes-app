# Fieldnotes Upgrade Guide: Tag-Based to Vector Search

This guide walks you through the process of upgrading Fieldnotes from the tag-based search system to the new vector-based search system using OpenAI embeddings.

## Overview of Changes

The upgrade replaces the following components:

1. **Tag-based search** → **Vector similarity search** (with fallback to recent entries)
2. **LLM-based tag generation** → **OpenAI embeddings**
3. **Manually maintained relations** → **Automatic semantic similarity**

## Simplified Installation Steps

### 1. Set Up Your OpenAI API Key

Copy the example .env file and add your OpenAI API key:

```bash
# Navigate to the server directory
cd server

# Copy the example .env file
cp .env.example .env

# Edit the .env file and add your OpenAI API key
nano .env
```

### 2. Run the Migration Script

Run the simplified migration script to ensure your database is ready:

```bash
# From the server directory
node data/migrate-to-simplified.js
```

### 3. Start the Application

```bash
# From the project root
npm start
```

## How This Works

This simplified approach:

1. Stores embeddings directly in the entries table
2. Uses recent entries when vector search isn't available
3. Provides helpful error messages when OpenAI API issues occur
4. Makes the system work even without vector search capabilities

## Features

- **No special extensions required**: Works with standard SQLite
- **More accurate than tags**: Uses semantic understanding instead of exact tag matches
- **No more manual tagging**: Entries are automatically indexed by their meaning
- **Better context for questions**: The system provides better answers using relevant entries
- **Resilient design**: Falls back gracefully when features are unavailable

## Removing Old Tag Data (Optional)

After confirming everything works properly, you can remove the old tag-related tables:

```sql
-- Using SQLite CLI
DROP TABLE entry_tags;
DROP TABLE tags;
```

Or run these commands through your preferred database tool.
