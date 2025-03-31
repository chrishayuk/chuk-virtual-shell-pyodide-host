// src/scriptManager.js
const fs = require('fs');
const path = require('path');

/**
 * Manages Python scripts used by the Pyodide shell
 */
class ScriptManager {
  /**
   * Create a script manager
   * @param {Object} options - Configuration options
   */
  constructor(options = {}) {
    this.options = options;
    this.scriptBasePath = path.join(__dirname, '..', 'python_scripts');
  }
  
  /**
   * Get the path to the appropriate Python script
   * @param {string} scriptType - Type of script to load ('basic' or 'enhanced')
   * @returns {string} Path to the script
   */
  getScriptPath(scriptType = 'basic') {
    // Check for a custom script first
    if (this.options.customScriptPath && fs.existsSync(this.options.customScriptPath)) {
      return this.options.customScriptPath;
    }
    
    // Determine script filename based on type
    const scriptFileName = scriptType === 'enhanced' 
      ? 'pyodide_enhanced_main.py' 
      : 'pyodide_basic_main.py';
    
    // Check if script exists in scripts directory
    const scriptPath = path.join(this.scriptBasePath, scriptFileName);
    
    if (fs.existsSync(scriptPath)) {
      return scriptPath;
    }
    
    // Try alternate locations
    const alternateLocations = [
      path.join(process.cwd(), 'python_scripts', scriptFileName),
      path.join(process.cwd(), scriptFileName),
      path.join(__dirname, scriptFileName)
    ];
    
    for (const location of alternateLocations) {
      if (fs.existsSync(location)) {
        return location;
      }
    }
    
    // If we still can't find it, use the basic script by default
    const basicScriptPath = path.join(this.scriptBasePath, 'pyodide_basic_main.py');
    if (fs.existsSync(basicScriptPath)) {
      console.warn(`Could not find ${scriptFileName}, falling back to basic script.`);
      return basicScriptPath;
    }
    
    throw new Error(`Could not find any Python scripts. Make sure the python_scripts directory exists and contains the required files.`);
  }
  
  /**
   * Read the content of a script
   * @param {string} scriptPath - Path to the script
   * @returns {string} Content of the script
   */
  readScript(scriptPath) {
    try {
      return fs.readFileSync(scriptPath, 'utf8');
    } catch (error) {
      throw new Error(`Error reading script at ${scriptPath}: ${error.message}`);
    }
  }
  
  /**
   * Process script content, replacing placeholders with values
   * @param {string} content - Script content
   * @returns {string} Processed content
   */
  processScriptContent(content) {
    // Replace placeholders in the script
    return content.replace(/\$\{([^}]+)\}/g, (match, varName) => {
      switch (varName) {
        case 'options.defaultSandbox':
        case 'defaultSandbox':
          return this.options.defaultSandbox || 'ai_sandbox';
        default:
          // Keep the placeholder if we don't know how to replace it
          return match;
      }
    });
  }
}

module.exports = {
  ScriptManager
};