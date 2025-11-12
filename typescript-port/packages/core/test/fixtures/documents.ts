/**
 * Test fixtures for document data
 */

export const testDocuments = {
  doc1: {
    id: 'doc-001',
    title: 'Test Document 1',
    content: 'This is test document number 1',
    ownerId: 'user-alice-001',
    folderId: null,
    tags: ['test', 'sample'],
    createdAt: new Date('2024-01-01T10:00:00Z'),
    updatedAt: new Date('2024-01-01T10:00:00Z'),
  },
  doc2: {
    id: 'doc-002',
    title: 'Test Document 2',
    content: 'This is test document number 2',
    ownerId: 'user-alice-001',
    folderId: 'folder-001',
    tags: ['test'],
    createdAt: new Date('2024-01-02T10:00:00Z'),
    updatedAt: new Date('2024-01-02T10:00:00Z'),
  },
  doc3: {
    id: 'doc-003',
    title: 'Shared Document',
    content: 'This document is shared between users',
    ownerId: 'user-bob-002',
    folderId: null,
    tags: ['shared', 'collaboration'],
    createdAt: new Date('2024-01-03T10:00:00Z'),
    updatedAt: new Date('2024-01-03T10:00:00Z'),
  },
};

export const testFolders = {
  folder1: {
    id: 'folder-001',
    name: 'Work',
    parentId: null,
    ownerId: 'user-alice-001',
    createdAt: new Date('2024-01-01T09:00:00Z'),
  },
  folder2: {
    id: 'folder-002',
    name: 'Personal',
    parentId: null,
    ownerId: 'user-alice-001',
    createdAt: new Date('2024-01-01T09:00:00Z'),
  },
  folder3: {
    id: 'folder-003',
    name: 'Projects',
    parentId: 'folder-001',
    ownerId: 'user-alice-001',
    createdAt: new Date('2024-01-01T09:30:00Z'),
  },
};

export const longDocument = {
  id: 'doc-long-001',
  title: 'Long Test Document',
  content: 'A'.repeat(10000), // 10KB of content
  ownerId: 'user-alice-001',
  folderId: null,
  tags: ['test', 'performance'],
  createdAt: new Date('2024-01-01T10:00:00Z'),
  updatedAt: new Date('2024-01-01T10:00:00Z'),
};
