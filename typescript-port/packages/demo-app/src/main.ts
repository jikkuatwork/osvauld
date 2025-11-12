/**
 * Osvauld Demo App
 *
 * Main application logic
 */

import { Osvauld, type Document as OsvauldDocument, type Folder, type FolderNode, Capability } from '@osvauld/core';

// Extended folder type with children (for tree rendering)
interface FolderWithChildren extends Folder {
  children?: FolderWithChildren[];
}

// Convert FolderNode to FolderWithChildren
function convertFolderNode(node: FolderNode): FolderWithChildren {
  const folderWithChildren: FolderWithChildren = {
    ...node.folder,
    children: node.children.map(convertFolderNode),
  };
  return folderWithChildren;
}

// Global state
let app: Osvauld;
let currentDocumentId: string | null = null;

// Initialize app
function init() {
  app = new Osvauld({ dbName: 'osvauld-demo' });
  setupEventListeners();
}

// ====================  Event Listeners ====================

function setupEventListeners() {
  // Auth tabs
  document.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const tab = (e.target as HTMLElement).dataset.tab;
      switchTab(tab!);
    });
  });

  // Login form
  document.getElementById('loginForm')!.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = (document.getElementById('login-username') as HTMLInputElement).value;
    const password = (document.getElementById('login-password') as HTMLInputElement).value;
    await handleLogin(username, password);
  });

  // Register form
  document.getElementById('registerForm')!.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = (document.getElementById('register-username') as HTMLInputElement).value;
    const email = (document.getElementById('register-email') as HTMLInputElement).value;
    const password = (document.getElementById('register-password') as HTMLInputElement).value;
    await handleRegister(username, password, email);
  });

  // MetaMask button
  document.getElementById('metamaskBtn')!.addEventListener('click', handleMetaMaskConnect);

  // Logout
  document.getElementById('logoutBtn')!.addEventListener('click', handleLogout);

  // New document
  document.getElementById('newDocBtn')!.addEventListener('click', showNewDocumentEditor);

  // New folder
  document.getElementById('newFolderBtn')!.addEventListener('click', showNewFolderModal);

  // Stats
  document.getElementById('statsBtn')!.addEventListener('click', showStatsModal);

  // Search
  const searchInput = document.getElementById('searchInput') as HTMLInputElement;
  searchInput.addEventListener('input', debounce(handleSearch, 300));

  // Editor actions
  document.getElementById('saveBtn')!.addEventListener('click', handleSaveDocument);
  document.getElementById('closeEditorBtn')!.addEventListener('click', closeEditor);
  document.getElementById('favoriteBtn')!.addEventListener('click', handleToggleFavorite);
  document.getElementById('shareBtn')!.addEventListener('click', showShareModal);

  // Modal close
  document.querySelector('.modal-close')!.addEventListener('click', closeModal);
  document.getElementById('modal')!.addEventListener('click', (e) => {
    if (e.target === document.getElementById('modal')) {
      closeModal();
    }
  });
}

// ==================== Authentication ====================

function switchTab(tab: string) {
  document.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.getAttribute('data-tab') === tab);
  });
  document.querySelectorAll('.tab-content').forEach((content) => {
    content.classList.toggle('active', content.id === `${tab}-form`);
  });
}

async function handleLogin(username: string, password: string) {
  try {
    showError('');
    await app.login(username, password);
    showApp(username);
  } catch (err) {
    showError(err instanceof Error ? err.message : 'Login failed');
  }
}

async function handleRegister(username: string, password: string, email?: string) {
  try {
    showError('');
    await app.register(username, password, email);
    showApp(username);
  } catch (err) {
    showError(err instanceof Error ? err.message : 'Registration failed');
  }
}

async function handleMetaMaskConnect() {
  try {
    // Check if MetaMask is installed
    if (typeof window.ethereum === 'undefined') {
      showError('MetaMask is not installed. Please install MetaMask to continue.');
      return;
    }

    showError('');

    // Request account access
    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
    const account = accounts[0];

    // For demo purposes, use MetaMask address as username
    // In production, you'd implement proper Web3 authentication
    showError(`MetaMask connected: ${account}`);
    alert('MetaMask authentication is a work in progress. Please use username/password login for now.');

  } catch (err) {
    showError(err instanceof Error ? err.message : 'MetaMask connection failed');
  }
}

function handleLogout() {
  app.logout();
  document.getElementById('app-screen')!.style.display = 'none';
  document.getElementById('login-screen')!.style.display = 'block';
  currentDocumentId = null;
}

function showApp(username: string) {
  document.getElementById('login-screen')!.style.display = 'none';
  document.getElementById('app-screen')!.style.display = 'block';
  document.getElementById('username-display')!.textContent = username;

  // Load initial data
  loadDocuments();
  loadFolders();
}

function showError(message: string) {
  const errorEl = document.getElementById('error-message')!;
  if (message) {
    errorEl.textContent = message;
    errorEl.style.display = 'block';
  } else {
    errorEl.style.display = 'none';
  }
}

// ==================== Documents ====================

async function loadDocuments() {
  try {
    const docs = await app.listDocuments();
    renderDocuments(docs);
  } catch (err) {
    console.error('Failed to load documents:', err);
  }
}

function renderDocuments(docs: OsvauldDocument[]) {
  const container = document.getElementById('documentList')!;

  if (docs.length === 0) {
    container.innerHTML = `
      <div class="text-center mt-2">
        <p>No documents yet. Create your first document!</p>
      </div>
    `;
    return;
  }

  container.innerHTML = docs
    .map(
      (doc) => `
      <div class="document-card" data-id="${doc.id}">
        <div class="document-card-header">
          <div class="document-card-title">${escapeHtml(doc.title)}</div>
          <div class="document-card-favorite">${doc.isFavorite ? '⭐' : ''}</div>
        </div>
        <div class="document-card-tags">
          ${doc.tags?.map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join('') || ''}
        </div>
        <div class="document-card-footer">
          Updated: ${new Date(doc.updatedAt).toLocaleDateString()}
        </div>
      </div>
    `
    )
    .join('');

  // Add click handlers
  container.querySelectorAll('.document-card').forEach((card) => {
    card.addEventListener('click', () => {
      const docId = card.getAttribute('data-id')!;
      openDocument(docId);
    });
  });
}

async function openDocument(docId: string) {
  try {
    const { document: doc, content } = await app.getDocument(docId);
    currentDocumentId = docId;

    // Show editor
    document.getElementById('documentList')!.style.display = 'none';
    document.getElementById('documentEditor')!.style.display = 'block';

    // Fill editor
    (document.getElementById('docTitle') as HTMLInputElement).value = doc.title;
    (document.getElementById('docContent') as HTMLTextAreaElement).value = content;
    (document.getElementById('docTags') as HTMLInputElement).value = doc.tags?.join(', ') || '';

    // Update favorite button
    document.getElementById('favoriteBtn')!.textContent = doc.isFavorite ? '⭐' : '☆';
  } catch (err) {
    alert('Failed to open document: ' + (err instanceof Error ? err.message : 'Unknown error'));
  }
}

function showNewDocumentEditor() {
  currentDocumentId = null;
  document.getElementById('documentList')!.style.display = 'none';
  document.getElementById('documentEditor')!.style.display = 'block';

  (document.getElementById('docTitle') as HTMLInputElement).value = '';
  (document.getElementById('docContent') as HTMLTextAreaElement).value = '';
  (document.getElementById('docTags') as HTMLInputElement).value = '';
  document.getElementById('favoriteBtn')!.textContent = '☆';
}

async function handleSaveDocument() {
  try {
    const title = (document.getElementById('docTitle') as HTMLInputElement).value.trim();
    const content = (document.getElementById('docContent') as HTMLTextAreaElement).value;
    const tagsStr = (document.getElementById('docTags') as HTMLInputElement).value;
    const tags = tagsStr ? tagsStr.split(',').map((t) => t.trim()) : [];

    if (!title) {
      alert('Please enter a document title');
      return;
    }

    if (currentDocumentId) {
      // Update existing
      await app.updateDocument(currentDocumentId, content);
      if (tags.length > 0) {
        await app.addTags(currentDocumentId, tags);
      }
      alert('Document updated!');
    } else {
      // Create new
      await app.createDocument(title, content, { tags });
      alert('Document created!');
    }

    closeEditor();
    loadDocuments();
  } catch (err) {
    alert('Failed to save document: ' + (err instanceof Error ? err.message : 'Unknown error'));
  }
}

async function handleToggleFavorite() {
  if (!currentDocumentId) return;

  try {
    const doc = await app.toggleFavorite(currentDocumentId);
    document.getElementById('favoriteBtn')!.textContent = doc.isFavorite ? '⭐' : '☆';
  } catch (err) {
    alert('Failed to toggle favorite: ' + (err instanceof Error ? err.message : 'Unknown error'));
  }
}

function closeEditor() {
  document.getElementById('documentEditor')!.style.display = 'none';
  document.getElementById('documentList')!.style.display = 'grid';
  currentDocumentId = null;
}

// ==================== Folders ====================

async function loadFolders() {
  try {
    const folderNodes = await app.getFolderTree();
    const folders = folderNodes.map(convertFolderNode);
    renderFolders(folders);
  } catch (err) {
    console.error('Failed to load folders:', err);
  }
}

function renderFolders(folders: FolderWithChildren[], container?: HTMLElement, depth = 0) {
  if (!container) {
    container = document.getElementById('folderTree')!;
    container.innerHTML = '';
  }

  folders.forEach((folder) => {
    const folderDiv = document.createElement('div');
    folderDiv.className = 'folder-item';
    folderDiv.style.paddingLeft = `${depth * 16}px`;
    folderDiv.textContent = `📁 ${folder.name}`;
    container!.appendChild(folderDiv);

    if (folder.children && folder.children.length > 0) {
      renderFolders(folder.children, container, depth + 1);
    }
  });
}

function showNewFolderModal() {
  showModal(`
    <h2>Create New Folder</h2>
    <div class="form-group">
      <label>Folder Name</label>
      <input type="text" id="newFolderName" class="form-control" />
    </div>
    <button onclick="window.createFolder()" class="btn btn-primary">Create</button>
  `);
}

async function createFolder() {
  const name = (document.getElementById('newFolderName') as HTMLInputElement).value.trim();
  if (!name) {
    alert('Please enter a folder name');
    return;
  }

  try {
    await app.createFolder(name);
    closeModal();
    loadFolders();
  } catch (err) {
    alert('Failed to create folder: ' + (err instanceof Error ? err.message : 'Unknown error'));
  }
}

// Expose to window for onclick
(window as any).createFolder = createFolder;

// ==================== Search ====================

async function handleSearch() {
  const query = (document.getElementById('searchInput') as HTMLInputElement).value.trim();
  const fuzzy = (document.getElementById('fuzzySearch') as HTMLInputElement).checked;

  if (!query) {
    loadDocuments();
    return;
  }

  try {
    const results = app.search(query, { fuzzy });

    // Load full documents for the results
    const docs = await app.listDocuments();
    const filteredDocs = docs.filter((doc) => results.some((r) => r.id === doc.id));

    renderDocuments(filteredDocs);
  } catch (err) {
    console.error('Search failed:', err);
  }
}

// ==================== Sharing ====================

function showShareModal() {
  if (!currentDocumentId) return;

  showModal(`
    <h2>Share Document</h2>
    <div class="form-group">
      <label>Recipient Public Key (base64url)</label>
      <input type="text" id="shareRecipientKey" class="form-control" placeholder="Recipient's public key" />
    </div>
    <div class="form-group">
      <label>Capabilities</label>
      <div>
        <label><input type="checkbox" id="capRead" checked /> Read</label>
        <label><input type="checkbox" id="capWrite" /> Write</label>
        <label><input type="checkbox" id="capShare" /> Share</label>
      </div>
    </div>
    <div class="form-group">
      <label>Expires In (hours)</label>
      <input type="number" id="shareExpires" class="form-control" value="168" />
    </div>
    <button onclick="window.createShare()" class="btn btn-primary">Create Share Link</button>
    <div id="shareResult" class="mt-2"></div>
  `);
}

async function createShare() {
  const recipientKey = (document.getElementById('shareRecipientKey') as HTMLInputElement).value.trim();
  const capRead = (document.getElementById('capRead') as HTMLInputElement).checked;
  const capWrite = (document.getElementById('capWrite') as HTMLInputElement).checked;
  const capShare = (document.getElementById('capShare') as HTMLInputElement).checked;
  const expires = parseInt((document.getElementById('shareExpires') as HTMLInputElement).value, 10);

  if (!recipientKey) {
    alert('Please enter recipient public key');
    return;
  }

  const capabilities: Capability[] = [];
  if (capRead) capabilities.push(Capability.READ);
  if (capWrite) capabilities.push(Capability.WRITE);
  if (capShare) capabilities.push(Capability.SHARE);

  try {
    const { shareId, token } = await app.shareDocument(
      currentDocumentId!,
      recipientKey,
      capabilities,
      expires * 60 * 60 * 1000
    );

    document.getElementById('shareResult')!.innerHTML = `
      <div style="background: #d1fae5; padding: 12px; border-radius: 8px; margin-top: 16px;">
        <p><strong>Share ID:</strong> ${shareId}</p>
        <p><strong>UCAN Token:</strong></p>
        <textarea style="width: 100%; min-height: 100px; font-family: monospace; font-size: 12px;">${token}</textarea>
        <button onclick="navigator.clipboard.writeText('${token}')" class="btn btn-secondary btn-sm mt-2">Copy Token</button>
      </div>
    `;
  } catch (err) {
    alert('Failed to create share: ' + (err instanceof Error ? err.message : 'Unknown error'));
  }
}

// Expose to window
(window as any).createShare = createShare;

// ==================== Stats ====================

async function showStatsModal() {
  try {
    const stats = await app.getStats();

    showModal(`
      <h2>📊 Statistics</h2>
      <div style="margin-top: 24px;">
        <p><strong>Documents:</strong> ${stats.documents}</p>
        <p><strong>Folders:</strong> ${stats.folders}</p>
        <p><strong>Share Links:</strong> ${stats.shares}</p>
        <p><strong>Search Index Documents:</strong> ${stats.searchIndex.documentCount}</p>
        <p><strong>Search Index Terms:</strong> ${stats.searchIndex.termCount}</p>
      </div>
    `);
  } catch (err) {
    alert('Failed to load stats: ' + (err instanceof Error ? err.message : 'Unknown error'));
  }
}

// ==================== Modal ====================

function showModal(content: string) {
  document.getElementById('modalBody')!.innerHTML = content;
  document.getElementById('modal')!.classList.add('active');
}

function closeModal() {
  document.getElementById('modal')!.classList.remove('active');
}

// ==================== Utilities ====================

function debounce(func: Function, wait: number) {
  let timeout: NodeJS.Timeout;
  return function executedFunction(...args: any[]) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Initialize on load
init();
