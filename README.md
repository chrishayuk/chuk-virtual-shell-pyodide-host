# chuk-virtual-shell-pyodide-host

A modular Node.js implementation of Pyodide with virtual shell capabilities. This project provides a structured way to run Python code in a Node.js environment with a virtual filesystem.

```bash
npm start -- --python-path /Users/christopherhay/chris-source/agent-x/chuk-virtual-shell
```

## Project Structure

```
chuk-virtual-shell-pyodide-host/
├── config/                  # Configuration files
│   ├── ai_sandbox.yaml      # AI sandbox configuration
│   └── default.yaml         # Default sandbox configuration
├── python_scripts/          # Python launcher scripts
│   ├── pyodide_basic_main.py    # Basic main script
│   └── pyodide_enhanced_main.py # Enhanced async main script
├── src/                     # Source code
│   ├── configManager.js     # Configuration management
│   ├── ioHandlers.js        # Input/output handling
│   ├── pyodideFs.js         # Filesystem operations
│   ├── pyodideLoader.js     # Pyodide initialization
│   └── pyodideShell.js      # Shell implementation
├── index.js                 # Main entry point
└── package.json             # Project configuration
```

## Module Descriptions

### `index.js`
The main entry point that initializes Pyodide and starts the virtual shell.

### `src/pyodideLoader.js`
Handles loading Pyodide and installing required Python packages.

### `src/pyodideFs.js`
Provides functionality for loading Python modules and other files into the Pyodide filesystem.

### `src/pyodideShell.js`
Implements the virtual shell functionality using Pyodide. It loads Python scripts from the `python_scripts` directory instead of embedding them directly in the JavaScript code.

### `python_scripts/`
Contains the Python launcher scripts used to initialize and run the shell:
- `pyodide_basic_main.py`: A simple script with minimal requirements
- `pyodide_enhanced_main.py`: An advanced script with async support and better error handling

### `src/ioHandlers.js`
Manages input/output interactions between Node.js and Pyodide.

### `src/configManager.js`
Handles sandbox configuration loading and management.

## Setup and Installation

### As a project dependency

1. Install the package:
   ```bash
   npm install chuk-virtual-shell-pyodide-host
   ```

2. Use in your code:
   ```javascript
   const { initPyodide, runPyodideShell } = require('chuk-virtual-shell-pyodide-host');

   async function main() {
     const pyodide = await initPyodide();
     await runPyodideShell(pyodide, {
       pythonModulePath: '/path/to/chuk_virtual_shell',
       configPath: '/path/to/config',
       sandboxName: 'ai_sandbox'
     });
   }

   main();
   ```

### As a command-line tool

1. Install globally:
   ```bash
   npm install -g chuk-virtual-shell-pyodide-host
   ```

2. Run from command line:
   ```bash
   chuk-virtual-shell-pyodide-host
   ```

3. Available options:
   ```bash
   chuk-virtual-shell-pyodide-host --python-path /path/to/modules --config-path /path/to/config --sandbox my_sandbox
   ```

4. Using a custom Python script:
   ```bash
   chuk-virtual-shell-pyodide-host --script /path/to/custom_main.py
   ```
   
   Your custom script should define a `pyodide_main()` function that will be called to start the shell.

### Development Setup

1. Clone repository:
   ```bash
   git clone https://github.com/yourusername/chuk-virtual-shell-pyodide-host.git
   cd chuk-virtual-shell-pyodide-host
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the shell:
   ```bash
   npm start
   ```

## Configuration

The shell supports different sandbox configurations that can be specified at runtime:

- **Default**: A balanced security environment with a starter project
- **AI Sandbox**: A restricted environment for AI code execution

Configuration files are located in the `config/` directory.

## Python Module Requirements

This package requires the `chuk_virtual_shell` Python module. You can specify its location in several ways:

1. Environment variable: `CHUK_VIRTUAL_SHELL_PATH`
2. Command line: `--python-path <path>`
3. Default locations:
   - `./chuk_virtual_shell`
   - `../chuk_virtual_shell`
   - Inside node_modules if installed as a dependency

## System Requirements

- Node.js 16.0.0 or higher
- Required NPM packages: pyodide, js-yaml