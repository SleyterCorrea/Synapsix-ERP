import json
with open('/tmp/pg.json') as f:
    d = json.load(f)
print('header_html:', len(d.get('header_html', '')))
print('body_html:', len(d.get('body_html', '')))
print('footer_html:', len(d.get('footer_html', '')))
print('global_css:', len(d.get('global_css', '')))
print('body_css:', len(d.get('body_css', '')))
print('header_html preview:', d.get('header_html', '')[:150])
print('body_html preview:', d.get('body_html', '')[:150])
