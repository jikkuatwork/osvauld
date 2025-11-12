# Osvauld CLI

Command-line interface for Osvauld password manager.

## Installation

```bash
cd packages/cli
npm install
npm run build
npm link  # Make 'osvauld' command available globally
```

## Usage

### Authentication

```bash
# Register a new user
osvauld register alice password123 --email alice@example.com

# Login
osvauld login alice password123

# Show current user
osvauld whoami

# Logout
osvauld logout
```

### Documents

```bash
# Create a document
osvauld create "My Password" "secret123" --tags "work,important"

# List all documents
osvauld list

# List favorites only
osvauld list --favorites

# Get document
osvauld get <documentId>

# Get content only
osvauld get <documentId> --content-only

# Update document
osvauld update <documentId> "new content"

# Delete document
osvauld delete <documentId> --yes

# Toggle favorite
osvauld favorite <documentId>

# Add tags
osvauld tag <documentId> "tag1,tag2"
```

### Folders

```bash
# Create folder
osvauld folder "Work"

# Create subfolder
osvauld folder "Projects" --parent <parentId>

# List folder tree
osvauld folders

# Move folder
osvauld move-folder <folderId> --parent <newParentId>

# Delete folder
osvauld delete-folder <folderId> --yes
```

### Search

```bash
# Search documents
osvauld search "password"

# Fuzzy search
osvauld search "pasword" --fuzzy

# Auto-suggest
osvauld suggest "My" --limit 5
```

### Sharing

```bash
# Share a document
osvauld share <documentId> <recipientPublicKey> --capabilities read,write

# Share with custom expiration
osvauld share <documentId> <recipientPublicKey> --expires 24  # 24 hours

# List shares for a document
osvauld shares <documentId>

# Revoke share
osvauld revoke <shareId> --yes

# Verify access
osvauld verify <ucanToken> <documentId> read
```

### Statistics

```bash
# Show statistics
osvauld stats
```

## Examples

### Complete Workflow

```bash
# 1. Register and login
osvauld register alice password123
osvauld login alice password123

# 2. Create folder structure
osvauld folder "Work"
osvauld folder "Personal"

# 3. Create documents
osvauld create "Gmail" "mypassword123" --tags "email,personal"
osvauld create "AWS" "awskey123" --tags "work,cloud"

# 4. List documents
osvauld list

# 5. Search
osvauld search "email"

# 6. Share a document
osvauld share <doc-id> <recipient-key> --capabilities read

# 7. Check stats
osvauld stats
```

## Configuration

Configuration is stored in `~/.osvauld/config.json`

Database is stored in `~/.osvauld/osvauld.db`

## Development

```bash
# Run in development mode
npm run dev -- register alice password123

# Build
npm run build

# Run built version
npm start -- --help
```
