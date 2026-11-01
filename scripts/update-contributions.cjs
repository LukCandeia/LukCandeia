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
  const target = path.resolve('assets/contributions.svg');
  await fs.mkdir(path.dirname(target),{recursive:true});
  await fs.writeFile(target,svg,'utf8');
  core.info('Calendário de contribuições atualizado com dados da API do GitHub.');
}

module.exports = update;
module.exports.renderCalendar = renderCalendar;
