// src/pyodideLoader.js
const { loadPyodide } = require("pyodide");

/**
 * Initialize Pyodide with required packages
 * @returns {Promise<PyodideInterface>} Initialized Pyodide instance
 */
async function initPyodide() {
  console.log("Initializing Pyodide...");
  
  // Load Pyodide core
  const pyodide = await loadPyodide();
  
  // Load essential packages
  await loadEssentialPackages(pyodide);
  
  // Configure Python environment
  await configurePythonEnvironment(pyodide);
  
  return pyodide;
}

/**
 * Load essential Python packages via micropip
 * @param {PyodideInterface} pyodide - Pyodide instance
 */
async function loadEssentialPackages(pyodide) {
  const packages = [
    { name: "pyyaml", source: "pyodide" },
    { name: "micropip", source: "pyodide" },
    { name: "typing-extensions==4.12.2", source: "pip", constraints: true },
    { name: "chuk_virtual_fs", source: "pip" },
    { name: "anyio", source: "pip" },
    { name: "ssl", source: "pip" },
    { name: "chuk_mcp", source: "pip", keep_going: true }
  ];
  
  // Load Pyodide packages first
  for (const pkg of packages.filter(p => p.source === "pyodide")) {
    console.log(`Loading ${pkg.name} from Pyodide`);
    await pyodide.loadPackage(pkg.name);
    console.log(`Loaded ${pkg.name}`);
  }
  
  // Then install pip packages
  for (const pkg of packages.filter(p => p.source === "pip")) {
    console.log(`Installing ${pkg.name} from PyPI${pkg.constraints ? " (with constraints)" : ""}`);
    await pyodide.runPythonAsync(`
      import micropip
      await micropip.install("${pkg.name}"${pkg.keep_going ? ", keep_going=True" : ""})
    `);
    console.log(`Installed ${pkg.name}`);
  }
}

/**
 * Configure Python environment
 * @param {PyodideInterface} pyodide - Pyodide instance
 */
async function configurePythonEnvironment(pyodide) {
  await pyodide.runPythonAsync(`
    import sys, os
    
    # Make sure '.' is in the path for local imports
    if '.' not in sys.path:
        sys.path.insert(0, '.')
    
    # Set environment variables
    os.environ['PYTHONPATH'] = '.:' + os.environ.get('PYTHONPATH','')
    os.environ['HOME'] = '/home/pyodide'
    os.environ['USER'] = 'pyodide'
    os.environ['PYODIDE_SANDBOX'] = 'ai_sandbox'
    
    # Print Python version and path for debugging
    print(f"Python {sys.version}")
    print(f"Initial sys.path: {sys.path}")
  `);
}

module.exports = {
  initPyodide
};