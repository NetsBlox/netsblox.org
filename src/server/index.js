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


let getPublicProjects = memoize(() => {
    log.debug('Calling server for public projects');
    return axios({
        method: 'GET',
        url: SERVER_ADDRESS +'/api/Projects/PROJECTS'
    });
},{promise: true, maxAge: 86400  });

let getExamples = memoize(() => {
    log.debug('Calling server for example projects');
    return axios({
        url: SERVER_ADDRESS + '/api/Examples/EXAMPLES?metadata=true',
        method: 'get'
    });
}, {promise: true, maxAge: 86400 });

app.get('/', (req, res) => {

    // set caching headers
    res.set({
        'Cache-Control': 'private, max-age=3600',
    });

    // get the examples and public projects data
    // get examples data
    let examplesPromise = getExamples();
    // get projects data
    let publicProjectsPromise = getPublicProjects();
    // end of calls to get the data

    axios.all([examplesPromise,publicProjectsPromise]).then(axios.spread((examples,projects)=>{
        log.debug('Data received from server',projects.data.length);
        // this is cached by default by express if node env is set to production
        examples.data = examples.data.filter(eg => !['Weather','Star Map','Battleship','Earthquakes'].includes(eg.projectName));
        res.render('index.pug', {examples: examples.data, projects: projects.data });
    })).catch((err)=>{
    //handle errors
        log.debug('Failed to get projects data from netsblox server.',err);
        res.status(500).send();
    });

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
