#!/usr/bin/env node
// index.js - Main entry point
const { initPyodide } = require('./src/pyodideLoader');
const { runPyodideShell } = require('./src/pyodideShell');
const path = require('path');

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    pythonModulePath: process.env.CHUK_VIRTUAL_SHELL_PATH,
    configPath: process.env.CHUK_VIRTUAL_SHELL_CONFIG,
    sandboxName: process.env.PYODIDE_SANDBOX || 'ai_sandbox',
    useEnhancedScript: true,
    customScriptPath: process.env.PYODIDE_SCRIPT
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    // Handle options with values
    if (arg === '--python-path' && i + 1 < args.length) {
      options.pythonModulePath = args[i + 1];
      i++;
    } else if (arg === '--config-path' && i + 1 < args.length) {
      options.configPath = args[i + 1];
      i++;
    } else if (arg === '--sandbox' && i + 1 < args.length) {
      options.sandboxName = args[i + 1];
      i++;
    } else if (arg === '--script' && i + 1 < args.length) {
      options.customScriptPath = args[i + 1];
      i++;
    } 
    // Handle flags without values
    else if (arg === '--basic-script') {
      options.useEnhancedScript = false;
    } else if (arg === '--help' || arg === '-h') {
      showHelp();
      process.exit(0);
    }
    // Handle positional arguments - assume it's the python path
    else if (!arg.startsWith('--') && !arg.startsWith('-')) {
      // For backward compatibility, treat a non-option argument as the Python path
      console.log(`Treating argument "${arg}" as Python module path`);
      options.pythonModulePath = arg;
    }
  }

  return options;
}

// Display help information
function showHelp() {
  console.log(`
chuk-virtual-shell-pyodide-host - Node.js host for the chuk virtual shell using Pyodide

Usage: chuk-virtual-shell-pyodide-host [options]

Options:
  --python-path <path>   Path to chuk_virtual_shell Python modules
  --config-path <path>   Path to configuration directory
  --sandbox <name>       Name of the sandbox configuration to use
  --basic-script         Use basic Python script instead of enhanced version
  --help, -h             Show this help message

Environment variables:
  CHUK_VIRTUAL_SHELL_PATH    Path to chuk_virtual_shell Python modules
  CHUK_VIRTUAL_SHELL_CONFIG  Path to configuration directory
  PYODIDE_SANDBOX            Name of the sandbox configuration to use
  `);
}

async function main() {
  const options = parseArgs();
  
  try {
    console.log("Starting Pyodide Shell with the following options:");
    console.log(JSON.stringify(options, null, 2));
    
    const pyodide = await initPyodide();
    await runPyodideShell(pyodide, options);
  } catch (err) {
    console.error("Error in Pyodide Shell:", err);
    process.exit(1);
  }
}

// Start the application
if (require.main === module) {
  main();
}

module.exports = {
  runPyodideShell,
  initPyodide
};