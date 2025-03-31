"""
pyodide_basic_main.py - Pyodide-compatible main entry point for PyodideShell

This is a basic script with minimal requirements that should work in most environments.
"""
import sys
import os
from chuk_virtual_shell.shell_interpreter import ShellInterpreter

def pyodide_main():
    # Create shell with the specified sandbox configuration if provided
    sandbox_yaml = os.environ.get("PYODIDE_SANDBOX", "${options.defaultSandbox || 'ai_sandbox'}")
    print(f"Using sandbox configuration: {sandbox_yaml}")
    
    shell = ShellInterpreter(sandbox_yaml=sandbox_yaml)
    
    print("=" * 60)
    print("PyodideShell - Secure Virtual Environment")
    print("=" * 60)
    print("Type 'help' for a list of available commands.")
    print("Type 'exit' to quit the shell.")
    print("-" * 60)
    
    while shell.running:
        prompt = shell.prompt()
        try:
            cmd_line = input(prompt)
            if not cmd_line:
                continue
                
            # Exit conditions
            if cmd_line.lower() in {'exit', 'quit', 'q'}:
                break
                
            result = shell.execute(cmd_line)
            if result:
                print(result)
        except KeyboardInterrupt:
            print("^C")
            continue
        except Exception as e:
            print(f"Error: {e}")

    print("Goodbye from PyodideShell!")

if __name__ == "__main__":
    pyodide_main()