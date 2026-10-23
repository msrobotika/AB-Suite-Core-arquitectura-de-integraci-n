#!/usr/bin/env python3
# SPDX-License-Identifier: MIT
"""Create standalone offline AB-SCL Studio HTML from original source files."""
from pathlib import Path
root=Path(__file__).resolve().parents[1]
html=(root/'index.html').read_text(encoding='utf-8')
html=html.replace('<link rel="stylesheet" href="src/style.css">',
                  '<style>\n'+(root/'src/style.css').read_text(encoding='utf-8')+'\n</style>')
for name in ('core','app'):
    html=html.replace(f'<script src="src/{name}.js"></script>',
                      '<script>\n'+(root/f'src/{name}.js').read_text(encoding='utf-8')+'\n</script>')
html=html.replace('<a href="README.md">Documentación</a>','Documentación incluida en README.md')
assert '<script src=' not in html and 'stylesheet' not in html
output=root/'AB-SCL-Studio-PORTABLE.html'
output.write_text(html,encoding='utf-8')
print(output.name,output.stat().st_size,'bytes')
