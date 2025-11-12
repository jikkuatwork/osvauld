# Osvauld Demo App 🎯

Visual web interface for Osvauld password manager - **THIS IS WHAT YOU CAME TO SEE!**

## 🚀 Quick Start

```bash
cd packages/demo-app
npm install
npm run dev
```

Then open **http://localhost:5173** in your browser!

## ✨ Features You Can See & Click

### 🔐 **Authentication**
- **Login/Register** - Create account with username & password
- **MetaMask Button** - Visual MetaMask connection (WIP)
- Beautiful gradient login screen

### 📝 **Document Management**
- **Create Documents** - Click "➕ New Document" button
- **Edit Documents** - Click any document card to open editor
- **Save/Update** - Real-time saving with visual feedback
- **Delete** - Remove documents you don't need
- **Favorites** - Star/unstar documents with ⭐ button
- **Tags** - Add comma-separated tags to documents

### 📁 **Folder Organization**
- **Visual Folder Tree** - See folder hierarchy in sidebar
- **Create Folders** - Click "➕ New Folder"
- **Nested Folders** - Unlimited folder depth

### 🔍 **Search**
- **Live Search** - Type to search (300ms debounce)
- **Fuzzy Search** - Checkbox for typo-tolerant search
- **Instant Results** - See matching documents immediately

### 🔗 **Sharing (UCAN Tokens)**
- **Share Button** - Click share on any document
- **Capability Selection** - Choose Read/Write/Share permissions
- **Expiration** - Set hours until share link expires
- **Copy Token** - One-click copy of UCAN token
- **Visual Share Modal** - Beautiful UI for sharing

### 📊 **Statistics**
- **Live Stats** - Click "📊 Statistics" button
- **Document Count** - Total documents
- **Folder Count** - Total folders
- **Share Links** - Active shares
- **Search Index Stats** - Indexed terms

## 🎨 Visual Design

- **Gradient Background** - Purple gradient login screen
- **Card-Based UI** - Modern document cards
- **Hover Effects** - Interactive feedback
- **Color-Coded** - Purple primary, tags, favorites
- **Responsive** - Works on desktop and mobile
- **Modal Dialogs** - Clean popups for actions

## 🖱️ User Flow

### First Time User:
1. Open http://localhost:5173
2. Click "Register" tab
3. Enter username & password
4. Click "Register" button
5. See main app with empty document list
6. Click "➕ New Document"
7. Type title & content
8. Click "Save"
9. See your document card appear!

### Existing User:
1. Open http://localhost:5173
2. Enter credentials on "Login" tab
3. Click "Login"
4. See all your documents
5. Click any document to edit
6. Use search bar to find documents
7. Create folders to organize
8. Share documents with others

## 🦊 MetaMask Connection

**Visual Feature Available:**
- Orange "🦊 Connect MetaMask" button on login screen
- Click to trigger MetaMask popup
- Shows connected address

**Status:** Button visible and clickable, full Web3 auth coming soon!

## 📱 What You'll See

### Login Screen:
```
┌─────────────────────────────┐
│      🔐 Osvauld             │
│  Secure Password Manager    │
│                             │
│  ┌─────────┬─────────┐    │
│  │  Login  │ Register│    │
│  └─────────┴─────────┘    │
│                             │
│  Username: [________]       │
│  Password: [________]       │
│  [      Login      ]       │
│                             │
│         OR                  │
│                             │
│  [🦊 Connect MetaMask]     │
└─────────────────────────────┘
```

### Main App:
```
┌────────────────────────────────────────────────┐
│ 🔐 Osvauld          alice    [Logout]         │
├──────────┬─────────────────────────────────────┤
│          │                                      │
│ [+ New]  │  🔍 [Search...]  □ Fuzzy           │
│          │                                      │
│ Folders  │  ┌──────┐ ┌──────┐ ┌──────┐       │
│ 📁 Work  │  │Gmail │ │AWS   │ │Notes │       │
│ 📁 Perso │  │⭐    │ │      │ │      │       │
│          │  │email │ │work  │ │      │       │
│ [+ Fold] │  └──────┘ └──────┘ └──────┘       │
│          │                                      │
│ [📊Stats]│                                      │
│          │                                      │
└──────────┴─────────────────────────────────────┘
```

### Document Editor:
```
┌────────────────────────────────────────────────┐
│ [Gmail_____________] ⭐ [Share] [Save] [Close] │
├────────────────────────────────────────────────┤
│                                                 │
│  Email: gmail@example.com                      │
│  Password: secret123                           │
│  2FA: enabled                                  │
│                                                 │
│                                                 │
├────────────────────────────────────────────────┤
│ Tags: email, personal                          │
└────────────────────────────────────────────────┘
```

## 🛠️ Technical Stack

- **Vite** - Lightning fast dev server
- **TypeScript** - Type safety
- **Vanilla JS** - No framework overhead
- **CSS Grid/Flexbox** - Modern layout
- **@osvauld/core** - All the crypto & logic

## 🎯 Demo Scenarios

### Scenario 1: Password Storage
1. Register as "alice"
2. Create document "Gmail Password"
3. Enter your email & password
4. Add tags: "email, important"
5. Save and see it appear
6. Search for "gmail"
7. Click to view/edit

### Scenario 2: Folder Organization
1. Create folder "Work"
2. Create folder "Personal"
3. Create documents in each
4. See folder tree update
5. Visual organization!

### Scenario 3: Sharing
1. Open any document
2. Click "Share" button
3. Enter recipient key
4. Select "Read, Write"
5. Set expiration: 24 hours
6. Click "Create Share Link"
7. Copy UCAN token
8. Share with colleague!

### Scenario 4: Search
1. Create 5+ documents
2. Type in search bar
3. Watch instant filtering
4. Enable fuzzy search
5. Try misspelling
6. Still finds results!

## 🚨 Important Notes

- **All data stored locally** in IndexedDB
- **All encryption client-side** (AES-GCM)
- **No server** - completely offline
- **MetaMask** button visible but auth WIP
- **P2P sync** not live yet (mocked)

## 🐛 Known Limitations

- MetaMask: Button present, full auth pending
- Real-time collab: UI ready, WebRTC pending
- Mobile: Works but optimized for desktop
- Production: This is a demo, needs hardening

## 🎉 Success Criteria

**You'll know it works when:**
✅ Login screen looks beautiful
✅ You can register & login
✅ Documents appear as cards
✅ Editor opens when you click
✅ Save button creates/updates docs
✅ Search filters instantly
✅ Folders show in tree
✅ Share modal displays token
✅ Stats show real numbers
✅ Everything feels smooth & responsive

## 📸 Screenshots

*(When you run it, take screenshots and add them here!)*

## 🔗 Links

- Core Library: `../core/`
- CLI Tool: `../cli/`
- GitHub: https://github.com/your-repo/osvauld

---

**Built with ❤️ to prove TypeScript rocks for crypto apps!** 🚀
