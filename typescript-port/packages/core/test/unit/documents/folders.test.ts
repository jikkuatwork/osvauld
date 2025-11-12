import 'fake-indexeddb/auto';
import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { FolderManager } from '../../../src/documents/folders';
import { FolderRepository } from '../../../src/storage/repositories/folder';
import { initDatabase } from '../../../src/storage/indexeddb';

describe('Folder Manager', () => {
  let manager: FolderManager;
  let folderRepo: FolderRepository;
  const userId = 'user-123';
  const userId2 = 'user-456';

  beforeEach(async () => {
    const db = initDatabase('test-folder-manager-' + Date.now());
    folderRepo = new FolderRepository(db.folders);
    manager = new FolderManager(folderRepo);
  });

  describe('createFolder', () => {
    it('should create root folder', async () => {
      const folder = await manager.createFolder('My Folder', userId);

      expect(folder.id).toBeDefined();
      expect(folder.name).toBe('My Folder');
      expect(folder.ownerId).toBe(userId);
      expect(folder.parentId).toBeUndefined();
      expect(folder.createdAt).toBeInstanceOf(Date);
    });

    it('should create nested folder', async () => {
      const parent = await manager.createFolder('Parent', userId);
      const child = await manager.createFolder('Child', userId, parent.id);

      expect(child.parentId).toBe(parent.id);
    });

    it('should reject creating in another user folder', async () => {
      const parent = await manager.createFolder('Parent', userId);

      await expect(
        manager.createFolder('Child', userId2, parent.id)
      ).rejects.toThrow('Cannot create folder in another user\'s folder');
    });
  });

  describe('getFolder', () => {
    it('should get folder', async () => {
      const created = await manager.createFolder('Test', userId);
      const retrieved = await manager.getFolder(created.id, userId);

      expect(retrieved.id).toBe(created.id);
      expect(retrieved.name).toBe('Test');
    });

    it('should deny access to another user folder', async () => {
      const folder = await manager.createFolder('Test', userId);

      await expect(manager.getFolder(folder.id, userId2)).rejects.toThrow('Access denied');
    });
  });

  describe('renameFolder', () => {
    it('should rename folder', async () => {
      const folder = await manager.createFolder('Old Name', userId);
      const renamed = await manager.renameFolder(folder.id, 'New Name', userId);

      expect(renamed.name).toBe('New Name');
      expect(renamed.updatedAt.getTime()).toBeGreaterThan(folder.createdAt.getTime());
    });

    it('should deny rename to non-owner', async () => {
      const folder = await manager.createFolder('Test', userId);

      await expect(manager.renameFolder(folder.id, 'New', userId2)).rejects.toThrow(
        'Access denied'
      );
    });
  });

  describe('deleteFolder', () => {
    it('should delete empty folder', async () => {
      const folder = await manager.createFolder('Test', userId);

      await manager.deleteFolder(folder.id, userId);

      await expect(folderRepo.get(folder.id)).rejects.toThrow();
    });

    it('should reject deleting folder with children', async () => {
      const parent = await manager.createFolder('Parent', userId);
      await manager.createFolder('Child', userId, parent.id);

      await expect(manager.deleteFolder(parent.id, userId, false)).rejects.toThrow(
        'Cannot delete folder with children'
      );
    });

    it('should recursively delete folder with children', async () => {
      const parent = await manager.createFolder('Parent', userId);
      const child1 = await manager.createFolder('Child 1', userId, parent.id);
      const child2 = await manager.createFolder('Child 2', userId, parent.id);

      await manager.deleteFolder(parent.id, userId, true);

      await expect(folderRepo.get(parent.id)).rejects.toThrow();
      await expect(folderRepo.get(child1.id)).rejects.toThrow();
      await expect(folderRepo.get(child2.id)).rejects.toThrow();
    });

    it('should deny deletion to non-owner', async () => {
      const folder = await manager.createFolder('Test', userId);

      await expect(manager.deleteFolder(folder.id, userId2)).rejects.toThrow(
        'Access denied'
      );
    });
  });

  describe('listFolders', () => {
    it('should list all user folders', async () => {
      await manager.createFolder('Folder 1', userId);
      await manager.createFolder('Folder 2', userId);
      await manager.createFolder('Folder 3', userId);

      const folders = await manager.listFolders(userId);

      expect(folders).toHaveLength(3);
    });

    it('should only list own folders', async () => {
      await manager.createFolder('My Folder', userId);
      await manager.createFolder('Other Folder', userId2);

      const myFolders = await manager.listFolders(userId);
      const otherFolders = await manager.listFolders(userId2);

      expect(myFolders).toHaveLength(1);
      expect(myFolders[0]!.name).toBe('My Folder');
      expect(otherFolders).toHaveLength(1);
      expect(otherFolders[0]!.name).toBe('Other Folder');
    });
  });

  describe('getRootFolders', () => {
    it('should get only root folders', async () => {
      const root1 = await manager.createFolder('Root 1', userId);
      await manager.createFolder('Root 2', userId);
      await manager.createFolder('Child', userId, root1.id);

      const roots = await manager.getRootFolders(userId);

      expect(roots).toHaveLength(2);
      expect(roots.every((f) => !f.parentId)).toBe(true);
    });
  });

  describe('getChildFolders', () => {
    it('should get child folders', async () => {
      const parent = await manager.createFolder('Parent', userId);
      await manager.createFolder('Child 1', userId, parent.id);
      await manager.createFolder('Child 2', userId, parent.id);
      await manager.createFolder('Other', userId);

      const children = await manager.getChildFolders(parent.id, userId);

      expect(children).toHaveLength(2);
      expect(children.every((f) => f.parentId === parent.id)).toBe(true);
    });
  });

  describe('getFolderPath', () => {
    it('should get folder breadcrumb path', async () => {
      const level1 = await manager.createFolder('Level 1', userId);
      const level2 = await manager.createFolder('Level 2', userId, level1.id);
      const level3 = await manager.createFolder('Level 3', userId, level2.id);

      const path = await manager.getFolderPath(level3.id, userId);

      expect(path).toHaveLength(3);
      expect(path[0]!.name).toBe('Level 1');
      expect(path[1]!.name).toBe('Level 2');
      expect(path[2]!.name).toBe('Level 3');
    });

    it('should return single item for root folder', async () => {
      const root = await manager.createFolder('Root', userId);

      const path = await manager.getFolderPath(root.id, userId);

      expect(path).toHaveLength(1);
      expect(path[0]!.name).toBe('Root');
    });
  });

  describe('moveFolder', () => {
    it('should move folder to new parent', async () => {
      const folder = await manager.createFolder('Folder', userId);
      const newParent = await manager.createFolder('New Parent', userId);

      const moved = await manager.moveFolder(folder.id, newParent.id, userId);

      expect(moved.parentId).toBe(newParent.id);
    });

    it('should move folder to root', async () => {
      const parent = await manager.createFolder('Parent', userId);
      const child = await manager.createFolder('Child', userId, parent.id);

      const moved = await manager.moveFolder(child.id, undefined, userId);

      expect(moved.parentId).toBeUndefined();
    });

    it('should prevent moving to another user folder', async () => {
      const folder = await manager.createFolder('My Folder', userId);
      const otherFolder = await manager.createFolder('Other Folder', userId2);

      await expect(
        manager.moveFolder(folder.id, otherFolder.id, userId)
      ).rejects.toThrow('Cannot move to another user\'s folder');
    });

    it('should prevent circular references', async () => {
      const parent = await manager.createFolder('Parent', userId);
      const child = await manager.createFolder('Child', userId, parent.id);

      await expect(
        manager.moveFolder(parent.id, child.id, userId)
      ).rejects.toThrow('Cannot move folder to its own descendant');
    });
  });

  describe('getFolderTree', () => {
    it('should build folder tree structure', async () => {
      const root1 = await manager.createFolder('Root 1', userId);
      const root2 = await manager.createFolder('Root 2', userId);
      const child1 = await manager.createFolder('Child 1', userId, root1.id);
      const child2 = await manager.createFolder('Child 2', userId, root1.id);
      await manager.createFolder('Grandchild', userId, child1.id);

      const tree = await manager.getFolderTree(userId);

      expect(tree).toHaveLength(2);

      const root1Node = tree.find((n) => n.folder.id === root1.id);
      expect(root1Node).toBeDefined();
      expect(root1Node!.children).toHaveLength(2);

      const child1Node = root1Node!.children.find((n) => n.folder.id === child1.id);
      expect(child1Node).toBeDefined();
      expect(child1Node!.children).toHaveLength(1);

      const root2Node = tree.find((n) => n.folder.id === root2.id);
      expect(root2Node).toBeDefined();
      expect(root2Node!.children).toHaveLength(0);
    });
  });
});
