import path from 'node:path';
import { FilesystemBackend, type FilesystemPermission } from 'deepagents';

export const SKILLS_PATH = '/skills/';
export const SKILLS_PERMISSIONS: FilesystemPermission[] = [
  { operations: ['write'], paths: ['/skills/**'], mode: 'deny' },
];

/** Expose only the server's skills directory through virtual paths, in source and compiled builds. */
export function createSkillsBackend(): FilesystemBackend {
  return new FilesystemBackend({
    rootDir: path.resolve(__dirname, '../../../skills'),
    virtualMode: true,
  });
}
