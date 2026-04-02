import { ProjectState, serialiseProject, parseProject, newProject } from './projectSchema';

/**
 * Persistence service for managing project data.
 * Replaces legacy TStream logic with modern JSON storage.
 */
export class PersistenceService {
  private static readonly STORAGE_KEY = 'transcalc_project_data';

  /**
   * Saves the current project state to browser localStorage.
   */
  static saveToLocalStorage(state: ProjectState): void {
    try {
      const serialised = serialiseProject(state);
      localStorage.setItem(this.STORAGE_KEY, serialised);
    } catch (error) {
      console.error('Failed to save project to localStorage:', error);
    }
  }

  /**
   * Loads the project state from browser localStorage.
   * Returns a fresh project if no saved data is found or if data is invalid.
   */
  static loadFromLocalStorage(): ProjectState {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        return parseProject(stored);
      }
    } catch (error) {
      console.error('Failed to load project from localStorage:', error);
    }
    return newProject();
  }

  /**
   * Exports the project state as a downloadable JSON file.
   */
  static exportProjectFile(state: ProjectState, fileName: string = 'project.tcalc.json'): void {
    const serialised = serialiseProject(state);
    const blob = new Blob([serialised], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Clears the saved project data from localStorage.
   */
  static clearStorage(): void {
    localStorage.removeItem(this.STORAGE_KEY);
  }
}
