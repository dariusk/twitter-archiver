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

const fs = require("fs");

// Break glass in case of emergency:
// Converter file -> blob
// thanks easrng on mastodon
//const stream = require("stream")
//const readBlob = async (path) =>
//  await new Response(stream.Readable.toWeb(fs.createReadStream(path))).blob();

async function run() { // Must function wrap so we can use async at toplevel
  const bufferPromise = fs.promises.readFile(input);

  let fallback = (msg) => { console.log(msg); };
  let doneFailure = (e) => { console.log("Error!", e, e.stack); };
  let doneSuccess = (msg) => { console.log("Success. Here is a message from Darius that may not apply to you:\n", msg)};
  app.parseZip([bufferPromise], {
    callback:{fallback, doneFailure, doneSuccess},
    baseUrl:options.baseurl || '',
    saveAs:(blob, filename) => blob.arrayBuffer().then(arrayBuffer=>fs.writeFileSync(output, Buffer.from(arrayBuffer)))});
}
run();