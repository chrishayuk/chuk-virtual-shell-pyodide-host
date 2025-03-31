// src/pyodideShell.js
const fs = require("fs");
const path = require("path");
const { loadPythonModules, loadFolder } = require("./pyodideFs");
const { setupIOHandlers } = require("./ioHandlers");
const { ScriptManager } = require("./scriptManager");

/**
 * Run the Pyodide shell.
 * @param {PyodideInterface} pyodide - Initialized Pyodide instance.
 * @param {Object} options - Configuration options.
 * @param {string} [options.pythonModulePath] - Path to the Python modules.
 * @param {string} [options.configPath] - Path to configuration directory.
 * @param {string} [options.sandboxName] - Name of the sandbox to use.
 */
async function runPyodideShell(pyodide, options = {}) {
  console.log("Starting Pyodide shell with options:", options);

  // Load virtual shell modules with nested package resolution.
  await loadVirtualShell(pyodide, options);

  // Load configuration files.
  await loadConfiguration(pyodide, options);

  // Set up IO handlers.
  setupIOHandlers(pyodide);

  // Create and run the Pyodide shell.
  await createAndRunShell(pyodide, options);
}

/**
 * Load virtual shell modules into Pyodide.
 * This function detects if the provided directory contains a nested package.
 * @param {PyodideInterface} pyodide - Pyodide instance.
 * @param {Object} options - Configuration options.
 */
async function loadVirtualShell(pyodide, options = {}) {
  try {
    // Locate the module directory (handles nested package if found)
    const moduleDir = locateVirtualShellDirectory(options);
    console.log(`Found module directory at: ${moduleDir}`);

    // Determine package name from the inner folder name.
    const packageName = path.basename(moduleDir);
    console.log(`Package name resolved as: ${packageName}`);

    // Load Python modules from the actual package directory.
    console.log(`Loading Python files from "${moduleDir}" into "./${packageName}"`);
    loadPythonModules(pyodide, moduleDir, packageName);

    // Add the outer directory (parent of moduleDir) to sys.path so that
    // an import like "import chuk_virtual_shell" will resolve to the inner folder.
    const outerDir = path.dirname(moduleDir);
    await pyodide.runPythonAsync(`
import sys
import os
if '${outerDir}' not in sys.path:
    sys.path.insert(0, '${outerDir}')
if '.' not in sys.path:
    sys.path.insert(0, '.')
print("Updated sys.path:")
for p in sys.path:
    print("  -", p)
    `);

    // Test import of ShellInterpreter.
    await pyodide.runPythonAsync(`
try:
    from ${packageName}.shell_interpreter import ShellInterpreter
    print("Successfully imported ShellInterpreter from ${packageName}")
except ImportError as e:
    print("Test import failed:", e)
    raise e
    `);
  } catch (error) {
    console.error(`Error loading virtual shell: ${error.message}`);
    throw error;
  }
}

/**
 * Locate the virtual shell directory.
 * If the provided path contains a nested folder named after the package,
 * that inner folder is used.
 * @param {Object} options - Configuration options.
 * @param {string} [options.pythonModulePath] - Custom path to the Python modules.
 * @returns {string} Path to the actual package directory.
 */
function locateVirtualShellDirectory(options = {}) {
  if (options.pythonModulePath) {
    console.log(`Checking custom Python module path: ${options.pythonModulePath}`);
    if (fs.existsSync(options.pythonModulePath)) {
      const outerPath = options.pythonModulePath;
      const baseName = path.basename(outerPath).replace(/-/g, '_');
      const innerPath = path.join(outerPath, baseName);
      if (fs.existsSync(innerPath) && fs.statSync(innerPath).isDirectory()) {
        console.log(`Detected nested package at: ${innerPath}`);
        return innerPath;
      }
      return outerPath;
    }
    console.warn(`Provided pythonModulePath does not exist: ${options.pythonModulePath}`);
  }
  const possibleLocations = [
    "./chuk_virtual_shell",
    "../chuk_virtual_shell",
    path.join(__dirname, "..", "node_modules", "chuk-virtual-shell"),
    process.env.CHUK_VIRTUAL_SHELL_PATH
  ].filter(Boolean);
  for (const location of possibleLocations) {
    if (fs.existsSync(location) && isValidPythonModule(location)) {
      return location;
    }
  }
  throw new Error("Error: could not find 'chuk_virtual_shell' Python module. Please specify a valid path.");
}

/**
 * Check if a directory is a valid Python module.
 * @param {string} dirPath - Path to check.
 * @returns {boolean} Whether the path is a valid Python module.
 */
function isValidPythonModule(dirPath) {
  if (!fs.existsSync(dirPath) || !fs.statSync(dirPath).isDirectory()) {
    return false;
  }
  if (fs.existsSync(path.join(dirPath, '__init__.py'))) {
    return true;
  }
  try {
    const files = fs.readdirSync(dirPath);
    return files.some(file => file.endsWith('.py'));
  } catch (err) {
    console.error(`Error checking directory ${dirPath}:`, err.message);
    return false;
  }
}

/**
 * Load configuration files into the Pyodide filesystem.
 * @param {PyodideInterface} pyodide - Pyodide instance.
 * @param {Object} options - Configuration options.
 */
async function loadConfiguration(pyodide, options = {}) {
  let configFolderPath;
  if (options.configPath && fs.existsSync(options.configPath)) {
    configFolderPath = options.configPath;
  } else {
    const possibleConfigPaths = [
      path.join("./chuk_virtual_shell", "config"),
      path.join(__dirname, "..", "config"),
      path.join(process.cwd(), "config"),
      process.env.CHUK_VIRTUAL_SHELL_CONFIG
    ].filter(Boolean);
    for (const configPath of possibleConfigPaths) {
      if (fs.existsSync(configPath)) {
        console.log(`Found config directory at: ${configPath}`);
        configFolderPath = configPath;
        break;
      }
    }
    if (!configFolderPath) {
      configFolderPath = path.join(__dirname, "..", "config");
      if (!fs.existsSync(configFolderPath)) {
        console.log(`Creating default config directory at ${configFolderPath}...`);
        fs.mkdirSync(configFolderPath, { recursive: true });
      }
    }
  }
  console.log(`Loading configuration files from ${configFolderPath} into /home/pyodide/config...`);
  loadFolder(pyodide, configFolderPath, "/home/pyodide/config");

  if (options.sandboxName) {
    await pyodide.runPythonAsync(`
      import os
      os.environ['PYODIDE_SANDBOX'] = '${options.sandboxName}'
      print(f"Using sandbox configuration: {os.environ['PYODIDE_SANDBOX']}")
    `);
  }
}

/**
 * Create a special import helper in Pyodide.
 * This helper will attempt to import modules normally but if the module name is duplicated (e.g.
 * "chuk_virtual_shell.chuk_virtual_shell"), it will remove the duplicate.
 * @param {PyodideInterface} pyodide - Pyodide instance.
 * @param {string} packageName - The resolved package name (e.g. "chuk_virtual_shell").
 */
async function createImportHelper(pyodide, packageName) {
  await pyodide.runPythonAsync(`
import sys
import os
import importlib.util

def import_module(module_name, package=None):
    """Helper to import modules handling duplicate package names."""
    try:
        return importlib.import_module(module_name, package)
    except ImportError:
        # If the module name contains the package twice, remove the duplicate.
        parts = module_name.split('.')
        if len(parts) > 1 and parts[0] == parts[1]:
            parts.pop(0)
            modified_name = '.'.join(parts)
            return importlib.import_module(modified_name, package)
        raise

# Make this helper available globally
sys.modules["chuk_virtual_shell_import"] = import_module

print("Special import helper created.")
  `);
}

/**
 * Create and run the Pyodide shell.
 * @param {PyodideInterface} pyodide - Pyodide instance.
 * @param {Object} options - Configuration options.
 */
async function createAndRunShell(pyodide, options = {}) {
  try {
    const pythonScriptPath = await loadPythonScript(pyodide, options);
    // Create the import helper using our resolved package name.
    const moduleDir = locateVirtualShellDirectory(options);
    const packageName = path.basename(moduleDir);
    await createImportHelper(pyodide, packageName);

    await pyodide.runPythonAsync(`
import sys
sys.path.insert(0, '.')
from ${pythonScriptPath.replace('.py', '')} import pyodide_main
pyodide_main()
    `);
  } catch (err) {
    console.error("Failed to run Pyodide main script:", err);
    throw err;
  }
}

/**
 * Load the appropriate Python script for the shell.
 * @param {PyodideInterface} pyodide - Pyodide instance.
 * @param {Object} options - Configuration options.
 * @returns {Promise<string>} Path to the loaded Python script.
 */
async function loadPythonScript(pyodide, options = {}) {
  const scriptManager = new ScriptManager(options);
  const scriptType = options.useEnhancedScript ? 'enhanced' : 'basic';
  try {
    const scriptPath = scriptManager.getScriptPath(scriptType);
    const scriptContent = scriptManager.readScript(scriptPath);
    const processedContent = scriptManager.processScriptContent(scriptContent);
    const destPath = 'pyodide_main.py';
    await pyodide.runPythonAsync(`
      with open('${destPath}', 'w') as f:
          f.write(${JSON.stringify(processedContent)})
    `);
    console.log(`Loaded script from: ${scriptPath}`);
    return destPath;
  } catch (error) {
    console.error('Error loading Python script:', error.message);
    throw error;
  }
}

module.exports = {
  runPyodideShell
};
