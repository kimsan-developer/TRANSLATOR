import os
import zipfile

def zip_project(output_zip):
    exclude_dirs = {'node_modules', '.git', '__pycache__', '.pytest_cache', 'temp_uploads'}
    exclude_files = {output_zip, '.DS_Store'}
    
    root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
    
    with zipfile.ZipFile(output_zip, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for root, dirs, files in os.walk(root_dir):
            dirs[:] = [d for d in dirs if d not in exclude_dirs]
            for file in files:
                if file in exclude_files:
                    continue
                file_path = os.path.join(root, file)
                rel_path = os.path.relpath(file_path, root_dir)
                zipf.write(file_path, rel_path)
    
    size_mb = os.path.getsize(output_zip) / (1024 * 1024)
    print(f"Successfully created {output_zip} ({size_mb:.2f} MB)")

if __name__ == '__main__':
    zip_project('video-translator-ai-pro.zip')
