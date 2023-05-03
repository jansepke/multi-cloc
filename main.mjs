import "zx/globals";
import { getBorderCharacters, table } from "table";

$.verbose = false;
const numberFormatter = new Intl.NumberFormat("de-DE");

const DIR = (await $`pwd`).stdout.replace("\n", "");
const REPOS_PATH = "repositories";
await fs.mkdirp(REPOS_PATH);

const defaultClocArgs = [
  "--vcs=git",
  "--exclude-lang=XML,Markdown,SVG,JSON,SQL,TeX,Text,PlantUML,CSV,HTML,Dockerfile",
  `--force-lang-def=${DIR}/cloc_lang_def.txt`,
  "--no-autogen",
  "--fullpath",
  "--json",
];

const tableData = [["Repository", new Date().toISOString().substring(0, 10), "2023-01-01", "2022-01-01", "2021-01-01"]];

for (const urlOrPath of argv._) {
  const name = urlOrPath.split("/").pop().replace(".git", "");
  console.log(name);

  let path = urlOrPath;
  if (urlOrPath.startsWith("ssh://")) {
    path = `${REPOS_PATH}/${name}`;

    if (!fs.pathExistsSync(path)) {
      echo`pulling ${urlOrPath} into ${path}`;
      await $`git clone ${urlOrPath} ${path}`;
    }
  }

  await within(async () => {
    cd(path);

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
  $.verbose = true;
  const clocOutput =
    await $`cloc ${defaultClocArgs} --not-match-f=.\\(spec\\|stories\\|lock\\) --not-match-d=\\(cypress\|test\\|mock\\|shared\\/shell\\)`;
  $.verbose = false;
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
