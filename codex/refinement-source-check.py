from pathlib import Path
import json
for name in ['refinement-cleanup.py','refinement-density.py','refinement-gallery.py','refinement-final-fixes.py']:(Path('codex')/name).unlink(missing_ok=True)
p=Path('README.md');s=p.read_text(encoding='utf8').replace('The demo has seven fictional reports, including staff progress and resolution history.','The seeder supplies seven fictional reports, including staff progress and resolution history; additional existing reports are preserved.');p.write_text(s,encoding='utf8')
en=json.loads(Path('web/src/messages/en.json').read_text(encoding='utf8'))
def leaves(obj):return sum(1 if isinstance(v,str) else leaves(v) for v in obj.values())
print('Localized leaf strings:',leaves(en),'taxonomy entries:',len(en['app']['taxonomy']))
print('Refinement screenshots:',len(list(Path('codex/screenshots/refinement').glob('*.png'))))
for directory in ['web/src','api/src','mobile']:
 for file in Path(directory).rglob('*'):
  if file.suffix in ['.tsx','.ts','.json','.css'] and not any(part in ['node_modules','generated','.expo','android','ios'] for part in file.parts):
   text=file.read_text(encoding='utf8');assert '\ufffd' not in text,file
print('Source UTF-8 integrity: passed')
