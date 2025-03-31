// src/ioHandlers.js

/**
 * Set up IO handlers for Pyodide 
 * @param {PyodideInterface} pyodide - Pyodide instance
 */
function setupIOHandlers(pyodide) {
  // Register Node.js module for input/output
  registerNodePyModule(pyodide);
  
  // Override Python built-in input/print functions
  overridePythonIO(pyodide);
}

/**
 * Register Node.js Python module for IO operations
 * @param {PyodideInterface} pyodide - Pyodide instance
 */
function registerNodePyModule(pyodide) {
  pyodide.registerJsModule("nodepy", {
    async input(_prompt) {
      return new Promise((resolve) => {
        let input = "";
        process.stdin.setRawMode(true);
        process.stdin.resume();
        process.stdin.setEncoding("utf8");
        
        function onData(char) {
          switch (char) {
            case "\r":
            case "\n":
              process.stdout.write("\n");
              process.stdin.setRawMode(false);
              process.stdin.pause();
              process.stdin.removeListener("data", onData);
              resolve(input);
              break;
            case "\u0003": // Ctrl+C
              process.stdout.write("^C\n");
              input = "";
              process.stdin.setRawMode(false);
              process.stdin.pause();
              process.stdin.removeListener("data", onData);
              resolve(input);
              break;
            case "\u007f": // Backspace
            case "\b":
              if (input.length > 0) {
                process.stdout.write("\b \b");
                input = input.slice(0, -1);
              }
              break;
            default:
              if (char >= " " && char <= "~") {
                process.stdout.write(char);
                input += char;
              }
          }
        }
        
        process.stdin.on("data", onData);
      });
    },
    print(text) {
      console.log(text);
    }
  });
}

/**
 * Override Python built-in input/print functions
 * @param {PyodideInterface} pyodide - Pyodide instance
 */
async function overridePythonIO(pyodide) {
  await pyodide.runPythonAsync(`
    import builtins, sys, nodepy

    def custom_input(prompt=""):
        return nodepy.input(prompt)
    builtins.input = custom_input

    orig_print = builtins.print
    def custom_print(*args, **kwargs):
        r = orig_print(*args, **kwargs)
        sys.stdout.flush()
        return r
    builtins.print = custom_print
  `);
}

module.exports = {
  setupIOHandlers
};