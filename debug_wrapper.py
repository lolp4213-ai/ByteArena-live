import debugpy
import os
import sys

current_dir = os.path.dirname(os.path.abspath(__file__))
app_path = os.path.join(current_dir, 'app.py')

debugpy.configure(python=sys.executable)
debugpy.listen(('127.0.0.1', 5500))

print(f"Debugging {app_path}")
print("Waiting for debugger to attach on port 5678...")
debugpy.wait_for_client()
print("Debugger attached, starting app...")

with open(app_path, 'rb') as f:
    code = compile(f.read(), app_path, 'exec')
    exec(code, {'__name__': '__main__'})