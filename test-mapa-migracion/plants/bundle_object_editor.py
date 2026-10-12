#!/usr/bin/env python3
"""Build single-file ATRIA object editor, preserving the source map HTML intact."""
from __future__ import annotations
from pathlib import Path
import json, re, zipfile
ROOT=Path(__file__).resolve().parents[2]
SRC=ROOT/'test-mapa-migracion'
OUT=SRC/'editor_bundle'
OUT.mkdir(exist_ok=True)
base=(SRC/'index.html').read_text(encoding='utf8')
editor=(SRC/'plants/object-editor.js').read_text(encoding='utf8')
manifest=json.loads((SRC/'plants/plants_source_manifest.json').read_text(encoding='utf8'))
assert len(manifest['instances'])==46,'Source manifest count changed; re-audit P47'
needle='<script src="plants/object-editor.js"></script>'
assert base.count(needle)==1,'Editor script integration not found exactly once'
assert 'data:image/webp;base64' in base,'Original embedded map source missing'
assert 'ATRIA_OBJECT_EDITOR_TEST' in editor,'Editor smoke assertions missing'
inline=base.replace(needle,'<script>\n'+editor.replace('</script>','<\\/script>')+'\n</script>')
assert needle not in inline and inline.count('ATRIA_OBJECT_EDITOR_TEST')==1
html=OUT/'ATRIA_Editor_Offline.html'
html.write_text(inline,encoding='utf8')
readme=OUT/'LEER_PRIMERO.txt'
readme.write_text(
 'ATRIA — Editor de Objetos: test independiente de mapa.\n'
 '1. Abrir ATRIA_Editor_Offline.html desde Android o computadora.\n'
 '2. Tocar «Editar objeto», elegir P31, corregir máscara, colisión y profundidad.\n'
 '3. Pulsar «Guardar JSON» o «ZIP completo» para conservar la edición.\n'
 '4. Reimportar el JSON para recuperar las correcciones.\n'
 'IMPORTANTE: P31 no está aprobada visualmente. El inventario fuente vigente\n'
 'contiene 46 registros; el checkpoint 47 refiere una instancia P47 aún sin\n'
 'coordenadas ni recurso fuente recuperados en GitHub. No migrar producción.\n',
 encoding='utf8')
package=OUT/'ATRIA_Editor_Objetos_P31_Experimental.zip'
with zipfile.ZipFile(package,'w',zipfile.ZIP_DEFLATED,compresslevel=7) as z:
    z.write(html,html.name)
    z.write(readme,readme.name)
    for name in ['test-mapa-migracion/plants/PLANTS_V3_CHECKPOINT.md',
                 'test-mapa-migracion/plants/P31_CHECKPOINT.md',
                 'test-mapa-migracion/plants/OBJECT_EDITOR_CHECKPOINT.md',
                 'test-mapa-migracion/plants/plants_source_manifest.json']:
        p=ROOT/name
        if p.is_file():z.write(p,str(Path(name).relative_to('test-mapa-migracion')))
    pilots=SRC/'plants/pilot_output'
    if pilots.exists():
        for p in sorted(pilots.iterdir()):
            if p.is_file() and p.suffix.lower() in {'.png','.json'}:
                z.write(p,'P31_CANDIDATE_UNAPPROVED/'+p.name)
print(json.dumps({'offline_file':str(html),'bytes':html.stat().st_size,
                  'package':str(package),'package_bytes':package.stat().st_size,
                  'manifest_objects':len(manifest['instances'])},indent=2))
