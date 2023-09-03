require("./jszip.js")
const app = require("./app.js")

const { program } = require('commander');

program
  .description('Split a string into substrings and display as an array')
  .argument('<input>', 'zip file to read')
  .argument('<output>', 'zip file to write')
  .option('-b, --base-url <char>')
  .option('-d, --disable-directories')
  ;

program.parse();
const options = program.opts();
const [input, output] = [program.args[0], program.args[1]];

//console.log(input, output, options.baseUrl, options.disableDirectories);

let fallback = (msg) => { console.log(msg); }
let doneFailure = (msg) => { console.log("Error!", msg); }
app.parseZip({callback:{fallback, doneFailure}})
