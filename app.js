const webEnvironment =typeof document !== "undefined"
const directoriesDisabled = webEnvironment && document.getElementById('disable-directories').checked;
console.log('loaded...');
function makeOpenGraph(tweet, accountInfo) {
  // trim trailing slash if included by user
  const baseUrl = document.getElementById('baseUrl').value.replace(/\/$/,'');
  let mediaUrl = '';
  let firstMedia = null;
  if (tweet.extended_entities && tweet.extended_entities.media && tweet.extended_entities.media.length > 0) {
    firstMedia = tweet.extended_entities.media[0];
    if (firstMedia.type === 'photo') {
      const fileNameMatch = firstMedia.media_url.match(/(?:.+\/)(.+)/);
      mediaUrl = `${baseUrl}/${accountInfo.userName}/tweets_media/${tweet.id_str || tweet.id}-${fileNameMatch ? fileNameMatch[1] : ''}`;
    }
    if (firstMedia.type === 'video') {
      const variantVideos = firstMedia.video_info.variants.filter(item => item.content_type === 'video/mp4');
      const video = variantVideos
        .filter(item => item.bitrate)
        .reduce((prev, current) => (+prev.bitrate > +current.bitrate) ? prev : current);
      const fileNameMatch = video.url.match(/(?:.+\/)(.+)\?/);
      mediaUrl = `${baseUrl}/${accountInfo.userName}/tweets_media/${tweet.id_str || tweet.id}-${fileNameMatch ? fileNameMatch[1] : ''}`;
    }
  }
  return `
  <meta property="og:url" content="${baseUrl}/${accountInfo.userName}/status/${tweet.id_str || tweet.id}" />
  <meta property="og:title" content="${accountInfo.displayName} on Twitter (archived)" />
  <meta property="og:description" content="${tweet.title.replace(/"/g,"'")}" />
  ${firstMedia && firstMedia.type === 'photo' ? `<meta property="og:image" content="${mediaUrl}" />` : ''}
  ${firstMedia && firstMedia.type === 'video' ? `<meta property="og:video" content="${mediaUrl}" />` : ''}
`;
}

function formatTweet(tweet) {
  tweet.title = tweet.full_text;
  if (tweet.entities.urls && tweet.entities.urls.length > 0) {
    for (let url of tweet.entities.urls) {
      tweet.full_text = tweet.full_text.replace(url.url, `<a href="${url.expanded_url}">${url.expanded_url}</a>`);
    }
    tweet.title = tweet.full_text;
  }
  if (tweet.extended_entities && tweet.extended_entities.media && tweet.extended_entities.media.length > 0) {
    let medias = [];
    for (let media of tweet.extended_entities.media) {
      if (media.type === 'photo') {
        const fileNameMatch = media.media_url.match(/(?:.+\/)(.+)/);
        const newUrl = `${directoriesDisabled ? '../' : ''}../../tweets_media/${tweet.id_str || tweet.id}-${fileNameMatch ? fileNameMatch[1] : ''}`;
        medias.push(`<li><a href="${newUrl}"><img src="${newUrl}"></a></li>`);
      }
      if (media.type === 'video') {
        const variantVideos = media.video_info.variants.filter(item => item.content_type === 'video/mp4');
        const video = variantVideos
          .filter(item => item.bitrate)
          .reduce((prev, current) => (+prev.bitrate > +current.bitrate) ? prev : current);
        const fileNameMatch = video.url.match(/(?:.+\/)(.+)\??/);
        const newUrl = `${directoriesDisabled ? '../' : ''}../../tweets_media/${tweet.id_str || tweet.id}-${fileNameMatch ? fileNameMatch[1] : ''}`;
        medias.push(`<li><video controls src="${newUrl}"></video></li>`);
      }
    }
    tweet.full_text = tweet.full_text.replace(tweet.extended_entities.media[0].url, `<div class="gallery"><ul>${medias.join('')}</ul></div>`);
    // put a placeholder title if it's a media-only tweet with no text
    if (tweet.extended_entities.media[0].indices[0] === '0') {
      tweet.title = '(media tweet)';
    } else {
      tweet.title = tweet.full_text.replace(/<[^>]+>/g, '');
    }
  }
  tweet.full_text = tweet.full_text.replace(/(?:\r\n|\r|\n)/g, '<br>');
  return tweet;
}

// threadStatus can be one of: 'parent', 'child', 'main'
function makeTweet(tweet, accountInfo, threadStatus) {
  const articles = [];
  // first check if there is a parent and render that, but not if we are traversing the children tree
  if (threadStatus !== 'child' && tweet.in_reply_to_status_id_str && tweet.in_reply_to_user_id_str === accountInfo.accountId.toString()) {
    let parentTweet = tweets.find(item => item.id_str === tweet.in_reply_to_status_id_str);
    if (parentTweet) {
      parentTweet = formatTweet(parentTweet);
      articles.push(makeTweet(parentTweet, accountInfo, 'parent'));
    }
  }
  // now render this main tweet
  const article = `
  	  <article class="tweet ${threadStatus === 'parent' ? 'parent' : ''} ${threadStatus === 'child' ? 'child' : ''}" ${threadStatus === 'main' ? 'id="main"' : ''}>
  	    <p class="display_name">
  	      ${accountInfo.displayName}
  	    </p>
  	    <p class="user_name">
  	      @${accountInfo.userName}
  	    </p>
  	    <p class="full_text">
  	      ${tweet.full_text}
  	    </p>
  	    <p class="created_at">
  	      ${new Date(tweet.created_at).toLocaleString()}
  	    </p>
  	    <p class="favorite_count">Favs: ${tweet.favorite_count}</p>
  	    <p class="retweet_count">Retweets: ${tweet.retweet_count}</p>
  	    <a class="permalink" href="../${tweet.id_str}">link</a>
  	  </article>
`;
  articles.push(article);
  // now check if there are children and render those, but only if we are not traversing the parent tree!
  if (threadStatus !== 'parent' && tweet.children && tweet.children.length > 0) {
    for (let child of tweet.children) {
      let childTweet = tweets.find(item => item.id_str === child);
      if (childTweet) {
        childTweet = formatTweet(childTweet);
        articles.push(makeTweet(childTweet, accountInfo, 'child'));
      }
    }
  }
  return articles.join('\n');
}

function makePage(tweet, accountInfo) {
  tweet = formatTweet(tweet);
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  ${makeOpenGraph(tweet, accountInfo)}
  <title>${tweet.title}</title>
  <link rel="stylesheet" href="../../../styles.css">
</head>
<body>
  <div class="wrapper">
  	<div class="flex-wrap">
      <a href="../../../">
        <p>&larr; @${accountInfo.userName} Twitter archive</p>
      </a>
      ${makeTweet(tweet, accountInfo, 'main')}
  	</div>
  </div>
</body>
<script>
document.getElementById('main').scrollIntoView();
</script>
</html>`;
  return html;
}

function makeStyles() {
  return `
body {
  font-family: sans-serif;
  font-size: 1.2em;
}
#search-input {
  font-size: 1.5em;
  width: 100%;
}
.search_time {
  margin-top: 4px;
}
.search_text {
  display: inline;
}
.search_link {
  display: inline;
}
#sorting {
  margin-top: 8px;
  line-height: 1.7em;
}
.sort-button {
  font-size: 1.0em;
}
.wrapper {
  display: block;
  max-width: 600px;
  margin: 0 auto;
  word-wrap: break-word;
}
.flex-wrap {
  display: flex;
  flex-direction: column;
}
.tweet {
    background-color: #e8e8e8;
    max-width: 600px;
    padding: 16px;
    font-family: sans-serif;
    font-size: 1.2em;
    border: 2px solid black;
    border-radius: 16px;
}
.tweet img {
  max-height: 100%;
  vertical-align: bottom;
  width: 100%;
  object-fit: cover;
}
.tweet video {
  max-height: 100%;
  vertical-align: bottom;
  width: 100%;
}
.tweet ul {
  display: flex;
  flex-wrap: wrap;
  list-style-type: none;
  gap: 8px;
  padding-left: 0px;
  margin-bottom: 0px;
}
.tweet li {
  height: 20vh;
  width: 20vh;
  flex-grow: 1;
}
.tweet .display_name {
  margin-bottom: 0;
  margin-top: 0;
}
.tweet .user_name {
  margin-top: 4px;
}
.tweet .favorite_count {
  display: inline-block;
  margin-bottom: 0;
}
.tweet .retweet_count {
  display: inline-block;
  margin-left: 16px;
  margin-bottom: 0;
}
.tweet .created_at {
  margin-bottom: 0;
}
.tweet .permalink {
  margin-left: 16px;
}
.child {
  margin-top: 16px;
  margin-left: 64px;
  max-width: calc(600px - 64px);
  background-color: white;
}
.parent {
  margin-bottom: 16px;
  margin-right: 64px;
  max-width: calc(600px - 64px);
  background-color: white;
}
@media screen and (max-width: 599px) {
  .tweet li {
    height: 15vh;
    width: 15vh;
    flex-grow: 1;
  }
}
@media(prefers-color-scheme: dark) {
  body {
    background-color: black;
    color: white;
  }
  a {
    color: #33ff00;
    text-decoration: none;
  }
  a:hover {
    color: #33ff00;
    text-decoration: underline;
  }
  .tweet {
    background-color: black;
    border: 1px solid gray; /*#33ff00;*/
    border-radius: 5px;
  }
  .child {
    background-color: black;
  }
  .parent {
    background-color: black;
  }
  button {
    background-color: black;
    color: white;
  }
  input {
    background-color: black;
    color: white;
  }
  .tweet .favorite_count {
    color: #33ff00;
  }
  .tweet .retweet_count {
    color: #33ff00;
  }
  .tweet .created_at {
    color: #33ff00;
  }
}
#tabs {
  margin: -16px 0 0;
}
.tab:first-child {
  margin-left: -16px;
  border-top-left-radius: 16px;
}
.hr {
  margin: 0 -16px 16px -16px;
}
.tab {
  border: none;
  font-size: 1.2em;
  cursor: pointer;
  padding: 4px 10px;
  border-right: 2px solid black;
  box-sizing: border-box;
}
.tab.active {
  text-decoration: underline;
}
#browse-sort > button {
  font-size: 1.0em;
}
#page-num {
  font-size: 1.0em;
  width: 80px;
}
#browse-sort {
  line-height: 1.7em;
}
#paging {
  margin: 8px 0;
}`;
}

function parseZip() {
  console.log('starting...');
  const $output = document.getElementById('output');
  document.getElementById('loading').hidden = false;
  $output.innerHTML += `<p>Starting...</p>`;
  document.querySelectorAll('body')[0].scrollIntoView(false);
  const dateBefore = new Date();
  function handleFile(f) {
    JSZip.loadAsync(f)
      .then(zip => {
        const dateAfter = new Date();
        zip.file('data/manifest.js').async("string").then(function(content) {
          eval(content);
          const tweetFiles = window.__THAR_CONFIG.dataTypes.tweets.files;
          const userName = window.__THAR_CONFIG.userInfo.userName;
          const displayName = window.__THAR_CONFIG.userInfo.displayName;
          const accountId = window.__THAR_CONFIG.userInfo.accountId;
          const accountInfo = {
            userName, displayName, accountId,
          };
          // set up for grabbing all the tweet data
          let promises = [];
          for (const file of tweetFiles) {
            promises.push(new Promise((resolve, reject) => {
              zip.file(file.fileName).async('string').then(tweetContent => {
                eval(tweetContent);
                resolve(`done ${file.fileName}`);
              });
            }));
          }
          // grab all the tweet data
          Promise.all(promises).then(values => {
            // when done...
            const siteZip = new JSZip();
						siteZip.file(`styles.css`, makeStyles());
            // flatten the arrays of tweets into one big array
            tweets = [];
            $output.innerHTML += `<p>Filtering and flattening tweets...</p>`;
            for (const wrapper of Object.keys(window.YTD.tweets)) {
              for (const data of window.YTD.tweets[wrapper]) {
                const tweet = data.tweet;
                // only save tweets that are original tweets or replies to myself
                if (!tweet.in_reply_to_user_id_str || tweet.in_reply_to_user_id_str === accountId.toString()) {
                  tweets.push(tweet);
                }
              }
            }
            $output.innerHTML += `<p>Setting up threading metadata...</p>`;
            // iterate once through every tweet to set up the children array
            // so if something I wrote has two direct replies that I wrote, it will have an array size 2 with each ID of the two child replies
            for (const tweet of tweets) {
              if (tweet.in_reply_to_user_id_str === accountId.toString()) {
                // find the original tweet in the data structure
                const parentIndex = tweets.findIndex(item => item.id_str === tweet.in_reply_to_status_id_str);
                if (parentIndex >= 0) { 
                  if (!tweets[parentIndex].children) {
                    tweets[parentIndex].children = [tweet.id_str];
                  } else {
                    tweets[parentIndex].children.push(tweet.id_str);
                  }
                }
              }
            }
            $output.innerHTML += `<p>Making all the HTML pages...</p>`;
            document.querySelectorAll('body')[0].scrollIntoView(false);
            for (const tweet of tweets) {
                let id = tweet.id_str || tweet.id;
                if (directoriesDisabled) {
                  siteZip.file(`${userName}/status/${id}.html`, makePage(tweet, accountInfo));
                } else {
                  siteZip.file(`${userName}/status/${id}/index.html`, makePage(tweet, accountInfo));
                }
            }
            $output.innerHTML += `<p>Setting up the search documents...</p>`;
            document.querySelectorAll('body')[0].scrollIntoView(false);
            const searchDocuments = tweets
              .filter(tweet => tweet.full_text.substr(0,4) !== 'RT @')
              .map(tweet => {
                  return {
                    created_at: tweet.created_at,
                    id_str: tweet.id_str,
                    full_text: tweet.full_text,
                    favorite_count: tweet.favorite_count,
                    retweet_count: tweet.retweet_count,
                  };
                });
            siteZip.file(`searchDocuments.js`, 'const searchDocuments = ' + JSON.stringify(searchDocuments));
            siteZip.file(`app.js`, makeOutputAppJs(accountInfo));
            siteZip.file(`index.html`, makeOutputIndexHtml(accountInfo));
            $output.innerHTML += `<p>Dropping in all your media files...</p>`;
            document.querySelectorAll('body')[0].scrollIntoView(false);
            zip.folder('data/tweets_media').forEach((relativePath, file) => {
              // only include this in the archive if it's original material we posted (not RTs)
              // grab the tweet id from the filename
              const matchId = relativePath.match(/^(.+?)-/);
              const tweetId = matchId ? matchId[1] : '';
              if (tweetId) {
                const tweet = tweets.find(tweet => tweet.id_str === tweetId);
                if (tweet
                    && tweet.extended_entities
                    && tweet.extended_entities.media
                    && tweet.extended_entities.media.length > 0) {
                  // if this tweet has media and it's original material (not from a retweet), add it to the zip
                  if (!tweet.extended_entities.media[0].source_user_id_str || tweet.extended_entities.media[0].source_user_id_str === accountInfo.accountId.toString()) {
                    siteZip.file(`${userName}/tweets_media/${relativePath}`, file.async('blob'));
                  }
                }
              }
            });
            siteZip.generateAsync({ type: 'blob' }).then(blob => {
              saveAs(blob, 'archive.zip');
              console.log('DONE');
              document.getElementById('loading').hidden = true;
              $output.innerHTML += `<p><strong>DONE!!!</strong> Check your browser downloads for "archive.zip", and then unzip it on a web server somewhere. <em>It is likely to be much smaller than your original zip because it won't have media for stuff you retweeted.</em> I highly recommend that you upload the zip file itself to the server and unzip it once it's there. That way your file transfer will go much faster than if you try to unzip it localy and then upload 100k files. If you are using something like cPanel on your host, I believe most versions of that let you unzip a file you've uploaded somewhere in the user interface.</p>`;
              document.querySelectorAll('body')[0].scrollIntoView(false);
            }, err => { console.log('ERR', err);
              $output.innerHTML += `<p><strong>ERROR!</strong> ${err.toString()}</p>`;
              document.querySelectorAll('body')[0].scrollIntoView(false);
            });
          });
        });
      }).catch(error => {
        const $output = document.getElementById('output');
        document.getElementById('loading').hidden = true;
        $output.innerHTML = `<p class="error">Error! ${error.toString()}</p>`;
        if (error.toString().includes('TypeError')) {
          $output.innerHTML += `<p>I am guessing that your zip file is missing some files. It is also possible that you unzipped and re-zipped your file and the data is in an extra subdirectory. Check out the "Known problems" section above. You'll need the "data" directory to be in the zip root, not living under some other directory.</p>`;
        }
        if (error.toString().includes('Corrupted')) {
          $output.innerHTML += `<p>I am guessing that your archive is too big! If it's more than 2GB you're likely to see this error. If you look above at the "Known problems" section, you'll see a potential solution. Sorry it is a bit of a pain in the ass.</p>`;
        }
      });
  }
  let files = document.getElementById('file').files;
  for (const file of files) {
    handleFile(file);
  }
}

function makeOutputAppJs(accountInfo) {
  const outputAppJs = `
let results;

var index = new FlexSearch.Document({
	encode: function(str){
		const cjkItems = str.replace(/[\\x00-\\x7F]/g, "").split("");
		const asciiItems = str.toLowerCase().split(/\\W+/);
		return cjkItems.concat(asciiItems);
  },
  document: {
    id: "id_str",
    index: ["full_text"],
    store: true
  }
});


const searchInput = document.getElementById('search-input');

function processData(data) {
  for (doc of data) {
    index.add({
        id_str: doc.id_str,
        created_at: doc.created_at,
        full_text: doc.full_text,
        favorite_count: doc.favorite_count,
        retweet_count: doc.retweet_count
    })
  };
  document.getElementById('loading').hidden = true;
  document.getElementById('search').hidden = false;
}

processData(searchDocuments);
let browseDocuments = searchDocuments.sort(function(a,b){
  return new Date(b.created_at) - new Date(a.created_at);
});

function sortResults(criterion) {
  if (criterion === 'newest-first') {
    results = results.sort(function(a,b){
      return new Date(b.created_at) - new Date(a.created_at);
    });
    renderResults();
  }
  if (criterion === 'oldest-first') {
    results = results.sort(function(a,b){
      return new Date(a.created_at) - new Date(b.created_at);
    });
    renderResults();
  }
  if (criterion === 'most-relevant') {
    results = results.sort(function(a,b){
      return a.index - b.index;
    });
    renderResults();
  }
  if (criterion === 'most-popular') {
    results = results.sort(function(a,b){
      return (+b.favorite_count + +b.retweet_count) - (+a.favorite_count + +a.retweet_count);
    });
    renderResults();
  }
  if (criterion === 'newest-first-browse') {
    browseDocuments = browseDocuments.sort(function(a,b){
      return new Date(b.created_at) - new Date(a.created_at);
    });
    renderBrowse();
  }
  if (criterion === 'oldest-first-browse') {
    browseDocuments = browseDocuments.sort(function(a,b){
      return new Date(a.created_at) - new Date(b.created_at);
    });
    renderBrowse();
  }
  if (criterion === 'most-popular-browse') {
    browseDocuments = browseDocuments.sort(function(a,b){
      return (+b.favorite_count + +b.retweet_count) - (+a.favorite_count + +a.retweet_count);
    });
    renderBrowse();
  }
}

function renderResults() {
  const output = results.map(item => \`<p class="search_item"><div class="search_link"><a href="${accountInfo.userName}/status/\${item.id_str}">link</a></div> <div class="search_text">\${item.full_text}</div><div class="search_time">\${new Date(item.created_at).toLocaleString()}</div><hr class="search_divider" /></p>\`.replace(/\\.\\.\\/\\.\\.\\/tweets_media\\//g,'${accountInfo.userName}/tweets_media/'));
  document.getElementById('output').innerHTML = output.join('');
  if (results.length > 0) {
    document.getElementById('output').innerHTML += '<a href="#tabs">top &uarr;</a>';
  }
}

function onSearchChange(e) {
  results = index.search(e.target.value, { enrich: true });
  if (results.length > 0) {
    // limit search results to the top 100 by relevance
    results = results.slice(0,100);
    // preserve original search result order in the 'index' variable since that is ordered by relevance
    results = results[0].result.map((item, index) => { let result = item.doc; result.index = index; return result;});
  }
  renderResults();
}
searchInput.addEventListener('input', onSearchChange);

function searchTab() {
  const clickedTab = document.getElementById('search-tab');
  clickedTab.classList.add('active');
  const otherTab = document.getElementById('browse-tab');
  otherTab.classList.remove('active');
  document.getElementById('browse').hidden = true;
  document.getElementById('search').hidden = false;
}

function browseTab() {
  const clickedTab = document.getElementById('browse-tab');
  clickedTab.classList.add('active');
  const otherTab = document.getElementById('search-tab');
  otherTab.classList.remove('active');
  const searchContent = document.getElementById('search');
  document.getElementById('search').hidden = true;
  document.getElementById('browse').hidden = false;
}

const pageSize = 50;
const pageMax = Math.floor(browseDocuments.length/pageSize) + 1;
let page = 1;
let browseIndex = (page - 1) * pageSize;

function onPageNumChange(e) {
  page = e.target.value;
  browseIndex = (page - 1) * pageSize;
  renderBrowse();
}

document.getElementById('page-total').innerText = pageMax;
document.getElementById('page-num').addEventListener('input', onPageNumChange);
document.getElementById('page-num').value = +page;
document.getElementById('page-num').max = pageMax;
document.getElementById('page-num').min = 1;

function renderBrowse() {
  const output = browseDocuments.slice(browseIndex, browseIndex + pageSize).map(item => \`<p class="search_item"><div class="search_link"><a href="${accountInfo.userName}/status/\${item.id_str}">link</a></div> <div class="search_text">\${item.full_text}</div><div class="search_time">\${new Date(item.created_at).toLocaleString()}</div><hr class="search_divider" /></p>\`.replace(/\\.\\.\\/\\.\\.\\/tweets_media\\//g,'${accountInfo.userName}/tweets_media/'));
  document.getElementById('browse-output').innerHTML = output.join('');
  document.getElementById('browse-output').innerHTML += '<a href="#tabs">top &uarr;</a>';
}

renderBrowse();`;
  return outputAppJs;
}

function makeOutputIndexHtml(accountInfo) {
  const outputIndexHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>@${accountInfo.userName} Twitter archive</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <div class="wrapper">
    <div class="flex-wrap">
      <h1>Welcome to the @${accountInfo.userName} Twitter archive</h1>
      <p>This is a page where you can search many of my tweets, get a link to an archived version, and view all the content in nice, threaded form where applicable. This does not include replies to other people in this archive, so this is just "standalone" tweets and threads.</p>
      <div class="tweet">
        <p id="tabs">
          <button class="tab active" id="search-tab" onclick="searchTab()">Search</button><button class="tab" id="browse-tab" onclick="browseTab()">Browse</button>
        </p>
        <hr class="hr">
        <p id="loading">Loading search...</p>
        <div id="search" hidden>
          <input id="search-input" type="search" />
          <div id="sorting">Sort by: <button class="sort-button" onclick="sortResults('most-relevant')">most relevant</button> | <button class="sort-button" onclick="sortResults('oldest-first')">oldest first</button> | <button class="sort-button" onclick="sortResults('newest-first')">newest first</button> | <button class="sort-button" onclick="sortResults('most-popular')">most popular</button></div>
          <div id="output"></div>
        </div>
        <div id="browse" hidden>
          <div id="browse-sort">Sort by: <button class="sort-button-browse" onclick="sortResults('oldest-first-browse')">oldest first</button> | <button class="sort-button-browse" onclick="sortResults('newest-first-browse')">newest first</button> | <button class="sort-button" onclick="sortResults('most-popular-browse')">most popular</button></div>
          <p id="paging">Page <input id="page-num" type="number" /> of <span id="page-total">...</span> </p>
          <div id="browse-output"></div>
        </div>
      </div>
      <p>This site was made with <a href="https://tinysubversions.com/twitter-archive/make-your-own/">this Twitter archiving tool</a>.</p>
    </div>
  </div>
</body>
<script src="searchDocuments.js"></script>
<script src="https://cdn.jsdelivr.net/gh/nextapps-de/flexsearch@0.7.31/dist/flexsearch.bundle.js"></script>
<script src="app.js"></script>
</html>`;
  return outputIndexHtml;
}
