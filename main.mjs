import "zx/globals";
import { getBorderCharacters, table } from "table";

$.verbose = false;
const numberFormatter = new Intl.NumberFormat("de-DE");

const REPOS_PATH = "repositories";
await fs.mkdirp(REPOS_PATH);

const defaultClocArgs = [
  "--vcs=git",
  "--exclude-lang=XML,Markdown,SVG,JSON,SQL,TeX,Text,PlantUML,CSV,HTML,Dockerfile",
  "--force-lang-def=../../cloc_lang_def.txt",
  "--no-autogen",
  "--fullpath",
  "--json",
];

cd(REPOS_PATH);

const tableData = [["Repository", new Date().toISOString().substring(0, 10), "2023-01-01", "2022-01-01", "2021-01-01"]];

for (const url of argv._) {
  const name = url.split("/").pop().replace(".git", "");
  console.log(name);

  if (!fs.pathExistsSync(name)) {
    echo`pulling ${url}`;
    await $`git clone ${url} ${name}`;
  }

  await within(async () => {
    cd(name);

    await $`git checkout master -f`;
    await $`git pull`;

    const loc = await getLOC();

    const loc2 = await getPastLOC("2023-01-01");

    const loc3 = await getPastLOC("2022-01-01");

    const loc4 = await getPastLOC("2021-01-01");

    tableData.push([name, loc, loc2, loc3, loc4]);
  });
}

console.log(
  table(tableData, {
    border: getBorderCharacters(`norc`),
    columns: [
      { alignment: "left" },
      { alignment: "right" },
      { alignment: "right" },
      { alignment: "right" },
      { alignment: "right" },
    ],
  })
);

async function getPastLOC(pastDate) {
  await $`git checkout $(git rev-list -n 1 --first-parent --before="${pastDate} 00:00" master)`;
  await $`prettier --print-width 120 --write "**/*.{js,html,css,tsx,ts,jsx}"`;

  const loc = await getLOC();

  await $`git reset --hard master`;
  return loc;
}

async function getLOC() {
  const clocOutput =
    await $`cloc ${defaultClocArgs} --not-match-f=.\\(spec\\|stories\\|lock\\) --not-match-d=\\(test\\|mock\\|shared\\/shell\\)`;
  const clocJson = JSON.parse(clocOutput.stdout);

  return Object.entries(clocJson)
    .filter(([key]) => key !== "header")
    .map(([key, values]) => `${key}: ${formatNumber(getCode(values))}`)
    .join("\n");
}

function getCode(jsonProperty) {
  return jsonProperty ? jsonProperty.code : 0;
}

function formatNumber(number) {
  return numberFormatter.format(number);
}
