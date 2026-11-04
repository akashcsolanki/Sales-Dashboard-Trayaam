"""Recheck known official role URLs, preserving text snapshots for later review.
Automatic parsing never establishes verified candidate fit or application readiness.
"""
import urllib.request,urllib.error,concurrent.futures,json,pathlib,re,datetime,html
APP=pathlib.Path(__file__).resolve().parents[1]; private=APP/'.private'
data=json.loads((private/'snapshot.json').read_text(encoding='utf-8')); rows=[p for p in data['prospects'] if p['shortlist']]
def check(p):
 url=p['job']['Job URL'].split(' ; ')[0].strip(); result={'id':p['id'],'name':p['name'],'url':url,'checkedAt':'2026-11-04','status':'Needs manual review','roles':[]}
 try:
  req=urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0 (compatible; TrayaamResearch/1.0)'})
  with urllib.request.urlopen(req,timeout=18) as response:
   body=response.read(1500000).decode('utf-8',errors='replace');result['httpStatus']=response.status;result['finalUrl']=response.url
  text=html.unescape(re.sub('<[^>]+>',' ',re.sub(r'<(script|style)[\s\S]*?</\1>','',body,flags=re.I)));text=re.sub(r'\s+',' ',text).strip()
  result['pageText']=text[:80000]
  title=p['job']['Live advertised role'];tokens=[w.lower() for w in re.findall(r'[a-zA-Z]+',title) if len(w)>3]
  matches=sum(w in text.lower() for w in tokens);result['titleTokenMatches']=matches;result['titleTokenCount']=len(tokens)
  closed=bool(re.search(r'(this (position|role|vacancy) (has been|is) (filled|closed)|no longer accepting applications|applications (are now |have )closed)',text,re.I))
  result['status']='Closure notice found' if closed else 'Role mentioned · review application route' if tokens and matches/len(tokens)>=.8 else 'Page fetched · role unconfirmed'
  result['note']='Official page retrieved 4 November 2026. Automated title matching is a review aid, not confirmation of an open role or candidate eligibility.'
 except Exception as e:result['status']='Unverified · fetch failed';result['note']=str(e)[:300]
 return result
results=[]
with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
 for result in pool.map(check,rows):results.append(result)
(private/'hiring-rechecks.json').write_text(json.dumps(results,ensure_ascii=False),encoding='utf-8')
print(json.dumps({'checked':len(results),'outcomes':{s:sum(r['status']==s for r in results) for s in sorted({r['status'] for r in results})}}))
