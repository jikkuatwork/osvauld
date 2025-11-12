/**
 * Folder Management
 *
 * Handles folder organization for documents.
 */

import { v4 as uuidv4 } from 'uuid';
import type { Folder } from '../types/folder';
import type { FolderRepository } from '../storage/repositories/folder';

/**
 * Folder Manager class
 */
export class FolderManager {
  constructor(private folderRepo: FolderRepository) {}

  /**
   * Creates a new folder
   */
  async createFolder(
    name: string,
    ownerId: string,
    parentId?: string
  ): Promise<Folder> {
    // Validate parent exists if provided
    if (parentId) {
      const parent = await this.folderRepo.get(parentId);
      if (parent.ownerId !== ownerId) {
        throw new Error('Cannot create folder in another user\'s folder');
      }
    }

    const folder: Folder = {
      id: uuidv4(),
      name,
      ownerId,
      parentId: parentId ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await this.folderRepo.create(folder);

    return folder;
  }

  /**
   * Gets a folder
   */
  async getFolder(folderId: string, userId: string): Promise<Folder> {
    const folder = await this.folderRepo.get(folderId);

    if (folder.ownerId !== userId) {
      throw new Error('Access denied');
    }

    return folder;
  }

  /**
   * Updates folder name
   */
  async renameFolder(folderId: string, name: string, userId: string): Promise<Folder> {
    const folder = await this.folderRepo.get(folderId);

    if (folder.ownerId !== userId) {
      throw new Error('Access denied');
    }

    const updated: Folder = {
      ...folder,
      name,
      updatedAt: new Date(),
    };

    await this.folderRepo.update(folderId, updated);

    return updated;
  }

  /**
   * Deletes a folder
   */
  async deleteFolder(folderId: string, userId: string, recursive = false): Promise<void> {
    const folder = await this.folderRepo.get(folderId);

    if (folder.ownerId !== userId) {
      throw new Error('Access denied');
    }

    if (recursive) {
      // Delete all child folders
      const children = await this.getChildFolders(folderId, userId);
      for (const child of children) {
        await this.deleteFolder(child.id, userId, true);
      }
    } else {
      // Check if folder has children
      const children = await this.getChildFolders(folderId, userId);
      if (children.length > 0) {
        throw new Error('Cannot delete folder with children (use recursive option)');
      }
    }

    await this.folderRepo.delete(folderId);
  }

  /**
   * Lists all folders for a user
   */
  async listFolders(userId: string): Promise<Folder[]> {
    const allFolders = await this.folderRepo.list();
    return allFolders.filter((folder) => folder.ownerId === userId);
  }

  /**
   * Gets root folders (no parent)
   */
  async getRootFolders(userId: string): Promise<Folder[]> {
    const allFolders = await this.listFolders(userId);
    return allFolders.filter((folder) => !folder.parentId);
  }

  /**
   * Gets child folders
   */
  async getChildFolders(parentId: string, userId: string): Promise<Folder[]> {
    const allFolders = await this.listFolders(userId);
    return allFolders.filter((folder) => folder.parentId === parentId);
  }

  /**
   * Gets folder path (breadcrumb)
   */
  async getFolderPath(folderId: string, userId: string): Promise<Folder[]> {
    const path: Folder[] = [];
    let currentId: string | undefined = folderId;

    while (currentId) {
      const folder = await this.getFolder(currentId, userId);
      path.unshift(folder);
      currentId = folder.parentId ?? undefined;
    }

    return path;
  }

  /**
   * Moves folder to new parent
   */
  async moveFolder(
    folderId: string,
    newParentId: string | undefined,
    userId: string
  ): Promise<Folder> {
    const folder = await this.folderRepo.get(folderId);

    if (folder.ownerId !== userId) {
      throw new Error('Access denied');
    }

    // Validate new parent exists and is owned by user
    if (newParentId) {
      const newParent = await this.folderRepo.get(newParentId);
      if (newParent.ownerId !== userId) {
        throw new Error('Cannot move to another user\'s folder');
      }

      // Prevent circular references
      if (await this.isAncestor(folderId, newParentId, userId)) {
        throw new Error('Cannot move folder to its own descendant');
      }
    }

    const updated: Folder = {
      ...folder,
      parentId: newParentId ?? null,
      updatedAt: new Date(),
    };

    await this.folderRepo.update(folderId, updated);

    return updated;
  }

  /**
   * Checks if folderId is an ancestor of potentialDescendantId
   */
  private async isAncestor(
    folderId: string,
    potentialDescendantId: string,
    userId: string
  ): Promise<boolean> {
    let currentId: string | undefined = potentialDescendantId;

    while (currentId) {
      if (currentId === folderId) {
        return true;
      }

      const folder = await this.getFolder(currentId, userId);
      currentId = folder.parentId ?? undefined;
    }

    return false;
  }

  /**
   * Gets folder tree structure
   */
  async getFolderTree(userId: string): Promise<FolderNode[]> {
    const allFolders = await this.listFolders(userId);
    const rootFolders = allFolders.filter((f) => !f.parentId);

    return rootFolders.map((root) => this.buildFolderNode(root, allFolders));
  }

  /**
   * Builds folder tree node recursively
   */
  private buildFolderNode(folder: Folder, allFolders: Folder[]): FolderNode {
    const children = allFolders.filter((f) => f.parentId === folder.id);

    return {
      folder,
      children: children.map((child) => this.buildFolderNode(child, allFolders)),
    };
  }
}

/**
 * Folder tree node
 */
export interface FolderNode {
  folder: Folder;
  children: FolderNode[];
}

/**
 * Helper to create folder manager
 */
export function createFolderManager(folderRepo: FolderRepository): FolderManager {
  return new FolderManager(folderRepo);
}
