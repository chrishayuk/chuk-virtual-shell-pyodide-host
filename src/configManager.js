// src/configManager.js
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml'); // You'll need to add this dependency

/**
 * Configuration Manager for handling sandbox configurations
 */
class ConfigManager {
  /**
   * Create a config manager
   * @param {string} configDir - Directory containing configuration files
   */
  constructor(configDir = './config') {
    this.configDir = configDir;
    this.defaultConfig = 'default';
    this.aiSandboxConfig = 'ai_sandbox';
  }

  /**
   * Get configuration by name
   * @param {string} configName - Name of configuration
   * @returns {Object|null} Configuration object or null if not found
   */
  getConfig(configName) {
    try {
      const configPath = this.findConfigFile(configName);
      if (!configPath) {
        console.warn(`Configuration '${configName}' not found, falling back to default`);
        return this.getConfig(this.defaultConfig);
      }
      
      const content = fs.readFileSync(configPath, 'utf8');
      return yaml.load(content);
    } catch (error) {
      console.error(`Error loading configuration '${configName}':`, error);
      return null;
    }
  }

  /**
   * Find configuration file by name
   * @param {string} configName - Name of configuration
   * @returns {string|null} Path to configuration file or null if not found
   */
  findConfigFile(configName) {
    // If full path provided and exists, return it
    if (configName.endsWith('.yaml') || configName.endsWith('.yml')) {
      if (fs.existsSync(configName)) {
        return configName;
      }
    }
    
    // Check standard locations
    const locations = [
      path.join(this.configDir, `${configName}.yaml`),
      path.join(this.configDir, `${configName}.yml`),
      path.join(this.configDir, configName, 'config.yaml'),
      path.join(this.configDir, configName, 'config.yml')
    ];
    
    for (const location of locations) {
      if (fs.existsSync(location)) {
        return location;
      }
    }
    
    return null;
  }

  /**
   * List available configurations
   * @returns {string[]} List of available configuration names
   */
  listConfigs() {
    try {
      const configs = [];
      
      if (!fs.existsSync(this.configDir)) {
        return configs;
      }
      
      // Get YAML files in config directory
      const files = fs.readdirSync(this.configDir);
      for (const file of files) {
        const filePath = path.join(this.configDir, file);
        
        // Check if it's a YAML file
        if (file.endsWith('.yaml') || file.endsWith('.yml')) {
          configs.push(file.replace(/\.(yaml|yml)$/, ''));
        }
        // Check if it's a directory with config.yaml
        else if (fs.statSync(filePath).isDirectory()) {
          const configFile = path.join(filePath, 'config.yaml');
          if (fs.existsSync(configFile)) {
            configs.push(file);
          }
        }
      }
      
      return configs;
    } catch (error) {
      console.error('Error listing configurations:', error);
      return [];
    }
  }
}

module.exports = {
  ConfigManager
};