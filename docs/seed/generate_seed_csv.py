import csv, json
from pathlib import Path

root = Path(__file__).resolve().parents[2]
data = json.loads((root / 'src' / 'data-seed.json').read_text(encoding='utf-8'))
seed = root / 'docs' / 'seed'

master_headers = ['id','partNumber','replacementPartNumber','description','location','warehouseType','minStock','maxStock','openingStock','openingStockDate','warehouseStock','active']
with (seed / 'master_part_seed.csv').open('w', newline='', encoding='utf-8-sig') as file:
    writer = csv.DictWriter(file, fieldnames=master_headers, extrasaction='ignore')
    writer.writeheader()
    for item in data['parts']:
        writer.writerow({**item, 'openingStockDate': '2026-03-30'})

out_headers = ['id','requestDate','requester','partNumber','qtyRequest','qtySupply','warehouseType','documents.pr','documents.po','documents.so','documents.dn','documents.invoice','notes','createdBy','createdAt']
with (seed / 'outbound_seed.csv').open('w', newline='', encoding='utf-8-sig') as file:
    writer = csv.DictWriter(file, fieldnames=out_headers, extrasaction='ignore')
    writer.writeheader()
    for item in data['outbound']:
        writer.writerow({
            **item,
            'documents.pr': item['documents']['pr'],
            'documents.po': item['documents']['po'],
            'documents.so': item['documents']['so'],
            'documents.dn': item['documents']['dn'],
            'documents.invoice': item['documents']['invoice']
        })
