from pathlib import Path
import shutil
root=Path('C:/Capstone_Project_Web'); backup=root/'scratch/responsive-20261104/before'
def edit(name, changes):
 p=root/name; old=p.read_text(encoding='utf-8'); new=old
 for a,b in changes:
  if a not in new: raise Exception(f'Missing replacement in {name}: {a[:100]}')
  new=new.replace(a,b)
 if new!=old:
  dest=backup/name
  if not dest.exists():
   dest.parent.mkdir(parents=True,exist_ok=True); shutil.copy2(p,dest)
  p.write_text(new,encoding='utf-8',newline='')
