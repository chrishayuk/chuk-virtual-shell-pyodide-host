// src/pyodideFs.js
const fs = require("fs");
const path = require("path");

/**
 * Load Python modules into Pyodide filesystem
 * @param {PyodideInterface} pyodide - Pyodide instance
 * @param {string} dir - Directory containing Python modules
 * @param {string} [targetDirName] - Optional sanitized directory name for target
 * @returns {number} Number of Python files loaded
 */
function loadPythonModules(pyodide, dir, targetDirName) {
  // Locate directory
  const moduleDir = locateDirectory(dir);
  
  // Use sanitized name if provided, otherwise use the original basename
  const dirBaseName = targetDirName || path.basename(moduleDir);
  
  // Ensure the target directory exists in the Pyodide filesystem
  createPyodideDirectory(pyodide, `./${dirBaseName}`);
  
  console.log(`Loading Python files from "${moduleDir}" into "./${dirBaseName}"`);
  
  // Load modules recursively
  const fileCount = processDirectory(pyodide, moduleDir, `./${dirBaseName}`);
  
  if (fileCount === 0) {
    console.warn(`Warning: No Python (.py) files were found in ${moduleDir}`);
  } else {
    console.log(`Successfully loaded ${fileCount} Python files from ${moduleDir}`);
  }
  
  return fileCount;
}

/**
 * Locate a directory, checking current and parent directories
 * @param {string} dir - Directory to locate
 * @returns {string} Located directory path
 */
function locateDirectory(dir) {
  if (fs.existsSync(dir)) {
    return dir;
  }
  
  const parentDir = path.join("..", dir);
  if (fs.existsSync(parentDir)) {
    return parentDir;
  }
  
  throw new Error(`Could not find directory at ${dir} or ${parentDir}`);
}

/**
 * Create a directory in Pyodide filesystem
 * @param {PyodideInterface} pyodide - Pyodide instance
 * @param {string} pyodidePath - Path in Pyodide filesystem
 */
function createPyodideDirectory(pyodide, pyodidePath) {
  pyodide.runPython(`
    import os
    os.makedirs('${pyodidePath}', exist_ok=True)
  `);
}

/**
 * Process a directory recursively, copying files to Pyodide filesystem
 * @param {PyodideInterface} pyodide - Pyodide instance
 * @param {string} currentDir - Current directory being processed
 * @param {string} pyodidePath - Target path in Pyodide filesystem
 * @returns {number} Number of Python files copied
 */
function processDirectory(pyodide, currentDir, pyodidePath) {
  createPyodideDirectory(pyodide, pyodidePath);
  
  let pythonFileCount = 0;
  
  try {
    const files = fs.readdirSync(currentDir);
    
    for (const file of files) {
      // Skip hidden files and directories
      if (file.startsWith('.')) {
        continue;
      }
      
      const fullPath = path.join(currentDir, file);
      const pyodideFilePath = path.join(pyodidePath, file).replace(/\\/g, "/");
      
      if (fs.statSync(fullPath).isDirectory()) {
        pythonFileCount += processDirectory(pyodide, fullPath, pyodideFilePath);
      } 
      else if (file.endsWith(".py")) {
        copyFileToPyodide(pyodide, fullPath, pyodideFilePath);
        pythonFileCount++;
      }
    }
  } catch (error) {
    console.warn(`Warning: Error processing directory ${currentDir}: ${error.message}`);
  }
  
  return pythonFileCount;
}

/**
 * Copy a file to Pyodide filesystem
 * @param {PyodideInterface} pyodide - Pyodide instance
 * @param {string} sourcePath - Source file path
 * @param {string} targetPath - Target path in Pyodide filesystem
 */
function copyFileToPyodide(pyodide, sourcePath, targetPath) {
  const content = fs.readFileSync(sourcePath, "utf8");
  const base64Content = Buffer.from(content).toString("base64");
  
  pyodide.runPython(`
    import os, base64
    os.makedirs(os.path.dirname('${targetPath}'), exist_ok=True)
    with open('${targetPath}', 'w') as f:
        f.write(base64.b64decode('${base64Content}').decode('utf-8'))
  `);
}

/**
 * Load a folder into Pyodide filesystem
 * @param {PyodideInterface} pyodide - Pyodide instance
 * @param {string} folderPath - Source folder path
 * @param {string} destPath - Destination path in Pyodide filesystem
 */
function loadFolder(pyodide, folderPath, destPath) {
  if (!fs.existsSync(folderPath)) {
    throw new Error(`Folder ${folderPath} does not exist`);
  }

  createPyodideDirectory(pyodide, destPath);
  
  const files = fs.readdirSync(folderPath);
  for (const file of files) {
    const fullPath = path.join(folderPath, file);
    const destFilePath = path.join(destPath, file).replace(/\\/g, "/");
    
    if (fs.statSync(fullPath).isDirectory()) {
      loadFolder(pyodide, fullPath, destFilePath);
    } else {
      const content = fs.readFileSync(fullPath, "utf8");
      const escapedContent = JSON.stringify(content);
      
      pyodide.runPython(`
        import os
        os.makedirs(os.path.dirname('${destFilePath}'), exist_ok=True)
        with open('${destFilePath}', 'w') as f:
            f.write(${escapedContent})
      `);
    }
  }
}

module.exports = {
  loadPythonModules,
  loadFolder
};