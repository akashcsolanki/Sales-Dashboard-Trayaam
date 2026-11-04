import pathlib,json,csv
APP=pathlib.Path(__file__).resolve().parents[1]; ROOT=APP.parent; OUT=APP/'.private'
def read(p):
 with open(ROOT/p,encoding='utf-8-sig',newline='') as f:return list(csv.DictReader(f))
people=read('outputs/01a11768-7a5c-7be2-92cf-a9796e99a870/UK-Agency-Decision-Makers.csv')
campaign=read('outputs/all-hiring-agencies-campaign-2026-10-08/Outreach-Register.csv')
def literal(value):return "'"+json.dumps(value,ensure_ascii=False).replace("'","''")+"'"
sql=['CREATE TABLE IF NOT EXISTS documents(company_id TEXT NOT NULL,kind TEXT NOT NULL,data TEXT NOT NULL,PRIMARY KEY(company_id,kind));']
for r in people:sql.append(f"UPDATE records SET data=json_set(data,'$.decisionMakerResearch',json({literal(r)})) WHERE id='{r['Company ID']}';")
folder=ROOT/'outputs/all-hiring-agencies-campaign-2026-10-08'
for r in campaign:
 cid=r['company_id'];sql.append(f"UPDATE records SET data=json_set(data,'$.campaign',json({literal(r)})) WHERE id='{cid}';")
 for kind,name in [('application',r['application_file']),('proposal',next((str(p.relative_to(folder)) for p in (folder/'proposals').glob(f"{int(r['number']):03}-*.md")),''))]:
  if not name:continue
  p=folder/name
  if p.exists():
   record={'path':name,'text':p.read_text(encoding='utf-8'),'status':'Prepared draft; not sent. Review against latest context before use.'}
   sql.append(f"INSERT INTO documents VALUES('{cid}','{kind}',{literal(record)}) ON CONFLICT(company_id,kind) DO UPDATE SET data=excluded.data;")
(OUT/'supporting.sql').write_text('\n'.join(sql),encoding='utf-8');print('Prepared decision-maker enrichment for',len(people),'records and campaign evidence for',len(campaign),'companies')
