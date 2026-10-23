#!/usr/bin/env python3
"""Build the offline single-file edition from editable local assets."""
from pathlib import Path
R=Path(__file__).resolve().parents[1]
html=(R/'index.html').read_text('utf-8')
html=html.replace('<link rel="stylesheet" href="src/style.css">',
                  '<style>\n'+(R/'src/style.css').read_text('utf-8').strip('\n')+'\n</style>')
for name in ('engine','app'):
    html=html.replace('<script src="src/'+name+'.js"></script>',
                      '<script>\n'+(R/'src'/ (name+'.js')).read_text('utf-8').strip('\n')+'\n</script>')
html=html.replace('<a href="README.md">Documentación</a>','Documentación en GitHub')
assert '<script src=' not in html and '<link rel="stylesheet"' not in html
assert 'ABKopEngine' in html and 'rung' in html
(R/'AB-KOP-Studio-PORTABLE.html').write_text(html,'utf-8')
print('Standalone HTML:',(R/'AB-KOP-Studio-PORTABLE.html').stat().st_size,'bytes')
