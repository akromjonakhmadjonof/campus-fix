import json
from pathlib import Path
for root in json.loads(Path('seed.json').read_text(encoding='utf8')):
 print(root['name'],':', '; '.join(c['name']+': '+', '.join(x['name'] for x in c.get('children',[])[:3]) for c in root.get('children',[])[:3]))
