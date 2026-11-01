const fs = require('node:fs/promises');
const path = require('node:path');

const escape = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[char]));

function renderCalendar(calendar, commits, now = new Date()) {
  const palette = ['#161B22','#20376B','#355F99','#639CE0','#A3C8F6'];
  const days = calendar.weeks.flatMap(week => week.contributionDays);
  if (!days.length || days.some(day => !/^\d{4}-\d{2}-\d{2}$/.test(day.date) || !Number.isInteger(day.contributionCount) || day.contributionCount < 0 || !Number.isInteger(day.weekday) || day.weekday < 0 || day.weekday > 6)) throw new Error('Calendário inválido; arquivo anterior preservado.');
  if (!Number.isInteger(commits) || commits < 0) throw new Error('Contagem de commits inválida.');
  const max = Math.max(1,...days.map(day => day.contributionCount));
  const months = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
  const cell = 13, step = 18, left = 74, top = 91;
  const width = Math.max(1100, left + calendar.weeks.length * step + 40);
  let previousMonth = -1;
  const labels = [];
  const squares = [];
  calendar.weeks.forEach((week, wi) => {
    week.contributionDays.forEach(day => {
      const date = new Date(day.date+'T00:00:00Z');
      const month = date.getUTCMonth();
      if (month !== previousMonth) {
        labels.push(`<text x="${left+wi*step}" y="76">${months[month]}</text>`);
        previousMonth = month;
      }
      const bucket = day.contributionCount === 0 ? 0 : Math.min(4, Math.ceil(4 * day.contributionCount / max));
      squares.push(`<rect x="${left+wi*step}" y="${top+day.weekday*step}" width="${cell}" height="${cell}" rx="3" fill="${palette[bucket]}"><title>${escape(day.date)}: ${day.contributionCount} contribuições</title></rect>`);
    });
  });
  const start = days[0].date.split('-').reverse().join('/');
  const end = days.at(-1).date.split('-').reverse().join('/');
  const total = days.reduce((sum,day) => sum+day.contributionCount,0);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="274" viewBox="0 0 ${width} 274" role="img" aria-labelledby="title desc">
<title id="title">Contribuições de Lukas Candeia</title>
<desc id="desc">${total} contribuições e ${commits} commits contabilizados pelo GitHub entre ${start} e ${end}. O calendário inclui também outras atividades além de commits.</desc>
<rect x=".5" y=".5" width="${width-1}" height="273" rx="10" fill="#0D1117" stroke="#30363D"/>
<g font-family="Segoe UI,Arial,sans-serif">
<text x="28" y="35" fill="#E8EDF5" font-size="19" font-weight="600">${total.toLocaleString('pt-BR')} contribuições · ${commits.toLocaleString('pt-BR')} commits</text>
<text x="${width-28}" y="35" fill="#A5ADBA" font-size="13" text-anchor="end">${start} — ${end}</text>
<g fill="#A5ADBA" font-size="12">${labels.join('')}<text x="28" y="${top+step+11}">seg</text><text x="28" y="${top+3*step+11}">qua</text><text x="28" y="${top+5*step+11}">sex</text></g>
${squares.join('')}
<text x="28" y="250" fill="#A5ADBA" font-size="12">Atualizado em ${now.toISOString().slice(0,10)} · GitHub</text>
<g transform="translate(${width-213},237)"><text x="0" y="12" fill="#A5ADBA" font-size="12">Menos</text>${palette.map((color,i)=>`<rect x="${46+i*18}" width="13" height="13" rx="3" fill="${color}"/>`).join('')}<text x="145" y="12" fill="#A5ADBA" font-size="12">Mais</text></g>
</g></svg>`;
}

function renderStats(calendar, commits, totals) {
  const days=calendar.weeks.flatMap(w=>w.contributionDays);
  const total=days.reduce((sum,d)=>sum+d.contributionCount,0);
  const active=days.filter(d=>d.contributionCount>0).length;
  const rows=totals ? [
    ['Stars recebidas',totals.stars],['Commits no período',commits],
    ['Pull requests',totals.prs],['Issues criadas',totals.issues],['Contribuições no período',total]
  ] : [['Commits no período',commits],['Contribuições no período',total],['Dias com atividade',active]];
  const note=totals?'Stars: repositórios próprios públicos, sem forks.':'Resumo das contribuições públicas.';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="520" height="230" viewBox="0 0 520 230" role="img" aria-labelledby="t d"><title id="t">GitHub de Lukas Candeia</title><desc id="d">Estatísticas calculadas pela API do GitHub.</desc><rect x=".5" y=".5" width="519" height="229" rx="6" fill="#0D1117" stroke="#30363D"/><g font-family="Segoe UI,Arial,sans-serif"><text x="24" y="32" fill="#8AB4ED" font-size="18" font-weight="600">GitHub de Lukas Candeia</text>${rows.map(([label,n],i)=>`<text x="24" y="${66+i*25}" fill="#E8EDF5" font-size="14">${label}</text><text x="493" y="${66+i*25}" text-anchor="end" fill="#E8EDF5" font-size="14" font-weight="600">${Number(n).toLocaleString('pt-BR')}</text>`).join('')}<text x="24" y="205" fill="#A5ADBA" font-size="10">${note}</text><text x="24" y="221" fill="#A5ADBA" font-size="10">Período: ${days[0].date} a ${days.at(-1).date}</text></g></svg>`;
}

function renderActivity(calendar) {
  const days=calendar.weeks.flatMap(w=>w.contributionDays).slice(-31);
  if(!days.length)throw new Error('Não há dias no calendário.');
  const max=Math.max(1,...days.map(d=>d.contributionCount));
  const x=i=>62+i*978/Math.max(1,days.length-1);
  const y=n=>224-n*155/max;
  const points=days.map((d,i)=>`${x(i).toFixed(2)},${y(d.contributionCount).toFixed(2)}`).join(' ');
  const grid=Array.from({length:5},(_,i)=>{const n=Math.ceil(max*i/4);return `<line x1="62" y1="${y(n)}" x2="1040" y2="${y(n)}" stroke="#21262D"/><text x="46" y="${y(n)+4}" fill="#A5ADBA" text-anchor="end" font-size="11">${n}</text>`;}).join('');
  const labels=days.map((d,i)=>i%5===0||i===days.length-1?`<text x="${x(i)}" y="249" fill="#A5ADBA" font-size="11" text-anchor="middle">${d.date.slice(8)}/${d.date.slice(5,7)}</text>`:'').join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1100" height="285" viewBox="0 0 1100 285" role="img" aria-labelledby="t d"><title id="t">Atividade recente de Lukas Candeia</title><desc id="d">Contribuições diárias nos últimos ${days.length} dias disponíveis.</desc><rect x=".5" y=".5" width="1099" height="284" rx="6" fill="#0D1117" stroke="#30363D"/><g font-family="Segoe UI,Arial,sans-serif"><text x="28" y="32" fill="#8AB4ED" font-size="19" font-weight="600">Contribuições de Lukas Candeia</text>${grid}<polygon points="62,224 ${points} ${x(days.length-1)},224" fill="#20376B" fill-opacity=".35"/><polyline points="${points}" fill="none" stroke="#639CE0" stroke-width="2.5"/>${days.map((d,i)=>`<circle cx="${x(i)}" cy="${y(d.contributionCount)}" r="3" fill="#E3AA91"><title>${d.date}: ${d.contributionCount} contribuições</title></circle>`).join('')}${labels}<text x="28" y="274" fill="#A5ADBA" font-size="11">Dados da API do GitHub · atualização diária</text></g></svg>`;
}

async function update({github,core}) {
  const now = new Date();
  const from = new Date(now);
  from.setUTCDate(from.getUTCDate()-364);
  from.setUTCHours(0,0,0,0);
  const vars = {login:'LukCandeia', from:from.toISOString(), to:now.toISOString()};
  // Consultas separadas para reduzir o custo de cada consulta na API.
  const calendarResult = await github.graphql(`query($login:String!,$from:DateTime!,$to:DateTime!) {
    user(login:$login) { contributionsCollection(from:$from,to:$to) {
      contributionCalendar { weeks { contributionDays { date weekday contributionCount } } }
    } }
  }`,vars);
  const countResult = await github.graphql(`query($login:String!,$from:DateTime!,$to:DateTime!) {
    user(login:$login) { contributionsCollection(from:$from,to:$to) { totalCommitContributions } }
  }`,vars);
  const calendar = calendarResult.user?.contributionsCollection?.contributionCalendar;
  const commits = countResult.user?.contributionsCollection?.totalCommitContributions;
  if (!calendar?.weeks?.length) throw new Error('A API não retornou o calendário.');
  const svg = renderCalendar(calendar,commits,now);
  let after=null, stars=0, prs=0, issues=0;
  do {
    const result=await github.graphql(`query($login:String!,$after:String) {
      user(login:$login) {
        pullRequests { totalCount }
        issues { totalCount }
        repositories(first:100,after:$after,privacy:PUBLIC,ownerAffiliations:[OWNER],isFork:false) {
          nodes { stargazerCount }
          pageInfo { hasNextPage endCursor }
        }
      }
    }`,{login:vars.login,after});
    if(!result.user)throw new Error('Estatísticas não retornadas pela API.');
    stars+=result.user.repositories.nodes.reduce((sum,r)=>sum+r.stargazerCount,0);
    prs=result.user.pullRequests.totalCount;
    issues=result.user.issues.totalCount;
    const page=result.user.repositories.pageInfo;
    if(page.hasNextPage&&!page.endCursor)throw new Error('Paginação incompleta.');
    after=page.hasNextPage?page.endCursor:null;
  }while(after);
  const files={
    'contributions.svg':svg,
    'stats.svg':renderStats(calendar,commits,{stars,prs,issues}),
    'activity.svg':renderActivity(calendar)
  };
  await fs.mkdir(path.resolve('assets'),{recursive:true});
  for(const [name,content] of Object.entries(files))await fs.writeFile(path.resolve('assets',name),content,'utf8');
  core.info('Calendário, estatísticas e gráfico atualizados com dados do GitHub.');
}

module.exports = update;
module.exports.renderCalendar = renderCalendar;
module.exports.renderStats = renderStats;
module.exports.renderActivity = renderActivity;
