"""
pyodide_enhanced_main.py - Enhanced Pyodide-compatible main entry point for PyodideShell

This enhanced script provides:
1. Async input handling
2. Better error handling
3. Improved configuration loading
4. More detailed shell information
"""
import sys
import asyncio
import os
import importlib.util

# Default sandbox configuration to use
DEFAULT_SANDBOX = "${options.defaultSandbox || 'ai_sandbox'}"

async def safe_async_input(prompt=""):
    """
    Async input gathering with improved handling
    """
    try:
        import nodepy
        
        # Use await to ensure we get the full input
        full_input = await nodepy.input(prompt)
        
        # Additional handling for edge cases
        return full_input.strip() if full_input is not None else ""
    except Exception as e:
        print(f"Input error: {e}")
        return ""

def find_module_file(base_dir, filename):
    """Search recursively for a file in the directory structure"""
    for root, dirs, files in os.walk(base_dir):
        if filename in files:
            return os.path.join(root, filename)
    return None

async def run_pyodide_shell():
    """
    Async shell main loop with YAML sandbox configuration
    """
    try:
        # First, verify we can import the required modules
        print("Checking for required modules...")
        
        # List all files in the current directory
        print("Files in current directory:")
        print(os.listdir('.'))
        
        # Check if we can find the module
        module_names = ['chuk_virtual_shell', 'shell_interpreter']
        for module_name in module_names:
            spec = importlib.util.find_spec(module_name)
            if spec:
                print(f"Found module {module_name} at {spec.origin}")
            else:
                print(f"Module {module_name} not found")
                
        # Print sys.path
        print("Python module search path (sys.path):")
        for p in sys.path:
            print(f"  - {p}")
        
        # Based on the file structure, let's try importing shell_interpreter 
        # from the nested chuk_virtual_shell directory
        ShellInterpreter = None
        
        # Try all possible import paths based on your file structure
        import_attempts = [
            # Nested module path (based on screenshot)
            lambda: __import__('chuk_virtual_shell.chuk_virtual_shell.shell_interpreter', 
                              fromlist=['ShellInterpreter']).ShellInterpreter,
            # Direct import path
            lambda: __import__('chuk_virtual_shell.shell_interpreter', 
                              fromlist=['ShellInterpreter']).ShellInterpreter,
            # Try from the nested directory directly
            lambda: __import__('./chuk_virtual_shell/chuk_virtual_shell/shell_interpreter', 
                              fromlist=['ShellInterpreter']).ShellInterpreter,
            # Try path with direct shell_interpreter file
            lambda: __import__('shell_interpreter', 
                              fromlist=['ShellInterpreter']).ShellInterpreter
        ]
        
        # Try each import strategy
        for i, import_attempt in enumerate(import_attempts):
            try:
                print(f"Import attempt {i+1}...")
                ShellInterpreter = import_attempt()
                print(f"Success! Imported ShellInterpreter with attempt {i+1}")
                break
            except ImportError as e:
                print(f"Import attempt {i+1} failed: {e}")
        
        # If still not imported, try file-based import
        if ShellInterpreter is None:
            print("Trying file-based import...")
            
            # Look for shell_interpreter.py file
            shell_interpreter_path = None
            for base_dir in ['.', './chuk_virtual_shell']:
                if not os.path.exists(base_dir):
                    continue
                    
                shell_interpreter_path = find_module_file(base_dir, 'shell_interpreter.py')
                if shell_interpreter_path:
                    print(f"Found shell_interpreter.py at {shell_interpreter_path}")
                    break
            
            if shell_interpreter_path:
                # Import from file
                spec = importlib.util.spec_from_file_location(
                    "shell_interpreter", shell_interpreter_path)
                module = importlib.util.module_from_spec(spec)
                spec.loader.exec_module(module)
                ShellInterpreter = module.ShellInterpreter
                print("Successfully imported ShellInterpreter from file")
            else:
                raise ImportError("Could not find shell_interpreter.py in any directory")
        
        # Try to find the sandbox configuration loader
        find_config_file = None
        try:
            # Try to import the config file finder
            import_attempts = [
                # Try nested config directory as seen in screenshot
                lambda: __import__('chuk_virtual_shell.chuk_virtual_shell.config.sandbox_loader', 
                                  fromlist=['find_config_file']).find_config_file,
                # Try standard loader path
                lambda: __import__('chuk_virtual_shell.sandbox.loader.sandbox_config_loader', 
                                  fromlist=['find_config_file']).find_config_file
            ]
            
            for i, import_attempt in enumerate(import_attempts):
                try:
                    print(f"Config loader import attempt {i+1}...")
                    find_config_file = import_attempt()
                    print(f"Success! Imported find_config_file with attempt {i+1}")
                    break
                except ImportError as e:
                    print(f"Config loader import attempt {i+1} failed: {e}")
        except Exception as e:
            print(f"Error importing sandbox loader: {e}")
            
        # Create a fallback function if import fails
        if find_config_file is None:
            def find_config_file(name):
                """Simplified config file finder when the module can't be imported"""
                print(f"Using simplified config file finder for {name}")
                
                # Check for the config file in various locations
                config_paths = [
                    f"{name}",
                    f"{name}.yaml",
                    f"{name}.yml",
                    f"./chuk_virtual_shell/config/{name}.yaml",
                    f"./chuk_virtual_shell/chuk_virtual_shell/config/{name}.yaml",
                    f"/home/pyodide/config/{name}.yaml"
                ]
                
                for config_path in config_paths:
                    if os.path.exists(config_path):
                        print(f"Found config at {config_path}")
                        return config_path
                
                return None

        # Check for environment variables that might specify a sandbox.
        sandbox_yaml = os.environ.get("PYODIDE_SANDBOX", DEFAULT_SANDBOX)
        
        # If sandbox specified by name, try to find its config file.
        if not sandbox_yaml.endswith(('.yaml', '.yml')) and '/' not in sandbox_yaml:
            config_path = find_config_file(sandbox_yaml)
            if config_path:
                sandbox_yaml = config_path
            else:
                print(f"Warning: Sandbox configuration '{sandbox_yaml}' not found, falling back to default")
                # Try to find the default sandbox.
                default_path = find_config_file(DEFAULT_SANDBOX)
                if default_path:
                    sandbox_yaml = default_path
                else:
                    sandbox_yaml = None
                    
        print(f"Initializing shell with sandbox configuration: {sandbox_yaml or 'default'}")
        
        # Create shell with the specified sandbox configuration.
        shell = ShellInterpreter(sandbox_yaml=sandbox_yaml)
        
        # Print sandbox info.
        print("Shell initialized with the following environment:")
        print(f"Home directory: {shell.environ.get('HOME', '/home/user')}")
        print(f"User: {shell.environ.get('USER', 'user')}")
        
        # Welcome message.
        fs_info = shell.fs.get_fs_info()
        if "security" in fs_info:
            security = fs_info["security"]
            read_only = security.get("read_only", False)
            print(f"Security mode: {'Read-only' if read_only else 'Restricted write'}")
        
        print("\nType 'help' for a list of available commands.")
        print("Type 'exit' to quit the shell.")
        print("-" * 60)

        while shell.running:
            # Prepare prompt.
            prompt = shell.prompt()
            sys.stdout.write(prompt)
            sys.stdout.flush()

            try:
                # Await input with minimal overhead.
                cmd_line = await safe_async_input("")
                
                # Exit conditions.
                if cmd_line.lower() in {'exit', 'quit', 'q'}:
                    break
                
                # Skip empty lines.
                if not cmd_line:
                    continue
                
                # Execute command.
                result = shell.execute(cmd_line)
                if result:
                    print(result)
            
            except KeyboardInterrupt:
                print("^C")
                continue
            except Exception as e:
                print(f"Execution Error: {e}")
    
    except ImportError as import_error:
        print(f"Import error: {import_error}")
        print("Troubleshooting information:")
        print(f"Python version: {sys.version}")
        print(f"Current directory: {os.getcwd()}")
        
        # Check if the module directories exist
        for dirname in ['.', './chuk_virtual_shell']:
            if os.path.exists(dirname):
                print(f"{dirname} directory exists")
                print("Contents:")
                print(os.listdir(dirname))
                
                # Print nested contents for directories
                if dirname == './chuk_virtual_shell':
                    nested = os.path.join(dirname, 'chuk_virtual_shell')
                    if os.path.exists(nested) and os.path.isdir(nested):
                        print(f"Contents of {nested}:")
                        print(os.listdir(nested))
            else:
                print(f"{dirname} directory doesn't exist")
                
        # Search for all Python files to help with debugging
        print("Searching for Python files...")
        all_py_files = []
        for root, dirs, files in os.walk('.'):
            for file in files:
                if file.endswith('.py'):
                    all_py_files.append(os.path.join(root, file))
        
        print(f"Found {len(all_py_files)} Python files:")
        for py_file in all_py_files[:10]:  # Show first 10 to avoid flooding
            print(f"  - {py_file}")
    except Exception as e:
        print(f"Shell error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        print("PyodideShell session ended.")

def pyodide_main():
    """
    Robust entry point for Pyodide shell
    """
    try:
        # Print startup banner.
        print("=" * 60)
        print("PyodideShell - Secure Virtual Environment")
        print("=" * 60)
        
        # Create an async main function.
        async def main():
            await run_pyodide_shell()
        
        # Get or create event loop.
        try:
            loop = asyncio.get_event_loop()
        except RuntimeError:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            
        loop.run_until_complete(main())
    
    except Exception as main_error:
        print(f"Fatal error: {main_error}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    pyodide_main()