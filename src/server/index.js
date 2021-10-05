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
const SERVER_ADDRESS = process.env.EDITOR_ADDRESS;
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
        url: SERVER_ADDRESS + '/api/Projects/PROJECTS',
    });
}, { promise: true, maxAge: 86400 });

let getExamples = memoize(() => {
    log.debug('Calling server for example projects');
    return axios({
        httpsAgent: agent,
        method: 'GET',
        url: SERVER_ADDRESS + '/api/Examples/EXAMPLES?metadata=true',
    });
}, { promise: true, maxAge: 86400 });

app.get('/', async (req, res) => {
    res.set({ // set caching headers
        'Cache-Control': 'private, max-age=3600',
    });

    const [examples, projects] = await Promise.all([
        (async () => {
            try {
                const ex = await getExamples();
                // this is cached by default by express if node env is set to production
                return ex.data.filter(eg => !['Weather', 'Star Map', 'Battleship', 'Earthquakes'].includes(eg.projectName));
            } catch (e) {
                log.debug('Failed to get example projects from netsblox server', e);
                return [];
            }
        })(),
        (async () => {
            try {
                const proj = await getPublicProjects();
                return proj.data;
            } catch (e) {
                log.debug('Failed to get public projects from netsblox server', e);
                return [];
            }
        })(),
    ]);

    log.debug(`Data received from server: ${examples.length} examples and ${projects.length} public projects`);
    res.render('index.pug', { examples, projects });
});

function renderView(res, path) {
    res.set({
        'Cache-Control': 'public, max-age=3600',
    });
    return res.render(path, {});
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

// 2019 camp files
app.get('/camp2019/netsblox', (req,res) => renderView(res, 'camp2019/netsblox.pug'));
app.get('/camp2019/roboscape', (req,res) => renderView(res, 'camp2019/roboscape.pug'));
app.get('/camp2019/simple-attacks', (req,res) => renderView(res, 'camp2019/simple-attacks.pug'));
app.get('/camp2019/denial-of-service', (req,res) => renderView(res, 'camp2019/denial-of-service.pug'));
app.get('/camp2019/plain-text', (req,res) => renderView(res, 'camp2019/plain-text.pug'));
app.get('/camp2019/brute-force', (req,res) => renderView(res, 'camp2019/brute-force.pug'));
app.get('/camp2019/insecure-key-exchange', (req,res) => renderView(res, 'camp2019/insecure-key-exchange.pug'));
app.get('/camp2019/replay-attack', (req,res) => renderView(res, 'camp2019/replay-attack.pug'));

app.get('/privacy.html', (req, res) => res.redirect(SERVER_ADDRESS + '/privacy.html'));
app.get('/emailus', (req, res) => res.redirect('mailto:akos.ledeczi@vanderbilt.edu'));

app.get('*', (req,res)=>{
    res.status(404).send('Page not found. Go back to <a href="/">Home Page</a>. If you believe there is a mistake, please let us know at <a href="https://facebook.com/netsblox"> our facebook page</a>.');
});

/**********************************************************************************************************/

// Run the server itself


http.Server(app).listen(PORT, () => {
    log.info('listening on unsecure port: ' + PORT);
});
