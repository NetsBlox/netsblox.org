'use strict';
const path      = require('path'),
    express       = require('express'),
    serveStatic = require('serve-static'),
    bodyParser    = require('body-parser'),
    axios         = require('axios'),
    http          = require('http'),
    memoize       = require('memoizee'),
    cookieParser  = require('cookie-parser'),
    logger        = require('morgan'),
    log           = require('loglevel');

const PORT = process.env.PORT || 8000;
const NODE_ENV = process.env.NODE_ENV || 'dev';
const EDITOR_ADDRESS = process.env.EDITOR_ADDRESS || 'https://editor.netsblox.org';
const SERVER_ADDRESS = process.env.SERVER_ADDRESS || 'https://netsblox.org';
const CLOUD_ADDRESS = process.env.CLOUD_ADDRESS || 'https://cloud.netsblox.org';
/**********************************************************************************************************/

// Setup our Express pipeline
let app = express();
// parse cookies
app.use(cookieParser());
// Setup pipeline logging
if (NODE_ENV !== 'test') app.use(logger('dev'));

if (NODE_ENV === 'dev') log.enableAll();

// Setup pipeline support for static pages
// app.use(express.static(path.join(__dirname, '../../public')));
app.use(serveStatic(path.join(__dirname, '../../public'), {
    maxAge: '1h',
    setHeaders: setCacheControl,
}));

function setCacheControl(res, path) {
    res.setHeader('Cache-Control', 'public, max-age=3600');
}


// Setup pipeline support for server-side templates
app.engine('pug', require('pug').__express);
app.set('views', path.join(__dirname, 'views'));
app.locals.pretty = true;
app.locals.env = process.env;

// Finish pipeline setup
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

/**********************************************************************************************************/


const https = require('https');
const agent = new https.Agent({rejectUnauthorized: false});
let getPublicProjects = memoize(() => {
    log.debug('Calling server for public projects');
    return axios({
        httpsAgent: agent,
        method: 'GET',
        url: CLOUD_ADDRESS +'/projects/public/'
    });
}, {promise: true, maxAge: 86400 });

let getExamples = memoize(async (skipNames) => {
    log.debug('Calling server for example projects');
    const response = await axios({
        httpsAgent: agent,
        method: 'GET',
        url: EDITOR_ADDRESS +'/Examples/EXAMPLES'
    });
    const names = response.data.split('\n')
        .map(line => line.split('\t').pop())
        .filter(name => !skipNames.includes(name));

    const examples = await Promise.all(names
      .map(async name => {
        const url = EDITOR_ADDRESS + '/Examples/' + name + '.xml';
        const response = await axios({
            httpsAgent: agent,
            url,
            method: 'get'
        });
        const src = response.data;
        return {
            name,
            notes: extractNotes(src),
            services: extractServices(src),
            roleNames: extractRoleNames(src),
            thumbnail: `${CLOUD_ADDRESS}/projects/thumbnail?url=${encodeURIComponent(url)}&aspectRatio=1.33333`
        };
      })
    );
    return examples;
}, {promise: true, maxAge: 86400 });

app.get('/', async (_req, res) => {

    // set caching headers
    res.set({
        'Cache-Control': 'private, max-age=3600',
    });

    // get the examples and public projects data
    try {
        let examples = await getExamples(['Weather','Star Map','Battleship','Earthquakes']);
        let projectsData = await getPublicProjects();

        log.debug('Data received from server',projectsData.data.length);

      const projects = projectsData.data.map(project => ({
        owner: project.owner,
        name: project.name,
        // TODO: add the description
        thumbnail: `${CLOUD_ADDRESS}/projects/id/${project.id}/thumbnail`,
        roleNames: Object.values(project.roles).map(r => r.name),
      }));

        res.render('index.pug', {examples, projects });
    } catch (err) {
        log.debug('Failed to get projects data from netsblox server.',err);
        res.status(500).send();
    }
});

function renderView(res, path) {
    res.set({
        'Cache-Control': 'public, max-age=3600',
    });
    return res.render(path, {});
}

function extractServices(projectXml){
    let services = [];
    let foundRpcs = projectXml.match(/getJSFromRPCStruct"><l>([a-zA-Z\-_0-9]+)<\/l>/g);
    if (foundRpcs) {
        foundRpcs.forEach(txt=>{
            let match = txt.match(/getJSFromRPCStruct"><l>([a-zA-Z\-_0-9]+)<\/l>/);
            services.push(match[1]);
        });
    }
    return services;
};

function extractNotes(projectXml){
    const notes = projectXml.split('<notes>')[1].split('</notes>').shift();
    return notes;
};

function extractRoleNames(projectXml) {
    let start = projectXml.indexOf('<role name="');
    const names = [];
    while (start > -1) {
      const end = projectXml.indexOf('">', start);
      const name = projectXml.substring(start, end);
      names.push(name);
      projectXml = projectXml.substring(end);
      start = projectXml.indexOf('<role name="');
    }
    return names;
}

app.get('/tutorials*', (req,res) => renderView(res, 'tutorials.pug'));
app.get('/help', (req,res) => renderView(res, 'help.pug'));
app.get('/howtos', (req,res) => renderView(res, 'howtos.pug'));
app.get('/quickstart', (req,res) => renderView(res, 'quickstart.pug'));
app.get('/mobile', (req,res) => renderView(res, 'mobile.pug'));
app.get('/eclipse', (req,res) => renderView(res, 'eclipse.pug'));
app.get('/eclipse/help', (req, res) => renderView(res, 'eclipse-help.pug'));
app.get('/csta18', (req,res) => renderView(res, 'csta18.pug'));
app.get('/cybersecurity', (req,res) => renderView(res, 'roboscape.pug'));
app.get('/roboscape', (req,res) => res.redirect('/cybersecurity'));
app.get('/phoneiot', (req,res) => renderView(res, 'phoneiot.pug'));
app.get('/pyblox', (req,res) => renderView(res, 'pyblox.pug'));

// 2019 camp files
app.get('/camp2019/netsblox', (req,res) => renderView(res, 'camp2019/netsblox.pug'));
app.get('/camp2019/roboscape', (req,res) => renderView(res, 'camp2019/roboscape.pug'));
app.get('/camp2019/simple-attacks', (req,res) => renderView(res, 'camp2019/simple-attacks.pug'));
app.get('/camp2019/denial-of-service', (req,res) => renderView(res, 'camp2019/denial-of-service.pug'));
app.get('/camp2019/plain-text', (req,res) => renderView(res, 'camp2019/plain-text.pug'));
app.get('/camp2019/brute-force', (req,res) => renderView(res, 'camp2019/brute-force.pug'));
app.get('/camp2019/insecure-key-exchange', (req,res) => renderView(res, 'camp2019/insecure-key-exchange.pug'));
app.get('/camp2019/replay-attack', (req,res) => renderView(res, 'camp2019/replay-attack.pug'));

app.get('/privacy.html', (req, res) => res.redirect(EDITOR_ADDRESS + '/privacy.html'));
app.get('/emailus', (req, res) => res.redirect('mailto:akos.ledeczi@vanderbilt.edu'));

app.get('*', (req,res)=>{
    res.status(404).send('Page not found. Go back to <a href="/">Home Page</a>. If you believe there is a mistake, please let us know at <a href="https://facebook.com/netsblox"> our facebook page</a>.');
});

/**********************************************************************************************************/

// Run the server itself


http.Server(app).listen(PORT, () => {
    log.info('listening on unsecure port: ' + PORT);
});
